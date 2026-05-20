import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player'; // required for populate
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const query = status ? { status } : {};
    const matches = await Match.find(query)
      .populate('teamA.players teamA.captain teamB.players teamB.captain')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth('scorer');
    await dbConnect();
    
    const data = await request.json();
    
    // Ensure innings have team names set
    let innings = data.innings;
    if (innings && innings.first && innings.second) {
      // If second innings doesn't have team names, set them (swap from first)
      if (!innings.second.battingTeam || !innings.second.bowlingTeam) {
        innings.second.battingTeam = innings.first.bowlingTeam;
        innings.second.bowlingTeam = innings.first.battingTeam;
      }
    }
    
    const created = await Match.create({
      teamA: data.teamA,
      teamB: data.teamB,
      overs: data.overs,
      tossWinner: data.tossWinner,
      tossDecision: data.tossDecision,
      innings: innings || undefined,
      scoringRules: data.scoringRules || { single: 1, boundary: 4 },
      bowlerOversLimit: data.bowlerOversLimit || 2,
      commonPlayers: data.commonPlayers || [],
    });

    const match = await Match.findById(created._id)
      .populate('teamA.players teamA.captain teamB.players teamB.captain')
      .populate('commonPlayers')
      .populate('innings.first.currentBatsman innings.first.currentBowler')
      .populate('innings.second.currentBatsman innings.second.currentBowler');

    return NextResponse.json({ match }, { status: 201 });
  } catch (error: any) {
    console.error('Create match error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
