import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Tournament from '@/models/Tournament';
import Match from '@/models/Match';

// Net Run Rate = (Total runs scored / Total overs faced) - (Total runs conceded / Total overs bowled against)
// Overs are counted as decimals: 4.3 overs = 4 + 3/6 = 4.5 actual overs
function ballsToOvers(balls: number): number {
  return balls / 6;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const matches = await Match.find({
      _id: { $in: tournament.matches },
      status: 'completed',
    });

    // Build points table
    const table: Record<string, {
      name: string;
      played: number;
      won: number;
      lost: number;
      tied: number;
      points: number;
      runsScored: number;
      ballsFaced: number;
      runsConceded: number;
      ballsBowled: number;
      nrr: number;
    }> = {};

    // Init all teams
    for (const t of tournament.teams) {
      table[t.name] = {
        name: t.name,
        played: 0, won: 0, lost: 0, tied: 0, points: 0,
        runsScored: 0, ballsFaced: 0,
        runsConceded: 0, ballsBowled: 0,
        nrr: 0,
      };
    }

    for (const match of matches) {
      const tA = match.teamA.name;
      const tB = match.teamB.name;
      if (!table[tA] || !table[tB]) continue;

      // Determine which innings each team batted
      const firstBatting = match.innings.first.battingTeam;
      const secondBatting = match.innings.second.battingTeam;

      const firstRuns = match.innings.first.runs;
      const firstBalls = match.innings.first.overs * 6 + match.innings.first.balls;
      const secondRuns = match.innings.second.runs;
      const secondBalls = match.innings.second.overs * 6 + match.innings.second.balls;

      // Total overs in match (for all-out innings, use full overs)
      const totalBalls = tournament.overs * 6;

      // For NRR: if team was all out, they used all balls (full overs)
      // If they chased successfully, use actual balls faced
      const firstTeamAllOut = match.innings.first.wickets >= match.teamA.players.length ||
        match.innings.first.wickets >= match.teamB.players.length;
      const secondTeamAllOut = match.innings.second.wickets >= match.teamA.players.length ||
        match.innings.second.wickets >= match.teamB.players.length;

      // Balls used for NRR calculation
      const firstBallsForNRR = firstTeamAllOut ? totalBalls : firstBalls;
      const secondBallsForNRR = secondTeamAllOut ? totalBalls : secondBalls;

      // Assign runs/balls to each team
      const teamABatFirst = firstBatting === tA;

      const teamARuns = teamABatFirst ? firstRuns : secondRuns;
      const teamABalls = teamABatFirst ? firstBallsForNRR : secondBallsForNRR;
      const teamBRuns = teamABatFirst ? secondRuns : firstRuns;
      const teamBBalls = teamABatFirst ? secondBallsForNRR : firstBallsForNRR;

      table[tA].runsScored += teamARuns;
      table[tA].ballsFaced += teamABalls;
      table[tA].runsConceded += teamBRuns;
      table[tA].ballsBowled += teamBBalls;

      table[tB].runsScored += teamBRuns;
      table[tB].ballsFaced += teamBBalls;
      table[tB].runsConceded += teamARuns;
      table[tB].ballsBowled += teamABalls;

      table[tA].played++;
      table[tB].played++;

      const winner = match.winner;
      if (winner === 'Tie') {
        table[tA].tied++; table[tA].points += 1;
        table[tB].tied++; table[tB].points += 1;
      } else if (winner === tA) {
        table[tA].won++; table[tA].points += 2;
        table[tB].lost++;
      } else if (winner === tB) {
        table[tB].won++; table[tB].points += 2;
        table[tA].lost++;
      }
    }

    // Calculate NRR for each team
    for (const entry of Object.values(table)) {
      const forRate = entry.ballsFaced > 0 ? entry.runsScored / ballsToOvers(entry.ballsFaced) : 0;
      const againstRate = entry.ballsBowled > 0 ? entry.runsConceded / ballsToOvers(entry.ballsBowled) : 0;
      entry.nrr = parseFloat((forRate - againstRate).toFixed(3));
    }

    // Sort: points desc, then NRR desc, then wins desc
    const sorted = Object.values(table).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.nrr !== a.nrr) return b.nrr - a.nrr;
      return b.won - a.won;
    });

    return NextResponse.json({ points: sorted });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
