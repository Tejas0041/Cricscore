import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';

export async function GET() {
  try {
    await dbConnect();
    const players = await Player.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ players });
  } catch (error) {
    console.error('Get players error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { name, nickname, role } = await request.json();
    
    const player = await Player.create({
      name,
      nickname,
      role,
    });
    
    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    console.error('Create player error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
