import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'batting';
    const limit = parseInt(searchParams.get('limit') || '30');

    let sort: any = { 'rankings.batting': -1 };
    let filter: any = { 'rankings.batting': { $gt: 0 } };
    
    if (category === 'bowling') {
      sort = { 'rankings.bowling': -1 };
      filter = { 'rankings.bowling': { $gt: 0 } };
    } else if (category === 'allrounder') {
      sort = { 'rankings.allRounder': -1 };
      filter = { 'rankings.allRounder': { $gt: 0 } };
    }

    // Fetch rankings from DB (already calculated and saved)
    const players = await Player.find(filter)
      .sort(sort)
      .limit(limit)
      .select('name nickname role rankings stats motmCount createdAt')
      .lean();

    // Format response to match expected structure
    const formattedPlayers = players.map((player) => ({
      _id: player._id,
      name: player.name,
      nickname: player.nickname,
      role: player.role,
      rankings: player.rankings,
      stats: player.stats,
      motmCount: player.motmCount || 0
    }));

    return NextResponse.json({ 
      players: formattedPlayers,
      category,
      total: formattedPlayers.length,
      lastUpdated: players[0]?.rankings?.lastUpdated || new Date()
    });
  } catch (error) {
    console.error('Get rankings error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch rankings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
