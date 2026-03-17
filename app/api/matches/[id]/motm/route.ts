import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';

async function getCareerStats(playerId: string) {
  const matches = await Match.find({ status: { $in: ['completed', 'live'] } });
  let batRuns = 0, batBalls = 0, batOuts = 0, batInnings = 0;
  let bowlRuns = 0, bowlBalls = 0, bowlWickets = 0;
  for (const m of matches) {
    const inningsBatted = new Set<string>();
    for (const e of m.timeline) {
      const bId = e.batsman?._id?.toString() ?? e.batsman?.toString();
      const wId = e.bowler?._id?.toString() ?? e.bowler?.toString();
      if (bId === playerId) {
        inningsBatted.add(e.innings);
        if (e.eventType === 'run') { batRuns += e.runs; batBalls++; }
        else if (e.eventType === 'dot') batBalls++;
        else if (e.eventType === 'wicket') { batBalls++; batOuts++; }
      }
      if (wId === playerId) {
        if (e.eventType === 'run') { bowlRuns += e.runs; bowlBalls++; }
        else if (e.eventType === 'dot') bowlBalls++;
        else if (e.eventType === 'wicket') { bowlBalls++; bowlWickets++; }
      }
    }
    batInnings += inningsBatted.size;
  }
  return {
    batting: {
      innings: batInnings, runs: batRuns,
      avg: batOuts > 0 ? (batRuns / batOuts).toFixed(1) : batRuns.toString(),
      sr: batBalls > 0 ? ((batRuns / batBalls) * 100).toFixed(1) : '0.0',
    },
    bowling: {
      wickets: bowlWickets,
      econ: bowlBalls > 0 ? (bowlRuns / (bowlBalls / 6)).toFixed(2) : '0.00',
      avg: bowlWickets > 0 ? (bowlRuns / bowlWickets).toFixed(1) : '—',
    },
  };
}

