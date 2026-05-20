import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Tournament from '@/models/Tournament';
import Match from '@/models/Match';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth('scorer');
    await dbConnect();
    const { id } = await params;

    const tournament = await Tournament.findById(id);
    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

    const { teamAId, teamBId, matchType, scheduledDate, playingSquadA, playingSquadB } = await req.json();

    const teamA = tournament.teams.find((t: any) => t.id.toString() === teamAId);
    const teamB = tournament.teams.find((t: any) => t.id.toString() === teamBId);
    if (!teamA || !teamB) return NextResponse.json({ error: 'Teams not found in tournament' }, { status: 400 });

    // Use playing squad if provided, else full squad
    const teamAPlayers = playingSquadA?.length ? playingSquadA : teamA.players.map((p: any) => p.toString());
    const teamBPlayers = playingSquadB?.length ? playingSquadB : teamB.players.map((p: any) => p.toString());

    const match = await Match.create({
      teamA: { id: teamA.id, name: teamA.name, players: teamAPlayers },
      teamB: { id: teamB.id, name: teamB.name, players: teamBPlayers },
      overs: tournament.overs,
      status: 'upcoming',
      scoringRules: { single: 1, boundary: 4, six: 6, wideRuns: 1, noballRuns: 1 },
      bowlerOversLimit: 2,
      tournamentId: id,
      matchType: matchType || 'league',
      scheduledDate: scheduledDate || null,
    });

    tournament.matches.push(match._id as any);
    if (tournament.status === 'upcoming') tournament.status = 'active';
    await tournament.save();

    const populated = await Match.findById(match._id)
      .populate('teamA.players teamB.players');

    return NextResponse.json({ match: populated }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
