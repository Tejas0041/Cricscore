import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';
import Match from '@/models/Match';

export async function GET() {
  try {
    await dbConnect();

    // Compute all batting/bowling stats live from completed + live match timelines
    const matches = await Match.find({ status: { $in: ['completed', 'live'] } })
      .populate('teamA.players teamB.players');

    // Map: playerId -> batting stats
    const battingMap: Record<string, { runs: number; balls: number; innings: Set<string>; outs: number }> = {};
    const bowlingMap: Record<string, { runs: number; balls: number; wickets: number }> = {};

    for (const match of matches) {
      const matchId = match._id.toString();

      // Track which players batted per innings
      const inningsBatsmen: Record<string, Set<string>> = { first: new Set(), second: new Set() };

      for (const event of match.timeline) {
        const inn = event.innings as string;
        const bId = event.batsman?.toString();
        const bowId = event.bowler?.toString();

        if (bId) {
          if (!battingMap[bId]) battingMap[bId] = { runs: 0, balls: 0, innings: new Set(), outs: 0 };
          inningsBatsmen[inn]?.add(bId);

          if (event.eventType === 'run') {
            battingMap[bId].runs += event.runs;
            battingMap[bId].balls++;
          } else if (event.eventType === 'dot') {
            battingMap[bId].balls++;
          } else if (event.eventType === 'wicket') {
            battingMap[bId].balls++;
            battingMap[bId].outs++;
          }
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

      // Count innings per batsman for this match
      for (const [, batsmen] of Object.entries(inningsBatsmen)) {
        for (const bId of batsmen) {
          if (battingMap[bId]) {
            battingMap[bId].innings.add(`${matchId}-${Object.keys(inningsBatsmen).find(k => inningsBatsmen[k] === batsmen)}`);
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
        return { _id: pid, name: player.name, role: player.role, runs: s.runs, balls: s.balls, innings, outs, average: avg, strikeRate: sr };
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
        return { _id: pid, name: player.name, role: player.role, wickets: s.wickets, runs: s.runs, balls: s.balls, overs, economy, bowlingStrikeRate: bowlingSR };
      })
      .filter(Boolean);

    // Compute team wins live from completed matches
    const completedMatches = await Match.find({ status: 'completed', winner: { $exists: true, $ne: 'Tie' } });
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
      .slice(0, 10)
      .map(t => ({ _id: t.name, name: t.name, stats: { wins: t.wins, losses: t.losses, matches: t.wins + t.losses } }));

    return NextResponse.json({ battingStats, bowlingStats, topTeams });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
