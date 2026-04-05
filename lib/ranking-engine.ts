import Match from '@/models/Match';
import Player from '@/models/Player';

/**
 * Advanced ICC-Style Ranking Engine for Cricket
 * 
 * Based on actual data analysis:
 * - Average team score: 28.9 runs
 * - Median Strike Rate: 100
 * - Median Economy: 6.0
 * - Match format: 7.2 overs average
 * - Position 1-2 batsmen dominate scoring
 */

interface MatchPerformance {
  matchId: string;
  batting: {
    rating: number;
    runs: number;
    balls: number;
    strikeRate: number;
    position: number;
    out: boolean;
    teamTotal: number;
    matchResult: 'won' | 'lost' | 'tie';
    fours: number;
    sixes: number;
  } | null;
  bowling: {
    rating: number;
    wickets: number;
    runs: number;
    balls: number;
    economy: number;
    dots: number;
    matchResult: 'won' | 'lost' | 'tie';
  } | null;
  date: Date;
}

// Dynamic benchmarks from actual data
const BENCHMARKS = {
  STRIKE_RATE: 100,
  ECONOMY: 6.0,
  AVG_TEAM_SCORE: 28.9,
  AVG_RUNS_PER_INNINGS: 7.1,
  AVG_WICKETS_PER_SPELL: 1.08,
};

// ICC-style eligibility criteria
const ELIGIBILITY = {
  BATTING: {
    MIN_INNINGS: 10,        // Must have played at least 10 innings
    MIN_RUNS: 50,           // Must have scored at least 50 runs total
    MIN_BALLS: 60,          // Must have faced at least 60 balls total
  },
  BOWLING: {
    MIN_INNINGS: 10,        // Must have bowled in at least 10 innings
    MIN_BALLS: 60,          // Must have bowled at least 60 balls total
    MIN_WICKETS: 5,         // Must have taken at least 5 wickets total
  },
  ALLROUNDER: {
    MIN_BAT_INNINGS: 8,
    MIN_BOWL_INNINGS: 8,
    MIN_RUNS: 40,
    MIN_WICKETS: 4,
  }
};

/**
 * Calculate batting rating for a single match performance
 */
function calculateBattingRating(
  runs: number,
  balls: number,
  fours: number,
  sixes: number,
  out: boolean,
  position: number,
  teamTotal: number,
  matchResult: 'won' | 'lost' | 'tie',
  oppBowlingStrength: number
): number {
  if (balls === 0) return 0;

  const strikeRate = (runs / balls) * 100;
  
  // 1. BASE SCORE (0-650 points)
  // Runs contribution is most important
  const runsProportion = teamTotal > 0 ? runs / teamTotal : 0;
  const runsComponent = Math.min(450, runsProportion * 450); // Increased from 400
  
  const srRatio = strikeRate / BENCHMARKS.STRIKE_RATE;
  const srComponent = Math.min(200, srRatio * 150); // Reduced from 200
  
  const baseScore = runsComponent + srComponent;
  
  // 2. CONTEXT MULTIPLIERS (0-280 points)
  let contextBonus = 0;
  
  // Match result bonus
  if (matchResult === 'won') contextBonus += 60; // Reduced from 80
  else if (matchResult === 'tie') contextBonus += 30; // Reduced from 40
  
  // Pressure situation bonus
  if (matchResult === 'won' && runs >= teamTotal * 0.4) {
    contextBonus += 50; // Match-winning knock (reduced from 60)
  } else if (matchResult === 'won' && runs >= teamTotal * 0.25) {
    contextBonus += 30; // Contributing to win (reduced from 40)
  }
  
  // Not out bonus (only for substantial innings)
  if (!out && balls >= 8 && runs >= 10) contextBonus += 25; // Reduced from 30
  
  // Boundary impact
  const boundaryBonus = Math.min(70, (fours * 6) + (sixes * 10)); // Reduced from 8 and 12
  contextBonus += boundaryBonus;
  
  // 3. OPPOSITION QUALITY (0-50 points) - Reduced
  const oppQuality = Math.min(50, (oppBowlingStrength / 500) * 50);
  
  // 4. BATTING POSITION FACTOR
  let positionMultiplier = 1.0;
  if (position === 1 || position === 2) positionMultiplier = 1.08; // Reduced from 1.1
  else if (position === 5 || position === 6) positionMultiplier = 0.92; // Increased from 0.9
  
  // 5. CONSISTENCY BONUS (for substantial innings)
  let consistencyBonus = 0;
  if (runs >= 20 && balls >= 12) consistencyBonus = 35; // Increased threshold
  else if (runs >= 15 && balls >= 10) consistencyBonus = 25; // Increased from 30
  else if (runs >= 10 && balls >= 8) consistencyBonus = 15;
  
  const totalRating = (baseScore + contextBonus + oppQuality + consistencyBonus) * positionMultiplier;
  
  return Math.min(1000, Math.max(0, totalRating));
}

