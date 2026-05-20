import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Team from '@/models/Team';
import Player from '@/models/Player'; // required for populate

export async function GET() {
  try {
    await dbConnect();
    const teams = await Team.find({}).populate('players captain').sort({ createdAt: -1 });
    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { name, players, captain } = await request.json();
    
    const team = await Team.create({
      name,
      players: players || [],
      captain,
    });
    
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
