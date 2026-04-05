import Match from '@/models/Match';
import Player from '@/models/Player';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

interface PlayerStats {
  playerId: string;
  playerName: string;
  
  // Batting stats
  battingInnings: number;
  totalRuns: number;
  totalBalls: number;
  highestScore: number;
  battingAverage: number;
  strikeRate: number;
  fours: number;
  sixes: number;
  notOuts: number;
  ducks: number;
  thirtyPlus: number;
  
  // Bowling stats
  bowlingInnings: number;
  totalWickets: number;
  totalRunsConceded: number;
  totalBallsBowled: number;
  bestFigures: { wickets: number; runs: number };
  bowlingAverage: number;
  bowlingStrikeRate: number;
  economy: number;
  dotBalls: number;
  threeWicketHauls: number;
  fourWicketHauls: number;
  
  // Match impact
  motmCount: number;
  matchesWon: number;
  matchesPlayed: number;
  winPercentage: number;
  matchWinningKnocks: number; // Scored 40%+ of team total in wins
  crucialWickets: number; // 3+ wickets in wins
  
  // Consistency
  battingConsistency: number; // Std deviation of scores
  bowlingConsistency: number; // Std deviation of wickets
  
  // Recent form (last 5 matches)
  recentBattingAvg: number;
  recentBowlingAvg: number;
  recentWickets: number;
  recentRuns: number;
}

/**
 * Extract comprehensive player statistics from all matches
 */
