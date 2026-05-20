import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Tournament from '@/models/Tournament';
import Match from '@/models/Match';
import { requireAuth } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const tournament = await Tournament.findById(id)
      .populate('teams.players')
      .populate('teams.captain');
    if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const matches = await Match.find({ _id: { $in: tournament.matches } })
      .populate('teamA.players teamA.captain teamB.players teamB.captain')
      .sort({ createdAt: 1 });

    return NextResponse.json({ tournament, matches });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth('scorer');
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    // Handle match removal specially
    if (body.removeMatchId) {
      const tournament = await Tournament.findByIdAndUpdate(
        id,
        { $pull: { matches: body.removeMatchId }, updatedAt: new Date() },
        { new: true }
      ).populate('teams.players').populate('teams.captain');
      return NextResponse.json({ tournament });
    }

    const tournament = await Tournament.findByIdAndUpdate(id, { ...body, updatedAt: new Date() }, { new: true })
      .populate('teams.players')
      .populate('teams.captain');
    return NextResponse.json({ tournament });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
