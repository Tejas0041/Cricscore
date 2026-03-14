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
    const { eventType, runs, batsman, bowler } = await request.json();
    
    const match = await Match.findById(id);
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    // Set match to live on first score
    if (match.status === 'upcoming') {
      match.status = 'live';
    }
    
    const innings = match.innings[match.currentInnings];
    
    // Update current batsman and bowler
    innings.currentBatsman = batsman;
    innings.currentBowler = bowler;
    
    // Handle different event types
    if (eventType === 'wide' || eventType === 'noball' || eventType === 'deadball') {
      // These don't count as balls and don't add runs
      match.timeline.push({
        over: innings.overs,
        ball: innings.balls,
        eventType,
        runs: 0,
        batsman,
        bowler,
        innings: match.currentInnings,
        timestamp: new Date(),
      });
    } else {
      // Regular ball
      innings.balls += 1;
      
      if (eventType === 'run') {
        innings.runs += runs;
      } else if (eventType === 'wicket') {
        innings.wickets += 1;
        // Clear current batsman on wicket
        innings.currentBatsman = undefined;
      }
      
      match.timeline.push({
        over: innings.overs,
        ball: innings.balls,
        eventType,
        runs: runs || 0,
        batsman,
        bowler,
        innings: match.currentInnings,
        timestamp: new Date(),
      });
      
      // Check if over is complete
      if (innings.balls === 6) {
        innings.overs += 1;
        innings.balls = 0;
        // Clear current bowler on over completion
        innings.currentBowler = undefined;
      }
      
      // Check if innings is complete (overs done OR all players out OR target chased)
      const teamPlayers = match.currentInnings === 'first' ? match.teamA.players.length : match.teamB.players.length;
      const targetChased = match.currentInnings === 'second' && innings.runs > match.innings.first.runs;
      if (innings.overs >= match.overs || innings.wickets >= teamPlayers || targetChased) {
        innings.completed = true;
        
        if (match.currentInnings === 'first') {
          match.currentInnings = 'second';
          match.innings.second.battingTeam = innings.bowlingTeam;
          match.innings.second.bowlingTeam = innings.battingTeam;
        } else {
          match.status = 'completed';
          
          // Determine winner by team name (teamA bats first)
          const teamAName = match.teamA.name;
          const teamBName = match.teamB.name;
          // first innings batting team is always teamA (set during match creation)
          if (match.innings.second.runs > match.innings.first.runs) {
            match.winner = teamBName; // team batting second won
          } else if (match.innings.first.runs > match.innings.second.runs) {
            match.winner = teamAName; // team batting first won
          } else {
            match.winner = 'Tie';
          }
        }
      }
    }
    
    match.updatedAt = new Date();
    await match.save();
    
    // Update player stats
    if (eventType === 'run' && runs > 0) {
      await Player.findByIdAndUpdate(batsman, {
        $inc: {
          'stats.batting.runs': runs,
        },
      });
    } else if (eventType === 'wicket') {
      await Player.findByIdAndUpdate(bowler, {
        $inc: {
          'stats.bowling.wickets': 1,
        },
      });
    }
    
    // Get populated match for response
    const populatedMatch = await Match.findById(id)
      .populate('teamA.players teamA.captain teamB.players teamB.captain')
      .populate('innings.first.currentBatsman innings.first.currentBowler')
      .populate('innings.second.currentBatsman innings.second.currentBowler')
      .populate('timeline.batsman timeline.bowler');
    
    // Trigger real-time update - send only primitive values to stay under 10KB limit
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
    console.error('Score update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