async function getHeadToHead(batId: string, bowlId: string) {
  const matches = await Match.find({ status: { $in: ['completed', 'live'] } });
  let runs = 0, balls = 0, dismissals = 0;
  for (const m of matches) {
    for (const e of m.timeline) {
      const bId = e.batsman?._id?.toString() ?? e.batsman?.toString();
      const wId = e.bowler?._id?.toString() ?? e.bowler?.toString();
      if (bId === batId && wId === bowlId) {
        if (e.eventType === 'run') { runs += e.runs; balls++; }
        else if (e.eventType === 'dot') balls++;
        else if (e.eventType === 'wicket') { balls++; dismissals++; }
      }
    }
  }
  return { runs, balls, dismissals, sr: balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0' };
}

function buildInningsSection(
  label: string, innings: any, timeline: any[], inningsKey: string,
  playerCareerMap: Record<string, any>, playerNameMap: Record<string, string>,
  totalOvers: number, isChase: boolean, target?: number
): string {
  const events = timeline.filter((e: any) => e.innings === inningsKey);
  const rr = (innings.overs > 0 || innings.balls > 0)
    ? (innings.runs / (innings.overs + innings.balls / 6)).toFixed(2) : '0.00';
  let out = `\n${'='.repeat(60)}\n${label}${isChase ? ` (Chasing ${target})` : ''}\n${'='.repeat(60)}\n`;
  out += `Total: ${innings.runs}/${innings.wickets} in ${innings.overs}.${innings.balls} overs | RR: ${rr}\n`;

  // batting map
  const batters: Record<string, any> = {};
  const bvb: Record<string, Record<string, any>> = {};
  const runningScore: Record<string, number> = {};
  for (const e of events) {
    const bId = e.batsman?._id?.toString() ?? e.batsman?.toString();
    const wId = e.bowler?._id?.toString() ?? e.bowler?.toString();
    if (!bId) continue;
    if (!batters[bId]) batters[bId] = { runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, out: false };
    if (!bvb[bId]) bvb[bId] = {};
    if (wId && !bvb[bId][wId]) bvb[bId][wId] = { runs: 0, balls: 0, fours: 0, dots: 0, dismissed: false };
    if (!runningScore[bId]) runningScore[bId] = 0;
    if (e.eventType === 'run') {
      batters[bId].runs += e.runs; batters[bId].balls++; runningScore[bId] += e.runs;
      if (e.runs === 4) batters[bId].fours++;
      if (e.runs === 6) batters[bId].sixes++;
      if (wId) { bvb[bId][wId].runs += e.runs; bvb[bId][wId].balls++; if (e.runs === 4) bvb[bId][wId].fours++; }
    } else if (e.eventType === 'dot') {
      batters[bId].balls++; batters[bId].dots++;
      if (wId) { bvb[bId][wId].balls++; bvb[bId][wId].dots++; }
    } else if (e.eventType === 'wicket') {
      batters[bId].balls++; batters[bId].out = true;
      batters[bId].dismissedBy = wId ? playerNameMap[wId] : '?';
      batters[bId].dismissedOver = e.over; batters[bId].dismissedScore = runningScore[bId];
      if (wId) { bvb[bId][wId].balls++; bvb[bId][wId].dismissed = true; bvb[bId][wId].dismissedScore = runningScore[bId]; }
    }
  }

  out += `\n-- BATTING --\n`;
  for (const [bId, s] of Object.entries(batters)) {
    const name = playerNameMap[bId] || bId;
    const career = playerCareerMap[bId];
    const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(1) : '0.0';
    out += `\n${name}: ${s.runs}(${s.balls}) SR:${sr} 4s:${s.fours} 6s:${s.sixes} | ${s.out ? `OUT by ${s.dismissedBy} at score ${s.dismissedScore} in over ${s.dismissedOver}` : 'NOT OUT'}\n`;
    if (career) out += `  Career: ${career.batting.runs}runs/${career.batting.innings}inn Avg:${career.batting.avg} SR:${career.batting.sr}\n`;
    out += `  vs each bowler:\n`;
    for (const [wId, vs] of Object.entries(bvb[bId] || {})) {
      const wName = playerNameMap[wId] || wId;
      const wCareer = playerCareerMap[wId];
      const vsr = vs.balls > 0 ? ((vs.runs / vs.balls) * 100).toFixed(1) : '0.0';
      out += `    vs ${wName}: ${vs.runs}(${vs.balls}) SR:${vsr} 4s:${vs.fours} dots:${vs.dots} dismissed:${vs.dismissed ? `YES at ${vs.dismissedScore}` : 'no'}\n`;
      if (wCareer) out += `      [${wName} career: ${wCareer.bowling.wickets}W econ:${wCareer.bowling.econ}]\n`;
    }
  }

  // bowling map
  const bowlers: Record<string, any> = {};
  const wvb: Record<string, Record<string, any>> = {};
  const runScore2: Record<string, number> = {};
  for (const e of events) {
    const bId = e.batsman?._id?.toString() ?? e.batsman?.toString();
    const wId = e.bowler?._id?.toString() ?? e.bowler?.toString();
    if (!wId) continue;
    if (!bowlers[wId]) bowlers[wId] = { runs: 0, balls: 0, wickets: 0, dots: 0 };
    if (bId && !wvb[wId]) wvb[wId] = {};
    if (bId && !wvb[wId][bId]) wvb[wId][bId] = { runs: 0, balls: 0, fours: 0, dots: 0, dismissed: false };
    if (bId && !runScore2[bId]) runScore2[bId] = 0;
    if (e.eventType === 'run') {
      bowlers[wId].runs += e.runs; bowlers[wId].balls++;
      if (bId) { wvb[wId][bId].runs += e.runs; wvb[wId][bId].balls++; if (e.runs === 4) wvb[wId][bId].fours++; runScore2[bId] = (runScore2[bId] || 0) + e.runs; }
    } else if (e.eventType === 'dot') {
      bowlers[wId].balls++; bowlers[wId].dots++;
      if (bId) { wvb[wId][bId].balls++; wvb[wId][bId].dots++; }
    } else if (e.eventType === 'wicket') {
      bowlers[wId].balls++; bowlers[wId].wickets++;
      if (bId) { wvb[wId][bId].balls++; wvb[wId][bId].dismissed = true; wvb[wId][bId].dismissedScore = runScore2[bId] || 0; wvb[wId][bId].dismissedOver = e.over; }
    }
  }

  out += `\n-- BOWLING --\n`;
  for (const [wId, s] of Object.entries(bowlers)) {
    const name = playerNameMap[wId] || wId;
    const career = playerCareerMap[wId];
    const ov = `${Math.floor(s.balls / 6)}.${s.balls % 6}`;
    const econ = s.balls > 0 ? (s.runs / (s.balls / 6)).toFixed(2) : '0.00';
    out += `\n${name}: ${ov}ov ${s.runs}R ${s.wickets}W econ:${econ} dots:${s.dots}/${s.balls}\n`;
    if (career) out += `  Career: ${career.bowling.wickets}W econ:${career.bowling.econ} avg:${career.bowling.avg}\n`;
    out += `  vs each batsman:\n`;
    for (const [bId, vs] of Object.entries(wvb[wId] || {})) {
      const bName = playerNameMap[bId] || bId;
      const bCareer = playerCareerMap[bId];
      const vsr = vs.balls > 0 ? ((vs.runs / vs.balls) * 100).toFixed(1) : '0.0';
      out += `    vs ${bName}: ${vs.runs}(${vs.balls}) SR:${vsr} 4s:${vs.fours} dots:${vs.dots}${vs.dismissed ? ` DISMISSED at score ${vs.dismissedScore} over ${vs.dismissedOver}` : ''}\n`;
      if (bCareer) out += `      [${bName} career SR:${bCareer.batting.sr} avg:${bCareer.batting.avg}]\n`;
    }
  }

  if (isChase && target) {
    out += `\n-- CHASE PROGRESSION --\n`;
    const checkpoints = [Math.floor(totalOvers / 3), Math.floor((2 * totalOvers) / 3)].filter(c => c >= 1);
    for (const cp of checkpoints) {
      const evUp = events.filter((e: any) => ['run','dot','wicket'].includes(e.eventType) && e.over < cp);
      const rUp = evUp.filter((e: any) => e.eventType === 'run').reduce((s: number, e: any) => s + e.runs, 0);
      const wUp = evUp.filter((e: any) => e.eventType === 'wicket').length;
      const bLeft = (totalOvers - cp) * 6;
      const rr2 = bLeft > 0 ? ((target - rUp) / (bLeft / 6)).toFixed(2) : '—';
      out += `  After ${cp} overs: ${rUp}/${wUp} | Req RR: ${rr2}\n`;
    }
    const lastEv = events.filter((e: any) => ['run','dot','wicket'].includes(e.eventType) && e.over >= totalOvers - 2);
    const lR = lastEv.filter((e: any) => e.eventType === 'run').reduce((s: number, e: any) => s + e.runs, 0);
    const lW = lastEv.filter((e: any) => e.eventType === 'wicket').length;
    out += `  Final 2 overs: ${lR} runs, ${lW} wickets\n`;
  }
  return out;
}

async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const m = text.match(/\{[\s\S]*?\}/);
  if (!m) return null;
  return JSON.parse(m[0]);
}

