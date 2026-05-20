import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Tournament from '@/models/Tournament';
import Team from '@/models/Team';
import Player from '@/models/Player';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const tournaments = await Tournament.find()
      .sort({ createdAt: -1 })
      .populate('teams.players')
      .populate('teams.captain');
    return NextResponse.json({ tournaments });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth('scorer');
    await dbConnect();

    const { name, overs, playersPerTeam, dates, teams } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Tournament name required' }, { status: 400 });

    const resolvedTeams = [];
    for (const t of teams || []) {
      let team = await Team.findOne({ name: t.name });
      if (!team) team = await Team.create({ name: t.name, players: [] });

      const playerIds: mongoose.Types.ObjectId[] = [];
      for (const p of t.players || []) {
        if (p._id) {
          playerIds.push(p._id);
        } else if (p.name) {
          const newP = await Player.create({ name: p.name, role: p.role || 'allrounder' });
          playerIds.push(newP._id);
        }
      }

      const existingIds = team.players.map((id: any) => id.toString());
      for (const pid of playerIds) {
        if (!existingIds.includes(pid.toString())) team.players.push(pid as any);
      }
      await team.save();
      resolvedTeams.push({ id: team._id, name: team.name, players: playerIds, captain: t.captain?._id || t.captain || undefined });
    }

    const tournament = await Tournament.create({
      name: name.trim(),
      overs: overs || 8,
      playersPerTeam: playersPerTeam || 6,
      dates: dates || [],
      teams: resolvedTeams,
      status: 'upcoming',
    });

    const populated = await Tournament.findById(tournament._id)
      .populate('teams.players')
      .populate('teams.captain');
    return NextResponse.json({ tournament: populated }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
