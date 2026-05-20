import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireAuth('admin');
    await dbConnect();
    
    // Reset all player stats to 0
    await Player.updateMany({}, {
      $set: {
        'stats.batting.runs': 0,
        'stats.batting.innings': 0,
        'stats.batting.ballsFaced': 0,
        'stats.batting.fours': 0,
        'stats.batting.sixes': 0,
        'stats.batting.highScore': 0,
        'stats.batting.notOuts': 0,
        'stats.bowling.wickets': 0,
        'stats.bowling.runs': 0,
        'stats.bowling.overs': 0,
        'stats.bowling.balls': 0,
        'stats.bowling.maidens': 0,
        'stats.bowling.bestBowling': { wickets: 0, runs: 0 },
      }
    });
    
    return NextResponse.json({ success: true, message: 'All player stats cleared successfully' });
  } catch (error: any) {
    console.error('Clear stats error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