async function extractPlayerStats(): Promise<Map<string, PlayerStats>> {
  const players = await Player.find().lean();
  const matches = await Match.find({ status: 'completed' }).sort({ createdAt: 1 }).lean();
  
  const statsMap = new Map<string, PlayerStats>();
  
  // Initialize stats for all players
  players.forEach(p => {
    statsMap.set(p._id.toString(), {
      playerId: p._id.toString(),
      playerName: p.name,
      battingInnings: 0,
      totalRuns: 0,
      totalBalls: 0,
      highestScore: 0,
      battingAverage: 0,
      strikeRate: 0,
      fours: 0,
      sixes: 0,
      notOuts: 0,
      ducks: 0,
      thirtyPlus: 0,
      bowlingInnings: 0,
      totalWickets: 0,
      totalRunsConceded: 0,
      totalBallsBowled: 0,
      bestFigures: { wickets: 0, runs: 999 },
      bowlingAverage: 0,
      bowlingStrikeRate: 0,
      economy: 0,
      dotBalls: 0,
      threeWicketHauls: 0,
      fourWicketHauls: 0,
      motmCount: p.motmCount || 0,
      matchesWon: 0,
      matchesPlayed: 0,
      winPercentage: 0,
      matchWinningKnocks: 0,
      crucialWickets: 0,
      battingConsistency: 0,
      bowlingConsistency: 0,
      recentBattingAvg: 0,
      recentBowlingAvg: 0,
      recentWickets: 0,
      recentRuns: 0
    });
  });
  
  // Track per-match performances for consistency calculation
  const battingScores: Map<string, number[]> = new Map();
  const bowlingWickets: Map<string, number[]> = new Map();
  const recentMatches: Map<string, { batting: number[]; bowling: number[] }> = new Map();
  
  players.forEach(p => {
    const pid = p._id.toString();
    battingScores.set(pid, []);
    bowlingWickets.set(pid, []);
    recentMatches.set(pid, { batting: [], bowling: [] });
  });
  
  // Process each match
  for (const match of matches) {
    const teamAWon = match.winner === match.teamA.name;
    const teamBWon = match.winner === match.teamB.name;
    
    // Track which players played
    const playersInMatch = new Set<string>();
    match.teamA.players.forEach((p: any) => playersInMatch.add(p.toString()));
    match.teamB.players.forEach((p: any) => playersInMatch.add(p.toString()));
    
    playersInMatch.forEach(pid => {
      const stats = statsMap.get(pid);
      if (stats) {
        stats.matchesPlayed++;
        const playerTeam = match.teamA.players.some((p: any) => p.toString() === pid) ? 'A' : 'B';
        if ((playerTeam === 'A' && teamAWon) || (playerTeam === 'B' && teamBWon)) {
          stats.matchesWon++;
        }
      }
    });
    
    // Process batting performances per innings
    const inningsData: Record<string, {
      batsmen: Map<string, { runs: number; balls: number; fours: number; sixes: number; out: boolean }>;
      teamTotal: number;
      won: boolean;
    }> = {
      first: { batsmen: new Map(), teamTotal: match.innings.first.runs, won: false },
      second: { batsmen: new Map(), teamTotal: match.innings.second.runs, won: false }
    };
    
    if (match.innings.first.battingTeam === match.teamA.name) {
      inningsData.first.won = teamAWon;
      inningsData.second.won = teamBWon;
    } else {
      inningsData.first.won = teamBWon;
      inningsData.second.won = teamAWon;
    }
    
    // Extract batting stats from timeline
    for (const event of match.timeline) {
      const inn = event.innings as string;
      if (!inningsData[inn]) continue;
      
      const bId = event.batsman?.toString();
      if (bId) {
        if (!inningsData[inn].batsmen.has(bId)) {
          inningsData[inn].batsmen.set(bId, { runs: 0, balls: 0, fours: 0, sixes: 0, out: false });
        }
        const batsman = inningsData[inn].batsmen.get(bId)!;
        
        if (event.eventType === 'run') {
          batsman.runs += event.runs;
          batsman.balls++;
          if (event.runs === 4) batsman.fours++;
          if (event.runs === 6) batsman.sixes++;
        } else if (event.eventType === 'dot') {
          batsman.balls++;
        } else if (event.eventType === 'wicket') {
          batsman.balls++;
          batsman.out = true;
        }
      }
    }
    
    // Update batting stats
    for (const [inn, data] of Object.entries(inningsData)) {
      for (const [bId, perf] of data.batsmen.entries()) {
        const stats = statsMap.get(bId);
        if (!stats || perf.balls === 0) continue;
        
        stats.battingInnings++;
        stats.totalRuns += perf.runs;
        stats.totalBalls += perf.balls;
        stats.fours += perf.fours;
        stats.sixes += perf.sixes;
        
        if (perf.runs === 0 && perf.out) stats.ducks++;
        if (perf.runs >= 30) stats.thirtyPlus++;
        if (!perf.out) stats.notOuts++;
        if (perf.runs > stats.highestScore) stats.highestScore = perf.runs;
        
        // Match-winning knock
        if (data.won && perf.runs >= data.teamTotal * 0.4) {
          stats.matchWinningKnocks++;
        }
        
        battingScores.get(bId)?.push(perf.runs);
        
        // Recent form (last 5)
        const recent = recentMatches.get(bId)!;
        recent.batting.push(perf.runs);
        if (recent.batting.length > 5) recent.batting.shift();
      }
    }
    
    // Process bowling performances per innings
    const bowlingData: Record<string, Map<string, { wickets: number; runs: number; balls: number; dots: number }>> = {
      first: new Map(),
      second: new Map()
    };
    
    for (const event of match.timeline) {
      const inn = event.innings as string;
      if (!bowlingData[inn]) continue;
      
      const bowId = event.bowler?.toString();
      if (bowId) {
        if (!bowlingData[inn].has(bowId)) {
          bowlingData[inn].set(bowId, { wickets: 0, runs: 0, balls: 0, dots: 0 });
        }
        const bowler = bowlingData[inn].get(bowId)!;
        
        if (event.eventType === 'run') {
          bowler.runs += event.runs;
          bowler.balls++;
        } else if (event.eventType === 'dot') {
          bowler.balls++;
          bowler.dots++;
        } else if (event.eventType === 'wicket') {
          bowler.wickets++;
          bowler.balls++;
        }
      }
    }
    
    // Update bowling stats
    for (const [inn, bowlers] of Object.entries(bowlingData)) {
      const bowlingTeam = inn === 'first' ? match.innings.first.bowlingTeam : match.innings.second.bowlingTeam;
      const won = bowlingTeam === match.winner;
      
      for (const [bowId, perf] of bowlers.entries()) {
        const stats = statsMap.get(bowId);
        if (!stats || perf.balls === 0) continue;
        
        stats.bowlingInnings++;
        stats.totalWickets += perf.wickets;
        stats.totalRunsConceded += perf.runs;
        stats.totalBallsBowled += perf.balls;
        stats.dotBalls += perf.dots;
        
        if (perf.wickets >= 3) stats.threeWicketHauls++;
        if (perf.wickets >= 4) stats.fourWicketHauls++;
        
        // Best figures
        if (perf.wickets > stats.bestFigures.wickets || 
            (perf.wickets === stats.bestFigures.wickets && perf.runs < stats.bestFigures.runs)) {
          stats.bestFigures = { wickets: perf.wickets, runs: perf.runs };
        }
        
        // Crucial wickets
        if (won && perf.wickets >= 3) {
          stats.crucialWickets++;
        }
        
        bowlingWickets.get(bowId)?.push(perf.wickets);
        
        // Recent form
        const recent = recentMatches.get(bowId)!;
        recent.bowling.push(perf.wickets);
        if (recent.bowling.length > 5) recent.bowling.shift();
      }
    }
  }
  
  // Calculate derived stats
  for (const [pid, stats] of statsMap.entries()) {
    // Batting averages
    const outs = stats.battingInnings - stats.notOuts;
    stats.battingAverage = outs > 0 ? stats.totalRuns / outs : stats.totalRuns;
    stats.strikeRate = stats.totalBalls > 0 ? (stats.totalRuns / stats.totalBalls) * 100 : 0;
    
    // Bowling averages
    stats.bowlingAverage = stats.totalWickets > 0 ? stats.totalRunsConceded / stats.totalWickets : 999;
    stats.bowlingStrikeRate = stats.totalWickets > 0 ? stats.totalBallsBowled / stats.totalWickets : 999;
    stats.economy = stats.totalBallsBowled > 0 ? stats.totalRunsConceded / (stats.totalBallsBowled / 6) : 999;
    
    // Win percentage
    stats.winPercentage = stats.matchesPlayed > 0 ? (stats.matchesWon / stats.matchesPlayed) * 100 : 0;
    
    // Consistency (coefficient of variation)
    const batScores = battingScores.get(pid) || [];
    if (batScores.length > 3) {
      const mean = batScores.reduce((a, b) => a + b, 0) / batScores.length;
      const variance = batScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / batScores.length;
      stats.battingConsistency = mean > 0 ? Math.sqrt(variance) / mean : 1;
    }
    
    const bowlWickets = bowlingWickets.get(pid) || [];
    if (bowlWickets.length > 3) {
      const mean = bowlWickets.reduce((a, b) => a + b, 0) / bowlWickets.length;
      const variance = bowlWickets.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / bowlWickets.length;
      stats.bowlingConsistency = mean > 0 ? Math.sqrt(variance) / mean : 1;
    }
    
    // Recent form
    const recent = recentMatches.get(pid)!;
    if (recent.batting.length > 0) {
      stats.recentRuns = recent.batting.reduce((a, b) => a + b, 0);
      stats.recentBattingAvg = stats.recentRuns / recent.batting.length;
    }
    if (recent.bowling.length > 0) {
      stats.recentWickets = recent.bowling.reduce((a, b) => a + b, 0);
      stats.recentBowlingAvg = stats.recentWickets / recent.bowling.length;
    }
  }
  
  return statsMap;
}

