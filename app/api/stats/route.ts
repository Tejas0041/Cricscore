import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';
import Match from '@/models/Match';

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // ISO date string YYYY-MM-DD or 'today'/'yesterday'

    let dateFilter: { $gte: Date; $lt: Date } | undefined;
    if (dateParam) {
      let d: Date;
      const now = new Date();
      if (dateParam === 'today') {
        d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateParam === 'yesterday') {
        d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      } else {
        d = new Date(dateParam + 'T00:00:00');
      }
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      dateFilter = { $gte: d, $lt: next };
    }

    const matchQuery: any = { status: { $in: ['completed', 'live'] } };
    if (dateFilter) matchQuery.createdAt = dateFilter;

    // Compute all batting/bowling stats live from completed + live match timelines
    const matches = await Match.find(matchQuery)
      .populate('teamA.players teamB.players');

    // Map: playerId -> batting stats
    const battingMap: Record<string, { runs: number; balls: number; innings: Set<string>; outs: number; highestScore: number; highestBalls: number; highestFours: number; fours: number }> = {};
    const bowlingMap: Record<string, { runs: number; balls: number; wickets: number }> = {};
    // Best figures per player: { wickets, runs } — best = most wickets, then fewest runs
    const bestFiguresMap: Record<string, { wickets: number; runs: number }> = {};

    for (const match of matches) {
      const matchId = match._id.toString();

      // Track per-innings batting for highest score
      const inningsStats: Record<string, Record<string, { runs: number; balls: number; fours: number; out: boolean }>> = {
        first: {}, second: {}
      };

      for (const event of match.timeline) {
        const inn = event.innings as string;
        const bId = event.batsman?.toString();
        const bowId = event.bowler?.toString();

        if (bId) {
          if (!battingMap[bId]) battingMap[bId] = { runs: 0, balls: 0, innings: new Set(), outs: 0, highestScore: 0, highestBalls: 0, highestFours: 0, fours: 0 };
          if (!inningsStats[inn]) inningsStats[inn] = {};
          if (!inningsStats[inn][bId]) inningsStats[inn][bId] = { runs: 0, balls: 0, fours: 0, out: false };

          if (event.eventType === 'run') {
            battingMap[bId].runs += event.runs;
            battingMap[bId].balls++;
            inningsStats[inn][bId].runs += event.runs;
            inningsStats[inn][bId].balls++;
            if (event.runs === 4) { battingMap[bId].fours++; inningsStats[inn][bId].fours++; }
          } else if (event.eventType === 'dot') {
            battingMap[bId].balls++;
            inningsStats[inn][bId].balls++;
          } else if (event.eventType === 'wicket') {
            battingMap[bId].balls++;
            battingMap[bId].outs++;
            inningsStats[inn][bId].balls++;
            inningsStats[inn][bId].out = true;
          }
          battingMap[bId].innings.add(`${matchId}-${inn}`);
        }

        if (bowId) {
          if (!bowlingMap[bowId]) bowlingMap[bowId] = { runs: 0, balls: 0, wickets: 0 };
          if (event.eventType === 'run') {
            bowlingMap[bowId].runs += event.runs;
            bowlingMap[bowId].balls++;
          } else if (event.eventType === 'dot') {
            bowlingMap[bowId].balls++;
          } else if (event.eventType === 'wicket') {
            bowlingMap[bowId].wickets++;
            bowlingMap[bowId].balls++;
          }
        }
      }

      // Update highest score per batsman from this match's innings
      for (const inn of ['first', 'second']) {
        for (const [bId, s] of Object.entries(inningsStats[inn] || {})) {
          if (!battingMap[bId]) continue;
          if (s.runs > battingMap[bId].highestScore) {
            battingMap[bId].highestScore = s.runs;
            battingMap[bId].highestBalls = s.balls;
            battingMap[bId].highestFours = s.fours;
          }
        }
      }

      // Best bowling figures per bowler per innings in this match
      for (const inn of ['first', 'second']) {
        const inningsBowling: Record<string, { wickets: number; runs: number }> = {};
        for (const event of match.timeline.filter((e: any) => e.innings === inn)) {
          const bowId = event.bowler?.toString();
          if (!bowId) continue;
          if (!inningsBowling[bowId]) inningsBowling[bowId] = { wickets: 0, runs: 0 };
          if (event.eventType === 'wicket') inningsBowling[bowId].wickets++;
          if (event.eventType === 'run') inningsBowling[bowId].runs += event.runs;
        }
        for (const [bowId, fig] of Object.entries(inningsBowling)) {
          if (!bestFiguresMap[bowId]) { bestFiguresMap[bowId] = fig; continue; }
          const cur = bestFiguresMap[bowId];
          if (fig.wickets > cur.wickets || (fig.wickets === cur.wickets && fig.runs < cur.runs)) {
            bestFiguresMap[bowId] = fig;
          }
        }
      }
    }

    // Fetch all players for name lookup
    const allPlayers = await Player.find({});
    const playerMap: Record<string, any> = {};
    for (const p of allPlayers) playerMap[p._id.toString()] = p;

    // Build batting stats list
    const battingStats = Object.entries(battingMap)
      .map(([pid, s]) => {
        const player = playerMap[pid];
        if (!player) return null;
        const innings = s.innings.size;
        const outs = s.outs;
        const avg = outs > 0 ? s.runs / outs : s.runs > 0 ? s.runs : 0;
        const sr = s.balls > 0 ? (s.runs / s.balls) * 100 : 0;
        const highestSR = s.highestBalls > 0 ? (s.highestScore / s.highestBalls) * 100 : 0;
        return { _id: pid, name: player.name, nickname: player.nickname, role: player.role, runs: s.runs, balls: s.balls, innings, outs, average: avg, strikeRate: sr, highestScore: s.highestScore, highestBalls: s.highestBalls, highestSR, fours: s.fours };
      })
      .filter(Boolean);

    // Build bowling stats list
    const bowlingStats = Object.entries(bowlingMap)
      .map(([pid, s]) => {
        const player = playerMap[pid];
        if (!player) return null;
        const overs = Math.floor(s.balls / 6) + (s.balls % 6) / 10;
        const economy = s.balls > 0 ? s.runs / (s.balls / 6) : 0;
        const bowlingSR = s.wickets > 0 ? s.balls / s.wickets : 0;
        const best = bestFiguresMap[pid] || { wickets: 0, runs: 0 };
        return { _id: pid, name: player.name, nickname: player.nickname, role: player.role, wickets: s.wickets, runs: s.runs, balls: s.balls, overs, economy, bowlingStrikeRate: bowlingSR, bestFigures: best };
      })
      .filter(Boolean);

    // Compute team wins live from completed matches
    const completedQuery: any = { status: 'completed', winner: { $exists: true, $ne: 'Tie' } };
    if (dateFilter) completedQuery.createdAt = dateFilter;
    const completedMatches = await Match.find(completedQuery);
    const teamWins: Record<string, { name: string; wins: number; losses: number }> = {};

    for (const m of completedMatches) {
      const teamAName = m.teamA.name;
      const teamBName = m.teamB.name;
      const winner = m.winner;

      if (!teamWins[teamAName]) teamWins[teamAName] = { name: teamAName, wins: 0, losses: 0 };
      if (!teamWins[teamBName]) teamWins[teamBName] = { name: teamBName, wins: 0, losses: 0 };

      if (winner === teamAName) {
        teamWins[teamAName].wins++;
        teamWins[teamBName].losses++;
      } else if (winner === teamBName) {
        teamWins[teamBName].wins++;
        teamWins[teamAName].losses++;
      }
    }

    const topTeams = Object.values(teamWins)
      .filter(t => t.wins > 0 || t.losses > 0)
      .sort((a, b) => b.wins - a.wins)
      .map(t => ({ _id: t.name, name: t.name, stats: { wins: t.wins, losses: t.losses, matches: t.wins + t.losses } }));

    // MOTM leaderboard
    const motmQuery: any = { status: 'completed', 'motm.playerName': { $exists: true } };
    if (dateFilter) motmQuery.createdAt = dateFilter;
    const motmMatches = await Match.find(motmQuery).select('motm createdAt');
    const motmCount: Record<string, { name: string; team: string; count: number; playerId?: string }> = {};
    for (const m of motmMatches) {
      if (!m.motm?.playerName) continue;
      const key = m.motm.playerName;
      if (!motmCount[key]) motmCount[key] = { name: m.motm.playerName, team: m.motm.team, count: 0, playerId: m.motm.playerId?.toString() };
      motmCount[key].count++;
    }
    const motmStats = Object.values(motmCount).sort((a, b) => b.count - a.count);

    return NextResponse.json({ battingStats, bowlingStats, topTeams, motmStats });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
