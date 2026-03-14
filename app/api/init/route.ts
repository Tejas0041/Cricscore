import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    await dbConnect();
    
    const adminExists = await User.findOne({ username: 'admin' });
    const scorerExists = await User.findOne({ username: 'scorer' });
    
    if (!adminExists) {
      await User.create({
        username: 'admin',
        password: await hashPassword('admin'),
        role: 'admin',
      });
    }
    
    if (!scorerExists) {
      await User.create({
        username: 'scorer',
        password: await hashPassword('scorer'),
        role: 'scorer',
      });
    }
    
    return NextResponse.json({ success: true, message: 'Default users created' });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