/**
 * Use Groq AI to calculate intelligent rankings based on comprehensive stats
 */
async function calculateAIRankings(statsMap: Map<string, PlayerStats>) {
  const eligibleBatsmen = Array.from(statsMap.values()).filter(s => 
    s.battingInnings >= 10 && s.totalRuns >= 50 && s.totalBalls >= 60
  );
  
  const eligibleBowlers = Array.from(statsMap.values()).filter(s => 
    s.bowlingInnings >= 10 && s.totalBallsBowled >= 60 && s.totalWickets >= 5
  );
  
  const eligibleAllRounders = Array.from(statsMap.values()).filter(s => 
    s.battingInnings >= 8 && s.bowlingInnings >= 8 && s.totalRuns >= 40 && s.totalWickets >= 4
  );
  
  console.log(`📊 Eligible players: ${eligibleBatsmen.length} batsmen, ${eligibleBowlers.length} bowlers, ${eligibleAllRounders.length} all-rounders`);
  
  // Calculate batting rankings with AI
  const battingRankings = new Map<string, number>();
  
  if (eligibleBatsmen.length > 0) {
    const batsmenData = eligibleBatsmen.map(s => ({
      name: s.playerName,
      innings: s.battingInnings,
      runs: s.totalRuns,
      average: s.battingAverage.toFixed(2),
      strikeRate: s.strikeRate.toFixed(2),
      highestScore: s.highestScore,
      thirtyPlus: s.thirtyPlus,
      matchWinningKnocks: s.matchWinningKnocks,
      consistency: (1 - s.battingConsistency).toFixed(2),
      recentForm: s.recentBattingAvg.toFixed(2),
      winRate: s.winPercentage.toFixed(1),
      motm: s.motmCount
    }));
    
    const prompt = `You are an expert cricket statistician. Rank these ${eligibleBatsmen.length} batsmen for cricket (short format, low scoring).

CRITICAL RATING SCALE (0-1000):
- 900-1000: ELITE (Only top 1-2 players, exceptional across all metrics)
- 800-900: EXCELLENT (Top 5 players, consistently outstanding)
- 700-800: VERY GOOD (Top 10 players, regular match-winners)
- 600-700: GOOD (Solid performers, reliable)
- 500-600: AVERAGE (Decent contributors)
- 400-500: BELOW AVERAGE (Inconsistent)
- Below 400: DEVELOPING (Limited impact)

Key factors (in order of importance):
1. Total runs and innings (volume matters - more matches = more reliable)
2. Batting average (consistency over time)
3. Strike rate (benchmark: 100, but not as important as runs/average)
4. Match-winning knocks (40%+ of team total in wins)
5. Consistency score (higher = more reliable)
6. Recent form (last 5 matches)
7. MOTM awards
8. Win percentage

Players data:
${JSON.stringify(batsmenData, null, 2)}

IMPORTANT RULES:
- Be STRICT with ratings. Most players should be 500-700 range.
- Only truly exceptional players (50+ runs, 25+ average, multiple match-winning knocks) deserve 800+
- Reserve 900+ for the absolute best (1-2 players max)
- Players with fewer innings (<15) should be penalized even if stats look good
- Consistency matters more than one-off performances

Return ONLY a JSON array with player names and ratings (0-1000). Format:
[{"name": "PlayerName", "rating": 650}, ...]`;

    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 4000
      });
      
      const response = completion.choices[0]?.message?.content || '[]';
      const rankings = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
      
      rankings.forEach((r: any) => {
        const player = eligibleBatsmen.find(p => p.playerName === r.name);
        if (player) {
          battingRankings.set(player.playerId, Math.round(r.rating));
        }
      });
    } catch (error) {
      console.error('AI batting ranking error:', error);
      // Fallback to formula-based
      eligibleBatsmen.forEach(s => {
        // More conservative formula
        const volumeScore = Math.min(300, s.totalRuns * 0.5); // Max 300 from runs
        const avgScore = Math.min(200, s.battingAverage * 8); // Max 200 from average
        const srScore = Math.min(100, s.strikeRate * 0.8); // Max 100 from SR
        const impactScore = (s.matchWinningKnocks * 40) + (s.motmCount * 25); // Impact
        const consistencyPenalty = s.battingConsistency * 50; // Penalty for inconsistency
        const samplePenalty = s.battingInnings < 15 ? 100 : 0; // Penalty for low sample
        
        const rating = volumeScore + avgScore + srScore + impactScore - consistencyPenalty - samplePenalty;
        battingRankings.set(s.playerId, Math.round(Math.min(1000, Math.max(200, rating))));
      });
    }
  }
  
  // Calculate bowling rankings with AI
  const bowlingRankings = new Map<string, number>();
  
  if (eligibleBowlers.length > 0) {
    const bowlersData = eligibleBowlers.map(s => ({
      name: s.playerName,
      innings: s.bowlingInnings,
      wickets: s.totalWickets,
      average: s.bowlingAverage.toFixed(2),
      economy: s.economy.toFixed(2),
      strikeRate: s.bowlingStrikeRate.toFixed(2),
      bestFigures: `${s.bestFigures.wickets}/${s.bestFigures.runs}`,
      threeWickets: s.threeWicketHauls,
      fourWickets: s.fourWicketHauls,
      crucialWickets: s.crucialWickets,
      consistency: (1 - s.bowlingConsistency).toFixed(2),
      recentForm: s.recentWickets,
      winRate: s.winPercentage.toFixed(1),
      motm: s.motmCount
    }));
    
    const prompt = `You are an expert cricket statistician. Rank these ${eligibleBowlers.length} bowlers for cricket (short format).

CRITICAL RATING SCALE (0-1000):
- 900-1000: ELITE (Only top 1-2 bowlers, exceptional across all metrics)
- 800-900: EXCELLENT (Top 5 bowlers, consistently outstanding)
- 700-800: VERY GOOD (Top 10 bowlers, regular match-winners)
- 600-700: GOOD (Solid performers, reliable)
- 500-600: AVERAGE (Decent contributors)
- 400-500: BELOW AVERAGE (Inconsistent)
- Below 400: DEVELOPING (Limited impact)

Key factors (in order of importance):
1. Total wickets and innings (volume matters MOST - more wickets = higher rating)
2. Bowling average (lower is better, benchmark: 15-20)
3. Economy rate (benchmark: 6.0, lower is better)
4. Strike rate (balls per wicket, lower is better)
5. 3+ and 4+ wicket hauls (match-winning spells)
6. Crucial wickets (3+ wickets in wins)
7. Consistency score
8. Recent form
9. MOTM awards

Players data:
${JSON.stringify(bowlersData, null, 2)}

IMPORTANT RULES:
- Be STRICT with ratings. Most players should be 500-700 range.
- Wickets are KING. A bowler with 74 wickets should be rated 850-950 if other stats are good.
- A bowler with 26 wickets should be 600-750 range depending on economy/average.
- Only truly exceptional bowlers (50+ wickets, economy <6, multiple 3+ wicket hauls) deserve 800+
- Reserve 900+ for the absolute best (1-2 bowlers max)
- Players with fewer innings (<15) should be penalized

Return ONLY a JSON array with player names and ratings (0-1000). Format:
[{"name": "PlayerName", "rating": 720}, ...]`;

    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 4000
      });
      
      const response = completion.choices[0]?.message?.content || '[]';
      const rankings = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
      
      rankings.forEach((r: any) => {
        const player = eligibleBowlers.find(p => p.playerName === r.name);
        if (player) {
          bowlingRankings.set(player.playerId, Math.round(r.rating));
        }
      });
    } catch (error) {
      console.error('AI bowling ranking error:', error);
      // Fallback
      eligibleBowlers.forEach(s => {
        // More conservative formula
        const wicketScore = Math.min(400, s.totalWickets * 5); // Max 400 from wickets
        const econScore = Math.min(150, Math.max(0, (6.5 - s.economy) * 30)); // Economy bonus
        const avgScore = Math.min(100, Math.max(0, (20 - s.bowlingAverage) * 5)); // Average bonus
        const impactScore = (s.threeWicketHauls * 50) + (s.fourWicketHauls * 80) + (s.crucialWickets * 40);
        const motmScore = s.motmCount * 25;
        const consistencyPenalty = s.bowlingConsistency * 40;
        const samplePenalty = s.bowlingInnings < 15 ? 100 : 0;
        
        const rating = wicketScore + econScore + avgScore + impactScore + motmScore - consistencyPenalty - samplePenalty;
        bowlingRankings.set(s.playerId, Math.round(Math.min(1000, Math.max(200, rating))));
      });
    }
  }
  
  // All-rounder rankings (geometric mean)
  const allRounderRankings = new Map<string, number>();
  eligibleAllRounders.forEach(s => {
    const batRating = battingRankings.get(s.playerId) || 0;
    const bowlRating = bowlingRankings.get(s.playerId) || 0;
    if (batRating > 0 && bowlRating > 0) {
      allRounderRankings.set(s.playerId, Math.round(Math.sqrt(batRating * bowlRating)));
    }
  });
  
  return { battingRankings, bowlingRankings, allRounderRankings };
}

