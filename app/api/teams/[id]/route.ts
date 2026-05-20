import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Team from '@/models/Team';
import Match from '@/models/Match';
import Player from '@/models/Player';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const team = await Team.findById(id).populate('players captain');
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    const matches = await Match.find({
      $or: [{ 'teamA.id': id }, { 'teamB.id': id }],
      status: 'completed'
    });
    
    return NextResponse.json({ team, matches });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'scorer' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const { addPlayerIds, removePlayerIds, newPlayer, setPlayers, captain, name } = await request.json();

    const team = await Team.findById(id);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    // Rename team
    if (name !== undefined) {
      team.name = name;
    }

    // Bulk replace players list (used when creating a match with existing team)
    if (setPlayers !== undefined) {
      team.players = setPlayers;
    }

    // Update captain if provided
    if (captain !== undefined) {
      team.captain = captain || undefined;
    }

    // Create and add a new player if provided
    if (newPlayer?.name && newPlayer?.role) {
      const created = await Player.create({ name: newPlayer.name, role: newPlayer.role });
      team.players.push(created._id);
    }

    // Add existing players
    if (addPlayerIds?.length) {
      for (const pid of addPlayerIds) {
        if (!team.players.map((p: any) => p.toString()).includes(pid)) {
          team.players.push(pid);
        }
      }
    }

    // Remove players
    if (removePlayerIds?.length) {
      team.players = team.players.filter(
        (p: any) => !removePlayerIds.includes(p.toString())
      );
    }

    await team.save();
    const updated = await Team.findById(id).populate('players captain');
    return NextResponse.json({ team: updated });
  } catch (error: any) {
    console.error('Update team error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'scorer' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const { id } = await params;
    const team = await Team.findByIdAndDelete(id);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
