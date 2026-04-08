import Match from '@/models/Match';
import Player from '@/models/Player';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

interface PlayerStats {
  playerId: string;
  playerName: string;
  battingInnings: number;
  totalRuns: number;
  totalBalls: number;
  highestScore: number;
  battingAverage: number;
  strikeRate: number;
  fours: number;
  sixes: number;
  notOuts: number;
  ducks: number;
  thirtyPlus: number;
  bowlingInnings: number;
  totalWickets: number;
  totalRunsConceded: number;
  totalBallsBowled: number;
  bestFigures: { wickets: number; runs: number };
  bowlingAverage: number;
  bowlingStrikeRate: number;
  economy: number;
  dotBalls: number;
  dotBallPct: number;
  threeWicketHauls: number;
  fourWicketHauls: number;
  motmCount: number;
  matchesWon: number;
  matchesPlayed: number;
  winPercentage: number;
  matchWinningKnocks: number;
  crucialWickets: number;
  battingConsistencyCV: number;
  bowlingConsistencyCV: number;
  recentBattingAvg: number;
  recentWickets: number;
}

async function extractPlayerStats(): Promise<Map<string, PlayerStats>> {
  const players = await Player.find().lean();
  const matches = await Match.find({ status: 'completed' }).sort({ createdAt: 1 }).lean();

  const statsMap = new Map<string, PlayerStats>();
  players.forEach((p: any) => {
    statsMap.set(p._id.toString(), {
      playerId: p._id.toString(), playerName: p.name,
      battingInnings: 0, totalRuns: 0, totalBalls: 0, highestScore: 0,
      battingAverage: 0, strikeRate: 0, fours: 0, sixes: 0, notOuts: 0, ducks: 0, thirtyPlus: 0,
      bowlingInnings: 0, totalWickets: 0, totalRunsConceded: 0, totalBallsBowled: 0,
      bestFigures: { wickets: 0, runs: 999 }, bowlingAverage: 0, bowlingStrikeRate: 0,
      economy: 0, dotBalls: 0, dotBallPct: 0, threeWicketHauls: 0, fourWicketHauls: 0,
      motmCount: p.motmCount || 0, matchesWon: 0, matchesPlayed: 0, winPercentage: 0,
      matchWinningKnocks: 0, crucialWickets: 0,
      battingConsistencyCV: 1, bowlingConsistencyCV: 1,
      recentBattingAvg: 0, recentWickets: 0,
    });
  });

  const batHistory = new Map<string, number[]>();
  const bowlHistory = new Map<string, number[]>();
  const recentBat = new Map<string, number[]>();
  const recentBowl = new Map<string, number[]>();
  players.forEach((p: any) => {
    const pid = p._id.toString();
    batHistory.set(pid, []); bowlHistory.set(pid, []);
    recentBat.set(pid, []); recentBowl.set(pid, []);
  });

  for (const match of matches) {
    const teamAWon = match.winner === (match.teamA as any).name;
    const teamBWon = match.winner === (match.teamB as any).name;
    const allPids = new Set<string>([
      ...((match.teamA as any).players || []).map((p: any) => p.toString()),
      ...((match.teamB as any).players || []).map((p: any) => p.toString()),
    ]);

    allPids.forEach(pid => {
      const s = statsMap.get(pid); if (!s) return;
      s.matchesPlayed++;
      const isA = ((match.teamA as any).players || []).some((p: any) => p.toString() === pid);
      if ((isA && teamAWon) || (!isA && teamBWon)) s.matchesWon++;
    });

    for (const inn of ['first', 'second'] as const) {
      const inningsInfo = (match.innings as any)?.[inn]; if (!inningsInfo) continue;
      const inningWon = inningsInfo.battingTeam === match.winner;
      const bowlingTeamWon = inningsInfo.bowlingTeam === match.winner;
      const teamTotal: number = inningsInfo.runs || 0;

      const batPerf = new Map<string, { runs: number; balls: number; fours: number; sixes: number; out: boolean }>();
      const bowlPerf = new Map<string, { wickets: number; runs: number; balls: number; dots: number }>();

      for (const e of ((match as any).timeline || [])) {
        if (e.innings !== inn) continue;
        const bId = e.batsman?.toString();
        const wId = e.bowler?.toString();
        if (bId) {
          if (!batPerf.has(bId)) batPerf.set(bId, { runs: 0, balls: 0, fours: 0, sixes: 0, out: false });
          const b = batPerf.get(bId)!;
          if (e.eventType === 'run') { b.runs += e.runs; b.balls++; if (e.runs === 4) b.fours++; if (e.runs === 6) b.sixes++; }
          else if (e.eventType === 'dot') b.balls++;
          else if (e.eventType === 'wicket') { b.balls++; b.out = true; }
        }
        if (wId) {
          if (!bowlPerf.has(wId)) bowlPerf.set(wId, { wickets: 0, runs: 0, balls: 0, dots: 0 });
          const w = bowlPerf.get(wId)!;
          if (e.eventType === 'run') { w.runs += e.runs; w.balls++; }
          else if (e.eventType === 'dot') { w.balls++; w.dots++; }
          else if (e.eventType === 'wicket') { w.wickets++; w.balls++; }
        }
      }

      for (const [bId, p] of batPerf.entries()) {
        const s = statsMap.get(bId); if (!s || p.balls === 0) continue;
        s.battingInnings++; s.totalRuns += p.runs; s.totalBalls += p.balls;
        s.fours += p.fours; s.sixes += p.sixes;
        if (!p.out) s.notOuts++;
        if (p.out && p.runs === 0) s.ducks++;
        if (p.runs >= 30) s.thirtyPlus++;
        if (p.runs > s.highestScore) s.highestScore = p.runs;
        if (inningWon && teamTotal > 0 && p.runs >= teamTotal * 0.38) s.matchWinningKnocks++;
        batHistory.get(bId)!.push(p.runs);
        const rb = recentBat.get(bId)!; rb.push(p.runs); if (rb.length > 8) rb.shift();
      }

      for (const [wId, p] of bowlPerf.entries()) {
        const s = statsMap.get(wId); if (!s || p.balls === 0) continue;
        s.bowlingInnings++; s.totalWickets += p.wickets; s.totalRunsConceded += p.runs;
        s.totalBallsBowled += p.balls; s.dotBalls += p.dots;
        if (p.wickets >= 3) s.threeWicketHauls++;
        if (p.wickets >= 4) s.fourWicketHauls++;
        if (p.wickets > s.bestFigures.wickets || (p.wickets === s.bestFigures.wickets && p.runs < s.bestFigures.runs))
          s.bestFigures = { wickets: p.wickets, runs: p.runs };
        if (bowlingTeamWon && p.wickets >= 3) s.crucialWickets++;
        bowlHistory.get(wId)!.push(p.wickets);
        const rb = recentBowl.get(wId)!; rb.push(p.wickets); if (rb.length > 8) rb.shift();
      }
    }
  }

  // Derived stats
  for (const [pid, s] of statsMap.entries()) {
    const outs = s.battingInnings - s.notOuts;
    s.battingAverage = outs > 0 ? s.totalRuns / outs : (s.totalRuns > 0 ? s.totalRuns : 0);
    s.strikeRate = s.totalBalls > 0 ? (s.totalRuns / s.totalBalls) * 100 : 0;
    s.bowlingAverage = s.totalWickets > 0 ? s.totalRunsConceded / s.totalWickets : 999;
    s.bowlingStrikeRate = s.totalWickets > 0 ? s.totalBallsBowled / s.totalWickets : 999;
    s.economy = s.totalBallsBowled > 0 ? s.totalRunsConceded / (s.totalBallsBowled / 6) : 999;
    s.dotBallPct = s.totalBallsBowled > 0 ? (s.dotBalls / s.totalBallsBowled) * 100 : 0;
    s.winPercentage = s.matchesPlayed > 0 ? (s.matchesWon / s.matchesPlayed) * 100 : 0;

    const bArr = batHistory.get(pid)!;
    if (bArr.length >= 4) {
      const mean = bArr.reduce((a, b) => a + b, 0) / bArr.length;
      const sd = Math.sqrt(bArr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bArr.length);
      s.battingConsistencyCV = mean > 0 ? +(sd / mean).toFixed(2) : 1;
    }
    const wArr = bowlHistory.get(pid)!;
    if (wArr.length >= 4) {
      const mean = wArr.reduce((a, b) => a + b, 0) / wArr.length;
      const sd = Math.sqrt(wArr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wArr.length);
      s.bowlingConsistencyCV = mean > 0 ? +(sd / mean).toFixed(2) : 1;
    }

    const rb = recentBat.get(pid)!;
    if (rb.length > 0) s.recentBattingAvg = +(rb.reduce((a, b) => a + b, 0) / rb.length).toFixed(1);
    const rw = recentBowl.get(pid)!;
    if (rw.length > 0) s.recentWickets = rw.reduce((a, b) => a + b, 0);
  }

  return statsMap;
}

