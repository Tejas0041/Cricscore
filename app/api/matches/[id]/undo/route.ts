import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';
import { requireAuth } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function POST(
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
    
    if (match.timeline.length === 0) {
      return NextResponse.json({ error: 'No events to undo' }, { status: 400 });
    }
    
    const lastEvent = match.timeline.pop();
    const inningsKey = lastEvent!.innings as string;
    const isSuperOverInnings = inningsKey === 'so_first' || inningsKey === 'so_second';

    // Resolve the innings object to mutate
    let innings: any;
    if (isSuperOverInnings) {
      const soKey = inningsKey === 'so_first' ? 'first' : 'second';
      innings = match.superOver?.innings?.[soKey];
    } else {
      innings = match.innings[inningsKey as 'first' | 'second'];
    }

    // Revert the event
    if (lastEvent!.eventType === 'wide' || lastEvent!.eventType === 'noball' || lastEvent!.eventType === 'deadball') {
      // These didn't count as balls - nothing to revert on innings counts
    } else {
      const wasOverComplete = lastEvent!.ball === 6;

      if (wasOverComplete) {
        innings.overs -= 1;
        innings.balls = 5;
      } else if (innings.balls > 0) {
        innings.balls -= 1;
      }

      if (lastEvent!.eventType === 'run') {
        innings.runs -= lastEvent!.runs;
        if (lastEvent!.runs > 0) {
          await Player.findByIdAndUpdate(lastEvent!.batsman, {
            $inc: { 'stats.batting.runs': -lastEvent!.runs },
          });
        }
      } else if (lastEvent!.eventType === 'wicket') {
        innings.wickets -= 1;
        await Player.findByIdAndUpdate(lastEvent!.bowler, {
          $inc: { 'stats.bowling.wickets': -1 },
        });
        innings.currentBatsman = lastEvent!.batsman;
      }

      if (wasOverComplete) {
        innings.currentBowler = lastEvent!.bowler;
      }

      innings.completed = false;

      if (isSuperOverInnings) {
        // Revert super over state
        if (match.superOver) {
          const soKey = inningsKey === 'so_first' ? 'first' : 'second';
          if (soKey === 'second' && match.superOver.completed) {
            // Was completed — revert to active second innings
            match.superOver.completed = false;
            match.superOver.winner = undefined;
            match.superOver.currentInnings = 'second';
            match.winner = 'Tie';
          } else if (soKey === 'second' && match.superOver.currentInnings === 'second') {
            // Still in second innings, just revert ball
          } else if (soKey === 'first') {
            match.superOver.currentInnings = 'first';
          }
        }
      } else {
        if (match.status === 'completed') {
          match.status = 'live';
          match.winner = undefined;
        }
      }
    }

    // Always restore current batsman/bowler from the last event
    if (innings && !innings.currentBatsman) innings.currentBatsman = lastEvent!.batsman;
    if (innings && !innings.currentBowler) innings.currentBowler = lastEvent!.bowler;
    
    match.updatedAt = new Date();
    await match.save();
    
    const populatedMatch = await Match.findById(id)
      .populate('teamA.players teamA.captain teamB.players teamB.captain')
      .populate('innings.first.currentBatsman innings.first.currentBowler')
      .populate('innings.second.currentBatsman innings.second.currentBowler')
      .populate('timeline.batsman timeline.bowler');

    if (!populatedMatch) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    // Trigger real-time update
    const ci = populatedMatch.currentInnings;
    await pusherServer.trigger(`match-${id}`, 'score-update', {
      matchId: id,
      currentInnings: ci,
      status: populatedMatch.status,
      first: {
        runs: populatedMatch.innings.first.runs,
        wickets: populatedMatch.innings.first.wickets,
        overs: populatedMatch.innings.first.overs,
        balls: populatedMatch.innings.first.balls,
        completed: populatedMatch.innings.first.completed,
      },
      second: {
        runs: populatedMatch.innings.second.runs,
        wickets: populatedMatch.innings.second.wickets,
        overs: populatedMatch.innings.second.overs,
        balls: populatedMatch.innings.second.balls,
        completed: populatedMatch.innings.second.completed,
      },
    });
    
    return NextResponse.json({ match: populatedMatch });
  } catch (error: any) {
    console.error('Undo error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
