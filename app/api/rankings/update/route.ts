import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { calculateRankings } from '@/lib/ai-ranking-engine';
import Match from '@/models/Match';

// Increase timeout for AI processing
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const startTime = Date.now();
    const totalMatches = await Match.countDocuments({ status: 'completed' });
    
    console.log(`🤖 Recalculating AI-Powered CricScore Rankings for ${totalMatches} completed matches...`);

    await calculateRankings();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Rankings updated in ${duration}s`);

    return NextResponse.json({ 
      success: true,
      message: 'CricScore Rankings updated successfully',
      matchesProcessed: totalMatches,
      duration: `${duration}s`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Update rankings error:', error);
    return NextResponse.json({ 
      error: 'Failed to update rankings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
