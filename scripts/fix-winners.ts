import dbConnect from '../lib/mongodb';
import Match from '../models/Match';

async function fixWinners() {
  await dbConnect();

  const matches = await Match.find({ status: 'completed', winner: { $exists: true, $ne: 'Tie' } });
  
  let fixed = 0;
  
  for (const match of matches) {
    // Skip super over matches (they have special logic)
    if (match.superOver?.completed) continue;
    
    const firstRuns = match.innings.first.runs;
    const secondRuns = match.innings.second.runs;
    
    // Determine batting teams - use stored value or derive from toss/teamA
    let secondBattingTeam = match.innings.second.battingTeam;
    let firstBattingTeam = match.innings.first.battingTeam;
    
    // If battingTeam not set (old matches), derive from toss or default to teamA first
    if (!firstBattingTeam || !secondBattingTeam) {
      if (match.tossWinner && match.tossDecision) {
        firstBattingTeam = match.tossDecision === 'bat' ? match.tossWinner : 
                          (match.tossWinner === match.teamA.name ? match.teamB.name : match.teamA.name);
      } else {
        // Default: teamA bats first
        firstBattingTeam = match.teamA.name;
      }
      secondBattingTeam = firstBattingTeam === match.teamA.name ? match.teamB.name : match.teamA.name;
      
      // Update the match with correct batting teams
      match.innings.first.battingTeam = firstBattingTeam;
      match.innings.first.bowlingTeam = secondBattingTeam;
      match.innings.second.battingTeam = secondBattingTeam;
      match.innings.second.bowlingTeam = firstBattingTeam;
    }
    
    let correctWinner: string;
    
    if (secondRuns > firstRuns) {
      correctWinner = secondBattingTeam;
    } else if (firstRuns > secondRuns) {
      correctWinner = firstBattingTeam;
    } else {
      correctWinner = 'Tie';
    }
    
    if (match.winner !== correctWinner || !match.innings.first.battingTeam) {
      console.log(`Fixing match ${match._id}: ${match.teamA.name} vs ${match.teamB.name}`);
      console.log(`  First innings: ${firstBattingTeam} ${firstRuns}`);
      console.log(`  Second innings: ${secondBattingTeam} ${secondRuns}`);
      console.log(`  Wrong winner: ${match.winner} → Correct: ${correctWinner}`);
      
      match.winner = correctWinner;
      await match.save();
      fixed++;
    }
  }
  
  console.log(`\nFixed ${fixed} matches`);
  process.exit(0);
}

fixWinners().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