async function callGroq(prompt: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_api_key_here') return null;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const m = text.match(/\{[\s\S]*?\}/);
  if (!m) return null;
  return JSON.parse(m[0]);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const match = await Match.findById(id).select('motm status');
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ motm: match.motm || null, status: match.status });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    const match = await Match.findById(id)
      .populate('teamA.players teamB.players')
      .populate('timeline.batsman timeline.bowler');

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status !== 'completed') return NextResponse.json({ error: 'Match not completed' }, { status: 400 });

    const allPlayers = [...match.teamA.players, ...match.teamB.players];
    const playerNameMap: Record<string, string> = {};
    for (const p of allPlayers as any[]) {
      playerNameMap[p._id.toString()] = p.nickname ? `${p.name} (${p.nickname})` : p.name;
    }

    const playerCareerMap: Record<string, any> = {};
    await Promise.all(allPlayers.map(async (p: any) => {
      playerCareerMap[p._id.toString()] = await getCareerStats(p._id.toString());
    }));

    // Head-to-head
    const batIds = [...new Set(match.timeline.map((e: any) => e.batsman?._id?.toString() ?? e.batsman?.toString()).filter(Boolean))] as string[];
    const bowlIds = [...new Set(match.timeline.map((e: any) => e.bowler?._id?.toString() ?? e.bowler?.toString()).filter(Boolean))] as string[];
    const h2hLines: string[] = [];
    for (const bId of batIds) {
      for (const wId of bowlIds) {
        const h2h = await getHeadToHead(bId, wId);
        if (h2h.balls >= 6) {
          const tmEvents = match.timeline.filter((e: any) => {
            const b = e.batsman?._id?.toString() ?? e.batsman?.toString();
            const w = e.bowler?._id?.toString() ?? e.bowler?.toString();
            return b === bId && w === wId;
          });
          const tmR = tmEvents.filter((e: any) => e.eventType === 'run').reduce((s: number, e: any) => s + e.runs, 0);
          const tmB = tmEvents.filter((e: any) => ['run','dot','wicket'].includes(e.eventType)).length;
          const tmD = tmEvents.some((e: any) => e.eventType === 'wicket');
          h2hLines.push(`  ${playerNameMap[bId]||bId} vs ${playerNameMap[wId]||wId}: Career ${h2h.runs}(${h2h.balls}) ${h2h.dismissals} dismissals SR:${h2h.sr} | This match: ${tmR}(${tmB}) dismissed:${tmD?'YES':'no'}`);
        }
      }
    }

    const firstInn = match.innings.first;
    const secondInn = match.innings.second;
    let margin = '';
    if (match.winner === 'Tie') margin = 'Match Tied';
    else {
      const secondBattingTeamName = match.innings.second.battingTeam;
      if (match.winner === secondBattingTeamName) {
        const secondBattingTeam = secondBattingTeamName === match.teamA.name ? match.teamA : match.teamB;
        const w = secondBattingTeam.players.length - secondInn.wickets;
        margin = `${match.winner} won by ${w} wicket${w !== 1 ? 's' : ''}`;
      } else {
        const r = firstInn.runs - secondInn.runs;
        margin = `${match.winner} won by ${r} run${r !== 1 ? 's' : ''}`;
      }
    }

    const date = new Date(match.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    let prompt = `You are an expert cricket analyst. Analyze this completed match and select the Man of the Match.\n\n`;
    prompt += `MATCH: ${match.teamA.name} vs ${match.teamB.name} | ${match.overs} overs | ${date}\n`;
    if (match.tossWinner) prompt += `Toss: ${match.tossWinner} chose to ${match.tossDecision}\n`;
    prompt += `Result: ${margin}\n`;
    prompt += buildInningsSection(`1ST INNINGS: ${match.teamA.name} batting`, firstInn, match.timeline, 'first', playerCareerMap, playerNameMap, match.overs, false);
    prompt += buildInningsSection(`2ND INNINGS: ${match.teamB.name} batting`, secondInn, match.timeline, 'second', playerCareerMap, playerNameMap, match.overs, true, firstInn.runs + 1);

    // Include super over data if it happened
    if (match.superOver?.completed) {
      const so = match.superOver;
      const soFirst = so.innings.first;
      const soSecond = so.innings.second;
      prompt += `\n${'='.repeat(60)}\nSUPER OVER (1 over per side)\n${'='.repeat(60)}\n`;
      prompt += `${match.teamA.name}: ${soFirst.runs}/${soFirst.wickets}\n`;
      prompt += `${match.teamB.name}: ${soSecond.runs}/${soSecond.wickets}\n`;
      prompt += `Super Over Winner: ${so.winner}\n`;
      const soEvents = match.timeline.filter((e: any) => e.innings === 'so_first' || e.innings === 'so_second');
      if (soEvents.length > 0) {
        prompt += `Super Over performances are HIGHLY weighted — a match-winning super over contribution should strongly favour MOTM selection.\n`;
        for (const e of soEvents) {
          const bName = playerNameMap[e.batsman?._id?.toString() ?? e.batsman?.toString()] || '?';
          const wName = playerNameMap[e.bowler?._id?.toString() ?? e.bowler?.toString()] || '?';
          prompt += `  ${e.innings === 'so_first' ? match.teamA.name : match.teamB.name} | ${bName} vs ${wName}: ${e.eventType}${e.runs ? ' ' + e.runs : ''}\n`;
        }
      }
    }

    if (h2hLines.length > 0) {
      prompt += `\nHISTORICAL HEAD-TO-HEAD (career across all matches):\n${h2hLines.join('\n')}\n`;
    }
    prompt += `\nSELECT ONE Man of the Match.\n`;
    prompt += `\nCRITICAL RULE — WINNING TEAM BIAS: Always strongly favour players from the WINNING team (${match.winner}). Unless a losing team player had a truly exceptional, match-defining performance that clearly stands above every single winning team player (e.g. a century in a losing cause, or 4+ wickets that nearly won the match single-handedly), you MUST select from the winning team. Ordinary good performances (a quick 30, 2 wickets) from the losing side do NOT override winning team contributions. When in doubt, pick the winner's side.\n`;
    prompt += `\nConsider: match-winning contribution, pressure performance, quality of opposition, strike rate/economy in context, crucial wickets, consistency, all-round impact. If a super over occurred, weight super over performance heavily.\n`;
    prompt += `\nRespond ONLY in this exact JSON (no markdown, no extra text):\n{"motm":"Player Full Name","team":"Team Name","reason":"3-4 sentences with specific stats, pressure context, match-changing moment, why over others"}\n`;

    let result: any = null;
    let provider: 'gemini' | 'groq' = 'gemini';
    try { result = await callGemini(prompt); } catch (_) {}
    if (!result) { try { result = await callGroq(prompt); provider = 'groq'; } catch (_) {} }
    if (!result) return NextResponse.json({ error: 'AI unavailable' }, { status: 503 });

    const motmPlayer = allPlayers.find((p: any) =>
      p.name.toLowerCase() === result.motm.toLowerCase() ||
      result.motm.toLowerCase().includes(p.name.toLowerCase())
    );

    const motmData = {
      playerId: motmPlayer?._id ?? null,
      playerName: result.motm,
      team: result.team,
      reason: result.reason,
      provider,
    };

    // If re-finding, decrement old MOTM player's count
    const existingMatch = await Match.findById(id).select('motm');
    if (existingMatch?.motm?.playerId) {
      await Player.findByIdAndUpdate(existingMatch.motm.playerId, { $inc: { motmCount: -1 } });
    }

    // Increment new MOTM player's count
    if (motmPlayer?._id) {
      await Player.findByIdAndUpdate(motmPlayer._id, { $inc: { motmCount: 1 } });
    }

    const updated = await Match.findByIdAndUpdate(
      id,
      { $set: { motm: motmData } },
      { new: true }
    ).select('motm');

    if (!updated) {
      console.error('MOTM save failed: match not found after update');
      return NextResponse.json({ error: 'Failed to save MOTM' }, { status: 500 });
    }

    console.log('MOTM saved:', updated.motm);
    return NextResponse.json({ motm: updated.motm });
  } catch (error: any) {
    console.error('MOTM error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