async function rankWithAI(players: PlayerStats[], type: 'batting' | 'bowling'): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (players.length === 0) return result;

  // Compute pool benchmarks to give AI context
  const poolAvgRuns = +(players.reduce((a, p) => a + p.totalRuns, 0) / players.length).toFixed(1);
  const poolAvgBatAvg = +(players.reduce((a, p) => a + p.battingAverage, 0) / players.length).toFixed(1);
  const poolAvgSR = +(players.reduce((a, p) => a + p.strikeRate, 0) / players.length).toFixed(1);
  const poolAvgWickets = +(players.reduce((a, p) => a + p.totalWickets, 0) / players.length).toFixed(1);
  const poolAvgEcon = +(players.filter(p => p.economy < 50).reduce((a, p) => a + p.economy, 0) / players.length).toFixed(2);
  const poolAvgBowlAvg = +(players.filter(p => p.bowlingAverage < 100).reduce((a, p) => a + p.bowlingAverage, 0) / players.length).toFixed(1);

  const data = players.map(s => type === 'batting' ? {
    name: s.playerName,
    innings: s.battingInnings,
    runs: s.totalRuns,
    average: +s.battingAverage.toFixed(1),
    strikeRate: +s.strikeRate.toFixed(1),
    highestScore: s.highestScore,
    thirtyPlus: s.thirtyPlus,
    ducks: s.ducks,
    matchWinningKnocks: s.matchWinningKnocks,
    consistencyCV: s.battingConsistencyCV,
    recentAvg_last8: s.recentBattingAvg,
    motm: s.motmCount,
    winPct: +s.winPercentage.toFixed(1),
  } : {
    name: s.playerName,
    innings: s.bowlingInnings,
    wickets: s.totalWickets,
    economy: +s.economy.toFixed(2),
    bowlingAverage: +s.bowlingAverage.toFixed(1),
    strikeRate: +s.bowlingStrikeRate.toFixed(1),
    bestFigures: `${s.bestFigures.wickets}/${s.bestFigures.runs}`,
    threeWicketHauls: s.threeWicketHauls,
    fourWicketHauls: s.fourWicketHauls,
    crucialWickets: s.crucialWickets,
    dotBallPct: +s.dotBallPct.toFixed(1),
    consistencyCV: s.bowlingConsistencyCV,
    recentWickets_last8: s.recentWickets,
    motm: s.motmCount,
    winPct: +s.winPercentage.toFixed(1),
  });

  const prompt = type === 'batting' ? `
You are ranking ${players.length} cricket batsmen in a short-format league (7-8 overs per innings, 4-6 players per team, typical team scores 20-60 runs).

POOL BENCHMARKS (average across all eligible players):
- Average runs: ${poolAvgRuns} | Average batting average: ${poolAvgBatAvg} | Average SR: ${poolAvgSR}

RATING SCALE (0-1000):
- 850-950: ELITE — 1-2 players max. Exceptional runs, average well above pool, multiple match-winning knocks, consistent, good recent form.
- 750-850: EXCELLENT — Top 3-4 players. Significantly above pool average in most metrics.
- 650-750: VERY GOOD — Top 6-8 players. Above pool average in key metrics.
- 550-650: GOOD — Solid contributors, around pool average.
- 400-550: AVERAGE — Below pool average, inconsistent.
- 250-400: DEVELOPING — Low innings, poor stats.

RANKING LOGIC — consider ALL of these, not just runs:
1. QUALITY over VOLUME: A player with avg ${(poolAvgBatAvg * 1.8).toFixed(0)} and SR ${(poolAvgSR * 1.3).toFixed(0)} in 15 innings beats one with avg ${(poolAvgBatAvg * 0.7).toFixed(0)} and SR ${(poolAvgSR * 0.8).toFixed(0)} in 30 innings even if the latter has more total runs.
2. CONSISTENCY (CV): Lower CV = more consistent. CV > 1.5 means very erratic. Penalise high CV.
3. MATCH-WINNING KNOCKS: Scored 38%+ of team total in a win. This is the most impactful batting stat.
4. DUCKS: Multiple ducks relative to innings is a red flag.
5. RECENT FORM: recentAvg_last8 shows current form. Weight this significantly.
6. MOTM: Peer-recognised impact.
7. SAMPLE SIZE: Players with <15 innings should be rated conservatively even if stats look good.
8. WIN%: Consistent winners contribute more.

Players data:
${JSON.stringify(data, null, 2)}

IMPORTANT: Spread ratings across the full scale. Do NOT cluster everyone in 600-700. Use the full range.
Return ONLY valid JSON array: [{"name": "PlayerName", "rating": 720}, ...]
` : `
You are ranking ${players.length} cricket bowlers in a short-format league (7-8 overs per innings, 4-6 players per team, typical team scores 20-60 runs).

POOL BENCHMARKS (average across all eligible players):
- Average wickets: ${poolAvgWickets} | Average economy: ${poolAvgEcon} | Average bowling average: ${poolAvgBowlAvg}

RATING SCALE (0-1000):
- 850-950: ELITE — 1-2 players max. Most wickets AND good economy AND multiple 3W hauls.
- 750-850: EXCELLENT — Top 3-4 players. High wickets with economy below pool average.
- 650-750: VERY GOOD — Top 6-8 players. Good wickets or exceptional economy.
- 550-650: GOOD — Solid, around pool average.
- 400-550: AVERAGE — Below pool average.
- 250-400: DEVELOPING — Low innings, few wickets.

RANKING LOGIC — consider ALL of these:
1. WICKETS are most important but NOT the only factor. A bowler with 70 wickets at economy 8.5 should NOT beat one with 55 wickets at economy 5.2 and 8 three-wicket hauls.
2. ECONOMY: Below ${poolAvgEcon} is good. Below ${(parseFloat(poolAvgEcon) * 0.8).toFixed(2)} is excellent. Above ${(parseFloat(poolAvgEcon) * 1.2).toFixed(2)} is poor.
3. BOWLING AVERAGE: Lower is better. Below ${(parseFloat(poolAvgBowlAvg) * 0.7).toFixed(1)} is elite.
4. 3-WICKET and 4-WICKET HAULS: Match-winning spells. Weight heavily.
5. CRUCIAL WICKETS: 3+ wickets in winning matches. Shows match-winning ability.
6. DOT BALL %: Higher = more pressure. Above 40% is excellent.
7. CONSISTENCY (CV): Lower CV = takes wickets regularly. High CV = one-match wonder.
8. RECENT FORM: recentWickets_last8 shows current form.
9. SAMPLE SIZE: <15 innings = penalise.

Players data:
${JSON.stringify(data, null, 2)}

IMPORTANT: Spread ratings across the full scale. Do NOT cluster everyone in 600-700. Use the full range.
Return ONLY valid JSON array: [{"name": "PlayerName", "rating": 720}, ...]
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.15,
      max_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content || '[]';
    const jsonStr = raw.replace(/```json\n?|\n?```/g, '').trim();
    const ranked: { name: string; rating: number }[] = JSON.parse(jsonStr);

    ranked.forEach(r => {
      const player = players.find(p => p.playerName === r.name);
      if (player && typeof r.rating === 'number') {
        result.set(player.playerId, Math.max(200, Math.min(950, Math.round(r.rating))));
      }
    });

    // Fallback for any player AI missed
    players.forEach(s => {
      if (!result.has(s.playerId)) {
        console.warn(`AI missed player ${s.playerName}, using fallback`);
        result.set(s.playerId, type === 'batting'
          ? Math.round(300 + Math.min(s.totalRuns / 3, 200) + Math.min(s.battingAverage * 5, 150))
          : Math.round(300 + Math.min(s.totalWickets * 4, 250) + Math.max(0, (8 - s.economy) * 20)));
      }
    });
  } catch (err) {
    console.error(`AI ranking failed for ${type}:`, err);
    // Full fallback
    players.forEach(s => {
      result.set(s.playerId, type === 'batting'
        ? Math.round(300 + Math.min(s.totalRuns / 3, 200) + Math.min(s.battingAverage * 5, 150) + s.matchWinningKnocks * 20)
        : Math.round(300 + Math.min(s.totalWickets * 4, 250) + Math.max(0, (8 - s.economy) * 20) + s.threeWicketHauls * 25));
    });
  }

  return result;
}

export async function calculateRankings() {
  console.log('🤖 Starting AI-Powered Ranking Calculation...');

  const statsMap = await extractPlayerStats();

  const eligibleBatsmen = Array.from(statsMap.values()).filter(s =>
    s.battingInnings >= 10 && s.totalRuns >= 50 && s.totalBalls >= 60
  );
  const eligibleBowlers = Array.from(statsMap.values()).filter(s =>
    s.bowlingInnings >= 10 && s.totalBallsBowled >= 60 && s.totalWickets >= 5
  );
  const eligibleAllRounders = Array.from(statsMap.values()).filter(s =>
    s.battingInnings >= 8 && s.bowlingInnings >= 8 && s.totalRuns >= 40 && s.totalWickets >= 4
  );

  console.log(`Eligible: ${eligibleBatsmen.length} bat, ${eligibleBowlers.length} bowl, ${eligibleAllRounders.length} AR`);

  const battingRankings = await rankWithAI(eligibleBatsmen, 'batting');
  const bowlingRankings = await rankWithAI(eligibleBowlers, 'bowling');

  // All-rounder = geometric mean of bat + bowl
  const allRounderRankings = new Map<string, number>();
  eligibleAllRounders.forEach(s => {
    const bat = battingRankings.get(s.playerId) || 0;
    const bowl = bowlingRankings.get(s.playerId) || 0;
    if (bat > 0 && bowl > 0) {
      allRounderRankings.set(s.playerId, Math.round(Math.sqrt(bat * bowl)));
    }
  });

  // Inactivity decay + save
  const allPlayers = await Player.find().lean();
  const now = new Date();

  for (const player of allPlayers) {
    const pid = player._id.toString();
    let newBat = battingRankings.get(pid) || 0;
    let newBowl = bowlingRankings.get(pid) || 0;
    let newAR = allRounderRankings.get(pid) || 0;

    const lastMatch = await Match.findOne({
      status: 'completed',
      $or: [{ 'teamA.players': player._id }, { 'teamB.players': player._id }]
    }).sort({ createdAt: -1 }).select('createdAt').lean();

    if (lastMatch) {
      const daysSince = (now.getTime() - (lastMatch as any).createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 2) {
        const decay = Math.pow(0.98, (daysSince - 2) / 2);
        if (newBat > 0) newBat = Math.max(100, Math.round(newBat * decay));
        if (newBowl > 0) newBowl = Math.max(100, Math.round(newBowl * decay));
        if (newAR > 0) newAR = Math.max(10, Math.round(newAR * decay));
      }
    }

    const prev = (player as any).rankings || {};
    await Player.findByIdAndUpdate(pid, {
      $set: {
        'rankings.batting': newBat,
        'rankings.bowling': newBowl,
        'rankings.allRounder': newAR,
        'rankings.previousBatting': prev.batting || 0,
        'rankings.previousBowling': prev.bowling || 0,
        'rankings.previousAllRounder': prev.allRounder || 0,
        'rankings.lastUpdated': now,
      }
    });
  }

  console.log('✅ AI ranking calculation complete.');
}