/**
 * Main AI-powered ranking calculation
 */
export async function calculateRankings() {
  console.log('🤖 Starting AI-Powered Ranking Calculation...\n');
  
  // Extract comprehensive stats
  const statsMap = await extractPlayerStats();
  console.log(`📊 Extracted stats for ${statsMap.size} players\n`);
  
  // Calculate AI rankings
  const { battingRankings, bowlingRankings, allRounderRankings } = await calculateAIRankings(statsMap);
  
  // Get all players with current rankings
  const allPlayers = await Player.find().lean();
  
  // Update database with inactivity decay
  console.log('💾 Updating player rankings in database...\n');
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  for (const player of allPlayers) {
    const playerId = player._id.toString();
    const stats = statsMap.get(playerId);
    
    // Get new ratings
    let newBattingRating = battingRankings.get(playerId) || 0;
    let newBowlingRating = bowlingRankings.get(playerId) || 0;
    let newAllRounderRating = allRounderRankings.get(playerId) || 0;
    
    // Apply inactivity decay if player hasn't played recently
    if (stats) {
      // Check last match date from matches
      const matches = await Match.find({ 
        status: 'completed',
        $or: [
          { 'teamA.players': player._id },
          { 'teamB.players': player._id }
        ]
      }).sort({ createdAt: -1 }).limit(1).lean();
      
      if (matches.length > 0) {
        const lastMatchDate = matches[0].createdAt;
        const daysSinceLastMatch = (now.getTime() - lastMatchDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Aggressive decay: 2% per 2 days of inactivity (after 2 days)
        if (daysSinceLastMatch > 2) {
          const periodsInactive = (daysSinceLastMatch - 2) / 2; // Number of 2-day periods
          const decayFactor = Math.pow(0.98, periodsInactive);
          
          // Apply decay but don't go below minimums
          if (newBattingRating > 0) {
            newBattingRating = Math.max(100, Math.round(newBattingRating * decayFactor));
          }
          if (newBowlingRating > 0) {
            newBowlingRating = Math.max(100, Math.round(newBowlingRating * decayFactor));
          }
          if (newAllRounderRating > 0) {
            newAllRounderRating = Math.max(10, Math.round(newAllRounderRating * decayFactor));
          }
          
          console.log(`⏰ ${player.name}: ${Math.round(daysSinceLastMatch)} days inactive, applied ${((1 - decayFactor) * 100).toFixed(1)}% decay`);
        }
      }
    }
    
    // Save previous ratings before updating
    const currentBatting = player.rankings?.batting || 100;
    const currentBowling = player.rankings?.bowling || 100;
    const currentAllRounder = player.rankings?.allRounder || 10;
    
    await Player.findByIdAndUpdate(playerId, {
      $set: {
        'rankings.batting': newBattingRating,
        'rankings.bowling': newBowlingRating,
        'rankings.allRounder': newAllRounderRating,
        'rankings.previousBatting': currentBatting,
        'rankings.previousBowling': currentBowling,
        'rankings.previousAllRounder': currentAllRounder,
        'rankings.lastUpdated': new Date()
      }
    });
  }
  
  console.log('✅ AI-powered ranking calculation complete!\n');
}
