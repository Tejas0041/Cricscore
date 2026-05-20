import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Tournament from '@/models/Tournament';
import Match from '@/models/Match';
import Player from '@/models/Player';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const matchQuery = { _id: { $in: tournament.matches }, status: { $in: ['completed', 'live'] } };
    const matches = await Match.find(matchQuery);

    const battingMap: Record<string, { runs: number; balls: number; fours: number; outs: number; innings: Set<string>; highestScore: number; highestBalls: number }> = {};
    const bowlingMap: Record<string, { runs: number; balls: number; wickets: number }> = {};
    const bestFiguresMap: Record<string, { wickets: number; runs: number }> = {};

    for (const match of matches) {
      const matchId = match._id.toString();
      const inningsStats: Record<string, Record<string, { runs: number; balls: number; fours: number }>> = { first: {}, second: {} };

      for (const event of match.timeline) {
        const inn = event.innings as string;
        const bId = event.batsman?.toString();
        const bowId = event.bowler?.toString();

        if (bId) {
          if (!battingMap[bId]) battingMap[bId] = { runs: 0, balls: 0, fours: 0, outs: 0, innings: new Set(), highestScore: 0, highestBalls: 0 };
          if (!inningsStats[inn]) inningsStats[inn] = {};
          if (!inningsStats[inn][bId]) inningsStats[inn][bId] = { runs: 0, balls: 0, fours: 0 };
          if (event.eventType === 'run') { battingMap[bId].runs += event.runs; battingMap[bId].balls++; inningsStats[inn][bId].runs += event.runs; inningsStats[inn][bId].balls++; if (event.runs === 4) { battingMap[bId].fours++; inningsStats[inn][bId].fours++; } }
          else if (event.eventType === 'dot') { battingMap[bId].balls++; inningsStats[inn][bId].balls++; }
          else if (event.eventType === 'wicket') { battingMap[bId].balls++; battingMap[bId].outs++; inningsStats[inn][bId].balls++; }
          battingMap[bId].innings.add(`${matchId}-${inn}`);
        }
        if (bowId) {
          if (!bowlingMap[bowId]) bowlingMap[bowId] = { runs: 0, balls: 0, wickets: 0 };
          if (event.eventType === 'run') { bowlingMap[bowId].runs += event.runs; bowlingMap[bowId].balls++; }
          else if (event.eventType === 'dot') bowlingMap[bowId].balls++;
          else if (event.eventType === 'wicket') { bowlingMap[bowId].wickets++; bowlingMap[bowId].balls++; }
        }
      }

      for (const inn of ['first', 'second']) {
        for (const [bId, s] of Object.entries(inningsStats[inn] || {})) {
          if (!battingMap[bId]) continue;
          if (s.runs > battingMap[bId].highestScore) { battingMap[bId].highestScore = s.runs; battingMap[bId].highestBalls = s.balls; }
        }
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
          if (fig.wickets > cur.wickets || (fig.wickets === cur.wickets && fig.runs < cur.runs)) bestFiguresMap[bowId] = fig;
        }
      }
    }

    const allPlayers = await Player.find({});
    const playerMap: Record<string, any> = {};
    for (const p of allPlayers) playerMap[p._id.toString()] = p;

    const battingStats = Object.entries(battingMap).map(([pid, s]) => {
      const player = playerMap[pid]; if (!player) return null;
      const innings = s.innings.size;
      const sr = s.balls > 0 ? (s.runs / s.balls) * 100 : 0;
      const avg = s.outs > 0 ? s.runs / s.outs : s.runs;
      const highestSR = s.highestBalls > 0 ? (s.highestScore / s.highestBalls) * 100 : 0;
      return { _id: pid, name: player.name, nickname: player.nickname, runs: s.runs, balls: s.balls, innings, outs: s.outs, strikeRate: sr, average: avg, highestScore: s.highestScore, highestBalls: s.highestBalls, highestSR, fours: s.fours };
    }).filter(Boolean);

    const bowlingStats = Object.entries(bowlingMap).map(([pid, s]) => {
      const player = playerMap[pid]; if (!player) return null;
      const economy = s.balls > 0 ? s.runs / (s.balls / 6) : 0;
      const bowlingSR = s.wickets > 0 ? s.balls / s.wickets : 0;
      const best = bestFiguresMap[pid] || { wickets: 0, runs: 0 };
      return { _id: pid, name: player.name, nickname: player.nickname, wickets: s.wickets, runs: s.runs, balls: s.balls, overs: Math.floor(s.balls / 6) + (s.balls % 6) / 10, economy, bowlingStrikeRate: bowlingSR, bestFigures: best };
    }).filter(Boolean);

    // Team wins
    const completedMatches = await Match.find({ _id: { $in: tournament.matches }, status: 'completed', winner: { $exists: true, $ne: 'Tie' } });
    const teamWins: Record<string, { name: string; wins: number; losses: number }> = {};
    for (const m of completedMatches) {
      if (!teamWins[m.teamA.name]) teamWins[m.teamA.name] = { name: m.teamA.name, wins: 0, losses: 0 };
      if (!teamWins[m.teamB.name]) teamWins[m.teamB.name] = { name: m.teamB.name, wins: 0, losses: 0 };
      if (m.winner === m.teamA.name) { teamWins[m.teamA.name].wins++; teamWins[m.teamB.name].losses++; }
      else if (m.winner === m.teamB.name) { teamWins[m.teamB.name].wins++; teamWins[m.teamA.name].losses++; }
    }
    const topTeams = Object.values(teamWins).filter(t => t.wins > 0 || t.losses > 0).sort((a, b) => b.wins - a.wins)
      .map(t => ({ _id: t.name, name: t.name, stats: { wins: t.wins, losses: t.losses, matches: t.wins + t.losses } }));

    // MOTM
    const motmMatches = await Match.find({ _id: { $in: tournament.matches }, status: 'completed', 'motm.playerName': { $exists: true } }).select('motm');
    const motmCount: Record<string, { name: string; team: string; count: number; playerId?: string }> = {};
    for (const m of motmMatches) {
      if (!m.motm?.playerName) continue;
      const key = m.motm.playerName;
      if (!motmCount[key]) motmCount[key] = { name: m.motm.playerName, team: m.motm.team, count: 0, playerId: m.motm.playerId?.toString() };
      motmCount[key].count++;
    }
    const motmStats = Object.values(motmCount).sort((a, b) => b.count - a.count);

    // Captain record
    const capMatches = await Match.find({ _id: { $in: tournament.matches }, status: 'completed', winner: { $exists: true, $ne: 'Tie' } }).populate('teamA.captain teamB.captain');
    const captainRecord: Record<string, { id: string; name: string; team: string; wins: number; matches: number }> = {};
    for (const m of capMatches) {
      for (const [cap, teamName] of [[m.teamA.captain, m.teamA.name], [m.teamB.captain, m.teamB.name]] as any[]) {
        if (!cap) continue;
        const key = `${cap._id}_${teamName}`;
        if (!captainRecord[key]) captainRecord[key] = { id: cap._id.toString(), name: (cap as any).name, team: teamName, wins: 0, matches: 0 };
        captainRecord[key].matches++;
        if (m.winner === teamName) captainRecord[key].wins++;
      }
    }
    const captainStats = Object.values(captainRecord).filter(c => c.wins > 0).sort((a, b) => b.wins - a.wins);

    // Winning contributions
    const winBattingMap: Record<string, { runs: number; balls: number; innings: number; outs: number; highestScore: number; highestBalls: number; fours: number }> = {};
    const winBowlingMap: Record<string, { runs: number; balls: number; wickets: number }> = {};
    const winBestFiguresMap: Record<string, { wickets: number; runs: number }> = {};
    const wonMatches = await Match.find({ _id: { $in: tournament.matches }, status: 'completed', winner: { $exists: true, $ne: 'Tie' } }).populate('teamA.players teamB.players');

    for (const match of wonMatches) {
      const winner = match.winner as string;
      const winningPlayers = new Set<string>();
      const teamAWon = winner === match.teamA.name;
      for (const p of (teamAWon ? match.teamA.players : match.teamB.players) as any[]) winningPlayers.add(p._id?.toString() ?? p.toString());
      const inningsStats: Record<string, Record<string, { runs: number; balls: number; fours: number }>> = { first: {}, second: {} };

      for (const event of match.timeline) {
        const inn = event.innings as string;
        const bId = event.batsman?.toString();
        const bowId = event.bowler?.toString();
        if (bId && winningPlayers.has(bId)) {
          if (!winBattingMap[bId]) winBattingMap[bId] = { runs: 0, balls: 0, innings: 0, outs: 0, highestScore: 0, highestBalls: 0, fours: 0 };
          if (!inningsStats[inn]) inningsStats[inn] = {};
          if (!inningsStats[inn][bId]) { inningsStats[inn][bId] = { runs: 0, balls: 0, fours: 0 }; winBattingMap[bId].innings++; }
          if (event.eventType === 'run') { winBattingMap[bId].runs += event.runs; winBattingMap[bId].balls++; inningsStats[inn][bId].runs += event.runs; inningsStats[inn][bId].balls++; if (event.runs === 4) { winBattingMap[bId].fours++; inningsStats[inn][bId].fours++; } }
          else if (event.eventType === 'dot') { winBattingMap[bId].balls++; inningsStats[inn][bId].balls++; }
          else if (event.eventType === 'wicket') { winBattingMap[bId].balls++; winBattingMap[bId].outs++; inningsStats[inn][bId].balls++; }
        }
        if (bowId && winningPlayers.has(bowId)) {
          if (!winBowlingMap[bowId]) winBowlingMap[bowId] = { runs: 0, balls: 0, wickets: 0 };
          if (event.eventType === 'run') { winBowlingMap[bowId].runs += event.runs; winBowlingMap[bowId].balls++; }
          else if (event.eventType === 'dot') winBowlingMap[bowId].balls++;
          else if (event.eventType === 'wicket') { winBowlingMap[bowId].wickets++; winBowlingMap[bowId].balls++; }
        }
      }
      for (const inn of ['first', 'second']) {
        for (const [bId, s] of Object.entries(inningsStats[inn] || {})) {
          if (!winBattingMap[bId]) continue;
          if (s.runs > winBattingMap[bId].highestScore) { winBattingMap[bId].highestScore = s.runs; winBattingMap[bId].highestBalls = s.balls; }
        }
        const inningsBowling: Record<string, { wickets: number; runs: number }> = {};
        for (const event of match.timeline.filter((e: any) => e.innings === inn)) {
          const bowId = event.bowler?.toString();
          if (!bowId || !winningPlayers.has(bowId)) continue;
          if (!inningsBowling[bowId]) inningsBowling[bowId] = { wickets: 0, runs: 0 };
          if (event.eventType === 'wicket') inningsBowling[bowId].wickets++;
          if (event.eventType === 'run') inningsBowling[bowId].runs += event.runs;
        }
        for (const [bowId, fig] of Object.entries(inningsBowling)) {
          if (!winBestFiguresMap[bowId]) { winBestFiguresMap[bowId] = fig; continue; }
          const cur = winBestFiguresMap[bowId];
          if (fig.wickets > cur.wickets || (fig.wickets === cur.wickets && fig.runs < cur.runs)) winBestFiguresMap[bowId] = fig;
        }
      }
    }

    const winBattingStats = Object.entries(winBattingMap).map(([pid, s]) => {
      const player = playerMap[pid]; if (!player) return null;
      const sr = s.balls > 0 ? (s.runs / s.balls) * 100 : 0;
      const avg = s.outs > 0 ? s.runs / s.outs : s.runs;
      const highestSR = s.highestBalls > 0 ? (s.highestScore / s.highestBalls) * 100 : 0;
      return { _id: pid, name: player.name, nickname: player.nickname, runs: s.runs, balls: s.balls, innings: s.innings, outs: s.outs, strikeRate: sr, average: avg, highestScore: s.highestScore, highestBalls: s.highestBalls, highestSR, fours: s.fours };
    }).filter(Boolean);

    const winBowlingStats = Object.entries(winBowlingMap).map(([pid, s]) => {
      const player = playerMap[pid]; if (!player) return null;
      const economy = s.balls > 0 ? s.runs / (s.balls / 6) : 0;
      const bowlingSR = s.wickets > 0 ? s.balls / s.wickets : 0;
      const best = winBestFiguresMap[pid] || { wickets: 0, runs: 0 };
      return { _id: pid, name: player.name, nickname: player.nickname, wickets: s.wickets, runs: s.runs, balls: s.balls, economy, bowlingStrikeRate: bowlingSR, bestFigures: best };
    }).filter(Boolean);

    return NextResponse.json({ battingStats, bowlingStats, topTeams, motmStats, captainStats, winBattingStats, winBowlingStats });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
