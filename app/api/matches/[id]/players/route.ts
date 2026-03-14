import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const { batsman, bowler } = await request.json();

    const match = await Match.findById(id);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const innings = match.innings[match.currentInnings];
    if (batsman) innings.currentBatsman = batsman;
    if (bowler) innings.currentBowler = bowler;

    await match.save();

    const populated = await Match.findById(id)
      .populate('teamA.players teamA.captain teamB.players teamB.captain')
      .populate('innings.first.currentBatsman innings.first.currentBowler')
      .populate('innings.second.currentBatsman innings.second.currentBowler')
      .populate('timeline.batsman timeline.bowler');

    return NextResponse.json({ match: populated });
  } catch (error: any) {
    console.error('Save players error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