/**
 * Calculate bowling rating for a single match performance
 */
function calculateBowlingRating(
  wickets: number,
  runs: number,
  balls: number,
  dots: number,
  matchResult: 'won' | 'lost' | 'tie',
  oppBattingStrength: number,
  dismissedBatsmenRatings: number[]
): number {
  if (balls === 0) return 0;

  const economy = runs / (balls / 6);
  
  // 1. BASE SCORE (0-700 points) - Increased wicket value
  // Wickets are the most important factor in bowling
  const wicketsComponent = Math.min(600, wickets * 180); // Increased from 150 to 180
  
  const econDiff = BENCHMARKS.ECONOMY - economy;
  const econComponent = Math.min(100, Math.max(-50, econDiff * 40)); // Reduced from 50 to 40
  
  const baseScore = wicketsComponent + econComponent;
  
  // 2. CONTEXT MULTIPLIERS (0-250 points)
  let contextBonus = 0;
  
  // Match result bonus
  if (matchResult === 'won') contextBonus += 60; // Reduced from 80
  else if (matchResult === 'tie') contextBonus += 30; // Reduced from 40
  
  // Dot ball gold - important in cricket
  const dotBonus = Math.min(60, dots * 6); // Reduced from 8 to 6
  contextBonus += dotBonus;
  
  // Wicket-taking bonus (extra reward for multiple wickets)
  if (wickets >= 4) contextBonus += 80; // Increased
  else if (wickets >= 3) contextBonus += 50; // Increased from 60
  else if (wickets >= 2) contextBonus += 25; // Reduced from 30
  
  // Economy excellence bonus
  if (economy <= 3.0 && balls >= 6) contextBonus += 50; // Increased
  else if (economy <= 4.0 && balls >= 6) contextBonus += 35; // Increased from 40
  else if (economy <= 5.0 && balls >= 6) contextBonus += 20;
  
  // 3. OPPOSITION QUALITY (0-50 points) - Reduced impact
  const oppQuality = Math.min(50, (oppBattingStrength / 500) * 50);
  
  const totalRating = baseScore + contextBonus + oppQuality;
  
  return Math.min(1000, Math.max(0, totalRating));
}

/**
 * Calculate weighted moving average with time decay and consistency bonus
 */
function calculateWeightedAverage(performances: { rating: number; date: Date }[]): number {
  if (performances.length === 0) return 0;
  
  // Sort by date (most recent first)
  const sorted = performances.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // Take last 20 matches
  const recent = sorted.slice(0, 20);
  
  let totalWeightedRating = 0;
  let totalWeight = 0;
  
  recent.forEach((perf, index) => {
    let weight = 1.0;
    
    // Recency weight
    if (index < 5) weight = 1.0;
    else if (index < 10) weight = 0.8;
    else if (index < 15) weight = 0.6;
    else weight = 0.4;
    
    // Extra boost for last 3 matches (recent form)
    if (index < 3) weight *= 1.2;
    
    totalWeightedRating += perf.rating * weight;
    totalWeight += weight;
  });
  
  const avgRating = totalWeight > 0 ? totalWeightedRating / totalWeight : 0;
  
  // Apply sample size penalty for players with fewer matches
  // This prevents players with 1-2 good innings from topping the charts
  // Gradually increases from 0.5 at 1 match to 1.0 at 15+ matches
  const matchCount = performances.length;
  let sampleSizeFactor: number;
  
  if (matchCount >= 15) {
    sampleSizeFactor = 1.0;
  } else if (matchCount >= 10) {
    sampleSizeFactor = 0.85 + (matchCount - 10) * 0.03; // 0.85 to 1.0
  } else {
    sampleSizeFactor = 0.5 + (matchCount * 0.035); // 0.5 to 0.85
  }
  
  // Calculate consistency bonus (reward players with stable performances)
  const ratings = recent.map(p => p.rating);
  const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
  
  // Consistency factor: Lower CV = more consistent = higher bonus (0.95 to 1.05)
  const consistencyFactor = Math.max(0.95, Math.min(1.05, 1.05 - (coefficientOfVariation * 0.1)));
  
  return avgRating * sampleSizeFactor * consistencyFactor;
}

/**
 * Main ranking calculation function
 * Processes ALL completed matches and updates player rankings in DB
 */
