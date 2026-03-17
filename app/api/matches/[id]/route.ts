import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const match = await Match.findById(id)
      .populate('teamA.players teamA.captain teamB.players teamB.captain')
      .populate('commonPlayers')
      .populate('innings.first.currentBatsman innings.first.currentBowler')
      .populate('innings.second.currentBatsman innings.second.currentBowler')
      .populate('timeline.batsman timeline.bowler');
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    return NextResponse.json({ match });
  } catch (error) {
    console.error('Get match error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('scorer');
    await dbConnect();
    
    const { id } = await params;
    const updates = await request.json();
    
    // Validate overs if being updated
    if (updates.overs !== undefined) {
      const overs = parseInt(updates.overs);
      if (isNaN(overs) || overs < 1 || overs > 50) {
        return NextResponse.json({ error: 'Overs must be between 1 and 50' }, { status: 400 });
      }
      updates.overs = overs;
    }
    
    const match = await Match.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate('teamA.players teamA.captain teamB.players teamB.captain')
      .populate('innings.first.currentBatsman innings.first.currentBowler')
      .populate('innings.second.currentBatsman innings.second.currentBowler');
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    return NextResponse.json({ match });
  } catch (error: any) {
    console.error('Update match error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('scorer');
    await dbConnect();
    
    const { id } = await params;
    const match = await Match.findById(id);
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    // Revert player stats from this match
    for (const event of match.timeline) {
      if (event.eventType === 'run' && event.runs > 0) {
        await Player.findByIdAndUpdate(event.batsman, {
          $inc: { 'stats.batting.runs': -event.runs },
        });
      } else if (event.eventType === 'wicket') {
        await Player.findByIdAndUpdate(event.bowler, {
          $inc: { 'stats.bowling.wickets': -1 },
        });
      }
    }
    
    await Match.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete match error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
