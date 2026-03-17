import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';
import Settings from '@/models/Settings';
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
    const { eventType, runs, batsman, bowler, superOver: isSuperOver } = await request.json();

    const match = await Match.findById(id);
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    // Always use live settings for scoring rules
    const liveSettings = await Settings.findOne();
    const sr = liveSettings?.scoringRules ?? match.scoringRules;

    if (match.status === 'upcoming') match.status = 'live';

    let justCompleted = false;
    let isTie = false;

    if (isSuperOver && match.superOver?.active) {
      const so = match.superOver;
      const innings = so.innings[so.currentInnings];

      innings.currentBatsman = batsman;
      innings.currentBowler = bowler;

      if (['wide', 'noball', 'deadball'].includes(eventType)) {
        const extraRuns = eventType === 'wide' ? (sr?.wideRuns ?? 1)
          : eventType === 'noball' ? (sr?.noballRuns ?? 1) : 0;
        if (extraRuns > 0) innings.runs += extraRuns;
        match.timeline.push({ over: innings.overs, ball: innings.balls, eventType, runs: extraRuns, batsman, bowler, innings: ('so_' + so.currentInnings) as any, timestamp: new Date() });
      } else {
        innings.balls += 1;
        if (eventType === 'run') innings.runs += runs;
        else if (eventType === 'wicket') { innings.wickets += 1; innings.currentBatsman = undefined; }

        match.timeline.push({ over: innings.overs, ball: innings.balls, eventType, runs: runs || 0, batsman, bowler, innings: ('so_' + so.currentInnings) as any, timestamp: new Date() });

        if (innings.balls === 6) { innings.overs += 1; innings.balls = 0; innings.currentBowler = undefined; }

        if (eventType === 'run' && runs > 0) await Player.findByIdAndUpdate(batsman, { $inc: { 'stats.batting.runs': runs } });
        else if (eventType === 'wicket') await Player.findByIdAndUpdate(bowler, { $inc: { 'stats.bowling.wickets': 1 } });

        const teamPlayers = so.currentInnings === 'first' ? match.teamA.players.length : match.teamB.players.length;
        const targetChased = so.currentInnings === 'second' && innings.runs > so.innings.first.runs;
        if (innings.overs >= so.overs || innings.wickets >= teamPlayers || targetChased) {
          innings.completed = true;
          if (so.currentInnings === 'first') {
            so.currentInnings = 'second';
            so.innings.second.battingTeam = innings.bowlingTeam;
            so.innings.second.bowlingTeam = innings.battingTeam;
          } else {
            so.completed = true;
            if (so.innings.second.runs > so.innings.first.runs) so.winner = match.teamB.name;
            else if (so.innings.first.runs > so.innings.second.runs) so.winner = match.teamA.name;
            else so.winner = 'Tie';
            match.winner = so.winner === 'Tie' ? 'Tie' : (so.winner + ' (Super Over)');
            justCompleted = true;
          }
        }
      }
    } else {
      const innings = match.innings[match.currentInnings];
      innings.currentBatsman = batsman;
      innings.currentBowler = bowler;

      if (['wide', 'noball', 'deadball'].includes(eventType)) {
        const extraRuns = eventType === 'wide' ? (sr?.wideRuns ?? 1)
          : eventType === 'noball' ? (sr?.noballRuns ?? 1) : 0;
        if (extraRuns > 0) innings.runs += extraRuns;
        match.timeline.push({ over: innings.overs, ball: innings.balls, eventType, runs: extraRuns, batsman, bowler, innings: match.currentInnings, timestamp: new Date() });
      } else {
        innings.balls += 1;
        if (eventType === 'run') innings.runs += runs;
        else if (eventType === 'wicket') { innings.wickets += 1; innings.currentBatsman = undefined; }

        match.timeline.push({ over: innings.overs, ball: innings.balls, eventType, runs: runs || 0, batsman, bowler, innings: match.currentInnings, timestamp: new Date() });

        if (innings.balls === 6) { innings.overs += 1; innings.balls = 0; innings.currentBowler = undefined; }

        if (eventType === 'run' && runs > 0) await Player.findByIdAndUpdate(batsman, { $inc: { 'stats.batting.runs': runs } });
        else if (eventType === 'wicket') await Player.findByIdAndUpdate(bowler, { $inc: { 'stats.bowling.wickets': 1 } });

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
            if (match.innings.second.runs > match.innings.first.runs) match.winner = match.teamB.name;
            else if (match.innings.first.runs > match.innings.second.runs) match.winner = match.teamA.name;
            else { match.winner = 'Tie'; isTie = true; }
            if (!isTie) justCompleted = true;
          }
        }
      }
    }

    match.updatedAt = new Date();
    await match.save();

    if (justCompleted) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      fetch(baseUrl + '/api/matches/' + id + '/motm', { method: 'POST' }).catch(() => {});
    }

    const populatedMatch = await Match.findById(id)
      .populate('teamA.players teamA.captain teamB.players teamB.captain')
      .populate('commonPlayers')
      .populate('innings.first.currentBatsman innings.first.currentBowler')
      .populate('innings.second.currentBatsman innings.second.currentBowler')
      .populate('timeline.batsman timeline.bowler');

    const ci = populatedMatch.currentInnings;
    await pusherServer.trigger('match-' + id, 'score-update', {
      matchId: id,
      currentInnings: ci,
      status: populatedMatch.status,
      first: { runs: populatedMatch.innings.first.runs, wickets: populatedMatch.innings.first.wickets, overs: populatedMatch.innings.first.overs, balls: populatedMatch.innings.first.balls, completed: populatedMatch.innings.first.completed },
      second: { runs: populatedMatch.innings.second.runs, wickets: populatedMatch.innings.second.wickets, overs: populatedMatch.innings.second.overs, balls: populatedMatch.innings.second.balls, completed: populatedMatch.innings.second.completed },
    });

    return NextResponse.json({ match: populatedMatch });
  } catch (error: any) {
    console.error('Score update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