export async function calculateRankings() {
  const players = await Player.find().lean();
  const allMatches = await Match.find({ status: 'completed' }).sort({ createdAt: 1 }).lean();
  
  // Store all performances per player
  const playerPerformances: Record<string, MatchPerformance[]> = {};
  players.forEach(p => {
    playerPerformances[p._id.toString()] = [];
  });
  
  // Process each match
  for (const match of allMatches) {
    // Determine match result for each team
    const teamAResult = match.winner === match.teamA.name ? 'won' : (match.winner === 'Tie' ? 'tie' : 'lost');
    const teamBResult = match.winner === match.teamB.name ? 'won' : (match.winner === 'Tie' ? 'tie' : 'lost');
    
    // Calculate team totals
    const teamATotal = match.innings.first.battingTeam === match.teamA.name 
      ? match.innings.first.runs 
      : match.innings.second.runs;
    const teamBTotal = match.innings.first.battingTeam === match.teamB.name 
      ? match.innings.first.runs 
      : match.innings.second.runs;
    
    // Process batting performances
    const inningsData: Record<string, {
      batsmen: Record<string, { runs: number; balls: number; fours: number; sixes: number; out: boolean }>;
      battingTeam: string;
      teamTotal: number;
      matchResult: 'won' | 'lost' | 'tie';
    }> = {
      first: { 
        batsmen: {}, 
        battingTeam: match.innings.first.battingTeam, 
        teamTotal: match.innings.first.runs,
        matchResult: match.innings.first.battingTeam === match.teamA.name ? teamAResult : teamBResult
      },
      second: { 
        batsmen: {}, 
        battingTeam: match.innings.second.battingTeam, 
        teamTotal: match.innings.second.runs,
        matchResult: match.innings.second.battingTeam === match.teamA.name ? teamAResult : teamBResult
      }
    };
    
    // Process timeline for batting
    for (const event of match.timeline) {
      const inn = event.innings as string;
      if (!inningsData[inn]) continue;
      
      const bId = event.batsman?.toString();
      if (bId) {
        if (!inningsData[inn].batsmen[bId]) {
          inningsData[inn].batsmen[bId] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
        }
        
        if (event.eventType === 'run') {
          inningsData[inn].batsmen[bId].runs += event.runs;
          inningsData[inn].batsmen[bId].balls++;
          if (event.runs === 4) inningsData[inn].batsmen[bId].fours++;
          if (event.runs === 6) inningsData[inn].batsmen[bId].sixes++;
        } else if (event.eventType === 'dot') {
          inningsData[inn].batsmen[bId].balls++;
        } else if (event.eventType === 'wicket') {
          inningsData[inn].batsmen[bId].balls++;
          inningsData[inn].batsmen[bId].out = true;
        }
      }
    }
    
    // Calculate batting ratings
    for (const [inn, data] of Object.entries(inningsData)) {
      let position = 1;
      const sortedBatsmen = Object.entries(data.batsmen).sort((a, b) => b[1].balls - a[1].balls);
      
      for (const [bId, stats] of sortedBatsmen) {
        if (stats.balls === 0) continue;
        
        const oppStrength = 400;
        
        const rating = calculateBattingRating(
          stats.runs,
          stats.balls,
          stats.fours,
          stats.sixes,
          stats.out,
          position,
          data.teamTotal,
          data.matchResult,
          oppStrength
        );
        
        if (!playerPerformances[bId]) continue;
        
        const existingPerf = playerPerformances[bId].find(p => p.matchId === match._id.toString());
        if (existingPerf) {
          existingPerf.batting = {
            rating,
            runs: stats.runs,
            balls: stats.balls,
            strikeRate: (stats.runs / stats.balls) * 100,
            position,
            out: stats.out,
            teamTotal: data.teamTotal,
            matchResult: data.matchResult,
            fours: stats.fours,
            sixes: stats.sixes
          };
        } else {
          playerPerformances[bId].push({
            matchId: match._id.toString(),
            batting: {
              rating,
              runs: stats.runs,
              balls: stats.balls,
              strikeRate: (stats.runs / stats.balls) * 100,
              position,
              out: stats.out,
              teamTotal: data.teamTotal,
              matchResult: data.matchResult,
              fours: stats.fours,
              sixes: stats.sixes
            },
            bowling: null,
            date: match.createdAt
          });
        }
        
        position++;
      }
    }
    
    // Process bowling performances
    const bowlingData: Record<string, Record<string, { wickets: number; runs: number; balls: number; dots: number }>> = {
      first: {},
      second: {}
    };
    
    for (const event of match.timeline) {
      const inn = event.innings as string;
      if (!bowlingData[inn]) continue;
      
      const bowId = event.bowler?.toString();
      if (bowId) {
        if (!bowlingData[inn][bowId]) {
          bowlingData[inn][bowId] = { wickets: 0, runs: 0, balls: 0, dots: 0 };
        }
        
        if (event.eventType === 'run') {
          bowlingData[inn][bowId].runs += event.runs;
          bowlingData[inn][bowId].balls++;
        } else if (event.eventType === 'dot') {
          bowlingData[inn][bowId].balls++;
          bowlingData[inn][bowId].dots++;
        } else if (event.eventType === 'wicket') {
          bowlingData[inn][bowId].wickets++;
          bowlingData[inn][bowId].balls++;
        }
      }
    }
    
    // Calculate bowling ratings
    for (const [inn, bowlers] of Object.entries(bowlingData)) {
      const bowlingTeam = inn === 'first' ? match.innings.first.bowlingTeam : match.innings.second.bowlingTeam;
      const matchResult = (bowlingTeam === match.teamA.name ? teamAResult : teamBResult) as 'won' | 'lost' | 'tie';
      
      for (const [bowId, stats] of Object.entries(bowlers)) {
        if (stats.balls === 0) continue;
        
        const oppStrength = 400;
        const dismissedRatings: number[] = [];
        
        const rating = calculateBowlingRating(
          stats.wickets,
          stats.runs,
          stats.balls,
          stats.dots,
          matchResult,
          oppStrength,
          dismissedRatings
        );
        
        if (!playerPerformances[bowId]) continue;
        
        const existingPerf = playerPerformances[bowId].find(p => p.matchId === match._id.toString());
        if (existingPerf) {
          existingPerf.bowling = {
            rating,
            wickets: stats.wickets,
            runs: stats.runs,
            balls: stats.balls,
            economy: stats.runs / (stats.balls / 6),
            dots: stats.dots,
            matchResult
          };
        } else {
          playerPerformances[bowId].push({
            matchId: match._id.toString(),
            batting: null,
            bowling: {
              rating,
              wickets: stats.wickets,
              runs: stats.runs,
              balls: stats.balls,
              economy: stats.runs / (stats.balls / 6),
              dots: stats.dots,
              matchResult
            },
            date: match.createdAt
          });
        }
      }
    }
  }
  
  // Calculate final ratings for each player and update DB
  for (const player of players) {
    const pId = player._id.toString();
    const performances = playerPerformances[pId];
    
    if (!performances || performances.length === 0) continue;
    
    // Extract batting and bowling performances
    const battingPerfs = performances
      .filter(p => p.batting !== null)
      .map(p => ({ rating: p.batting!.rating, date: p.date }));
    
    const bowlingPerfs = performances
      .filter(p => p.bowling !== null)
      .map(p => ({ rating: p.bowling!.rating, date: p.date }));
    
    // Calculate total stats for eligibility check
    const totalRuns = performances.reduce((sum, p) => sum + (p.batting?.runs || 0), 0);
    const totalBalls = performances.reduce((sum, p) => sum + (p.batting?.balls || 0), 0);
    const totalWickets = performances.reduce((sum, p) => sum + (p.bowling?.wickets || 0), 0);
    const totalBallsBowled = performances.reduce((sum, p) => sum + (p.bowling?.balls || 0), 0);
    
    // Check batting eligibility
    let battingRating = 0;
    if (battingPerfs.length >= ELIGIBILITY.BATTING.MIN_INNINGS && 
        totalRuns >= ELIGIBILITY.BATTING.MIN_RUNS &&
        totalBalls >= ELIGIBILITY.BATTING.MIN_BALLS) {
      battingRating = calculateWeightedAverage(battingPerfs);
    }
    
    // Check bowling eligibility
    let bowlingRating = 0;
    if (bowlingPerfs.length >= ELIGIBILITY.BOWLING.MIN_INNINGS && 
        totalBallsBowled >= ELIGIBILITY.BOWLING.MIN_BALLS &&
        totalWickets >= ELIGIBILITY.BOWLING.MIN_WICKETS) {
      bowlingRating = calculateWeightedAverage(bowlingPerfs);
    }
    
    // All-rounder rating (geometric mean) - stricter eligibility
    let allRounderRating = 0;
    if (battingPerfs.length >= ELIGIBILITY.ALLROUNDER.MIN_BAT_INNINGS && 
        bowlingPerfs.length >= ELIGIBILITY.ALLROUNDER.MIN_BOWL_INNINGS &&
        totalRuns >= ELIGIBILITY.ALLROUNDER.MIN_RUNS &&
        totalWickets >= ELIGIBILITY.ALLROUNDER.MIN_WICKETS) {
      allRounderRating = Math.sqrt(battingRating * bowlingRating);
    }
    
    // Update player rankings in database
    await Player.findByIdAndUpdate(pId, {
      $set: {
        'rankings.batting': Math.round(battingRating),
        'rankings.bowling': Math.round(bowlingRating),
        'rankings.allRounder': parseFloat(allRounderRating.toFixed(2)),
        'rankings.lastUpdated': new Date()
      }
    });
  }
}
