import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';
import Match from '@/models/Match';

export async function GET() {
  try {
    await dbConnect();

    const players = await Player.find({}).sort({ name: 1 });
    const matches = await Match.find({ status: { $in: ['completed', 'live'] } }).select('timeline motm');

    // Build stats from timeline
    const statsMap: Record<string, { matchIds: Set<string>; innings: Set<string>; runs: number; wickets: number }> = {};

    for (const match of matches) {
      const matchId = match._id.toString();
      for (const event of match.timeline) {
        const bId = event.batsman?.toString();
        const bowId = event.bowler?.toString();

        if (bId) {
          if (!statsMap[bId]) statsMap[bId] = { matchIds: new Set(), innings: new Set(), runs: 0, wickets: 0 };
          statsMap[bId].matchIds.add(matchId);
          statsMap[bId].innings.add(`${matchId}-${event.innings}`);
          if (event.eventType === 'run') statsMap[bId].runs += event.runs;
        }
        if (bowId) {
          if (!statsMap[bowId]) statsMap[bowId] = { matchIds: new Set(), innings: new Set(), runs: 0, wickets: 0 };
          statsMap[bowId].matchIds.add(matchId);
          if (event.eventType === 'wicket') statsMap[bowId].wickets++;
        }
      }
    }

    const result = players.map((p) => {
      const s = statsMap[p._id.toString()];
      const motmCount = matches.filter((m: any) => m.motm?.playerId?.toString() === p._id.toString()).length;
      return {
        _id: p._id,
        name: p.name,
        nickname: p.nickname,
        role: p.role,
        matches: s?.matchIds.size ?? 0,
        innings: s?.innings.size ?? 0,
        runs: s?.runs ?? 0,
        wickets: s?.wickets ?? 0,
        motmCount,
      };
    });

    return NextResponse.json({ players: result });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
