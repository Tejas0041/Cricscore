import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';
import Match from '@/models/Match';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const player = await Player.findById(id);
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const pid = player._id.toString();

    // All matches where this player participated
    const matches = await Match.find({
      status: { $in: ['completed', 'live'] },
      $or: [{ 'teamA.players': player._id }, { 'teamB.players': player._id }],
    }).populate('teamA.players teamB.players');

    // ── Batting aggregates ──────────────────────────────────────────────
    let totalRuns = 0, totalBalls = 0, totalFours = 0, totalSixes = 0;
    let totalOuts = 0, highestScore = 0, highestBalls = 0;
    const inningsSet = new Set<string>();

    // matchup maps
    const outsByBowler: Record<string, { name: string; count: number }> = {};
    const runsByBowler: Record<string, { name: string; runs: number; balls: number }> = {};

    // ── Bowling aggregates ──────────────────────────────────────────────
    let bowlRuns = 0, bowlBalls = 0, bowlWickets = 0;
    let bestFigWickets = 0, bestFigRuns = 0;

    // per-match batting for best match
    const matchBatting: Array<{ matchId: string; runs: number; balls: number; vs: string; date: Date }> = [];
    const matchBowling: Array<{ matchId: string; wickets: number; runs: number; vs: string; date: Date }> = [];

    for (const match of matches) {
      const matchId = match._id.toString();
      const isTeamA = (match.teamA.players as any[]).some((p: any) => p._id?.toString() === pid || p.toString() === pid);
      const opponentName = isTeamA ? match.teamB.name : match.teamA.name;

      // Build bowler id→name map from both teams
      const bowlerNameMap: Record<string, string> = {};
      for (const p of [...(match.teamA.players as any[]), ...(match.teamB.players as any[])]) {
        const pId = p._id?.toString() ?? p.toString();
        const pName = p.name ?? '?';
        bowlerNameMap[pId] = pName;
      }

      // Per-innings batting
      for (const inn of ['first', 'second'] as const) {
        const events = match.timeline.filter((e: any) => e.innings === inn);
        const batEvents = events.filter((e: any) => e.batsman?.toString() === pid);
        if (batEvents.length === 0) continue;

        inningsSet.add(`${matchId}-${inn}`);
        let iRuns = 0, iBalls = 0, iFours = 0;

        for (const e of batEvents) {
          if (e.eventType === 'run') { iRuns += e.runs; iBalls++; if (e.runs === 4) iFours++; if (e.runs === 6) totalSixes++; }
          else if (e.eventType === 'dot') iBalls++;
          else if (e.eventType === 'wicket') { iBalls++; totalOuts++; }
        }

        totalRuns += iRuns;
        totalBalls += iBalls;
        totalFours += iFours;

        if (iRuns > highestScore) { highestScore = iRuns; highestBalls = iBalls; }

        // matchup: outs vs bowler, runs vs bowler
        for (const e of batEvents) {
          const bowId = e.bowler?.toString();
          if (!bowId) continue;
          const bowName = bowlerNameMap[bowId] ?? '?';
          if (e.eventType === 'wicket') {
            if (!outsByBowler[bowId]) outsByBowler[bowId] = { name: bowName, count: 0 };
            outsByBowler[bowId].count++;
          }
          if (e.eventType === 'run' || e.eventType === 'dot') {
            if (!runsByBowler[bowId]) runsByBowler[bowId] = { name: bowName, runs: 0, balls: 0 };
            runsByBowler[bowId].balls++;
            if (e.eventType === 'run') runsByBowler[bowId].runs += e.runs;
          }
        }
      }

      // Batting best match
      const allBatEvents = match.timeline.filter((e: any) => e.batsman?.toString() === pid);
      const mRuns = allBatEvents.filter((e: any) => e.eventType === 'run').reduce((s: number, e: any) => s + e.runs, 0);
      const mBalls = allBatEvents.filter((e: any) => ['run','dot','wicket'].includes(e.eventType)).length;
      if (mRuns > 0) matchBatting.push({ matchId, runs: mRuns, balls: mBalls, vs: opponentName, date: match.createdAt });

      // Bowling per innings
      for (const inn of ['first', 'second'] as const) {
        const bowEvents = match.timeline.filter((e: any) => e.innings === inn && e.bowler?.toString() === pid);
        if (bowEvents.length === 0) continue;
        let iW = 0, iR = 0, iB = 0;
        for (const e of bowEvents) {
          if (e.eventType === 'wicket') { iW++; iB++; }
          else if (e.eventType === 'run') { iR += e.runs; iB++; }
          else if (e.eventType === 'dot') iB++;
        }
        bowlRuns += iR; bowlBalls += iB; bowlWickets += iW;
        if (iW > bestFigWickets || (iW === bestFigWickets && iR < bestFigRuns)) {
          bestFigWickets = iW; bestFigRuns = iR;
        }
      }

      // Bowling best match
      const allBowlEvents = match.timeline.filter((e: any) => e.bowler?.toString() === pid);
      const mW = allBowlEvents.filter((e: any) => e.eventType === 'wicket').length;
      const mBR = allBowlEvents.filter((e: any) => e.eventType === 'run').reduce((s: number, e: any) => s + e.runs, 0);
      if (mW > 0 || mBR > 0) matchBowling.push({ matchId, wickets: mW, runs: mBR, vs: opponentName, date: match.createdAt });
    }

    const innings = inningsSet.size;
    const avg = totalOuts > 0 ? totalRuns / totalOuts : totalRuns;
    const sr = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
    const highestSR = highestBalls > 0 ? (highestScore / highestBalls) * 100 : 0;
    const economy = bowlBalls > 0 ? bowlRuns / (bowlBalls / 6) : 0;
    const bowlAvg = bowlWickets > 0 ? bowlRuns / bowlWickets : 0;

    // Best match by runs
    matchBatting.sort((a, b) => b.runs - a.runs);
    const bestMatchRuns = matchBatting[0] ?? null;

    // Best match by wickets
    matchBowling.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
    const bestMatchWickets = matchBowling[0] ?? null;

    // Most outs vs bowler
    const mostOutsVs = Object.values(outsByBowler).sort((a, b) => b.count - a.count)[0] ?? null;

    // Most runs vs bowler
    const mostRunsVs = Object.values(runsByBowler).sort((a, b) => b.runs - a.runs)[0] ?? null;

    // Best SR vs bowler (min 6 balls)
    const bestSRVs = Object.values(runsByBowler)
      .filter(x => x.balls >= 6)
      .map(x => ({ name: x.name, sr: (x.runs / x.balls) * 100, runs: x.runs, balls: x.balls }))
      .sort((a, b) => b.sr - a.sr)[0] ?? null;

    // MOTM count
    const motmMatches = await Match.find({ status: 'completed', 'motm.playerId': player._id }).select('motm createdAt teamA teamB');
    const motmCount = motmMatches.length;
    const motmHistory = motmMatches.map((m: any) => ({
      matchId: m._id.toString(),
      vs: m.motm.team === m.teamA.name ? m.teamB.name : m.teamA.name,
      date: m.createdAt,
      reason: m.motm.reason,
      provider: m.motm.provider,
    }));

    return NextResponse.json({
      player: { _id: pid, name: player.name, nickname: player.nickname, role: player.role },
      batting: {
        matches: matches.length,
        innings,
        runs: totalRuns,
        balls: totalBalls,
        fours: totalFours,
        sixes: totalSixes,
        outs: totalOuts,
        average: avg,
        strikeRate: sr,
        highestScore,
        highestBalls,
        highestSR,
      },
      bowling: {
        wickets: bowlWickets,
        runs: bowlRuns,
        balls: bowlBalls,
        economy,
        average: bowlAvg,
        bestFigures: { wickets: bestFigWickets, runs: bestFigRuns },
      },
      bestMatchRuns,
      bestMatchWickets,
      matchups: { mostOutsVs, mostRunsVs, bestSRVs },
      motm: { count: motmCount, history: motmHistory },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
