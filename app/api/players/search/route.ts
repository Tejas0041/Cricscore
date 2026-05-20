import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';
import Match from '@/models/Match';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    if (!q) return NextResponse.json({ players: [] });

    const players = await Player.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { nickname: { $regex: q, $options: 'i' } },
      ],
    }).limit(10);
    return NextResponse.json({ players });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
