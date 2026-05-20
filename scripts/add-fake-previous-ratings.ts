import mongoose from 'mongoose';
import Player from '../models/Player';

const MONGODB_URI = 'mongodb+srv://tejas:tejaspawar0041@cluster.kcnvl4h.mongodb.net/cricscore?appName=Cluster';

async function addFakePreviousRatings() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const players = await Player.find({});
    
    console.log(`🔄 Adding fake previous ratings for ${players.length} players...\n`);
    
    for (const player of players) {
      // Set previous ratings to be slightly different from current
      // This will show arrows and +/- changes
      const currentBatting = player.rankings?.batting || 100;
      const currentBowling = player.rankings?.bowling || 100;
      const currentAllRounder = player.rankings?.allRounder || 10;
      
      // Randomly increase or decrease by 20-80 points
      const battingChange = Math.floor(Math.random() * 80) - 40; // -40 to +40
      const bowlingChange = Math.floor(Math.random() * 80) - 40;
      const allRounderChange = Math.floor(Math.random() * 60) - 30;
      
      const previousBatting = Math.max(100, currentBatting - battingChange);
      const previousBowling = Math.max(100, currentBowling - bowlingChange);
      const previousAllRounder = Math.max(10, currentAllRounder - allRounderChange);
      
      await Player.findByIdAndUpdate(player._id, {
        $set: {
          'rankings.previousBatting': previousBatting,
          'rankings.previousBowling': previousBowling,
          'rankings.previousAllRounder': previousAllRounder
        }
      });
      
      console.log(`${player.name}:`);
      console.log(`  Batting: ${previousBatting} → ${currentBatting} (${currentBatting - previousBatting > 0 ? '+' : ''}${currentBatting - previousBatting})`);
      console.log(`  Bowling: ${previousBowling} → ${currentBowling} (${currentBowling - previousBowling > 0 ? '+' : ''}${currentBowling - previousBowling})`);
      console.log(`  All-rounder: ${previousAllRounder} → ${currentAllRounder} (${currentAllRounder - previousAllRounder > 0 ? '+' : ''}${currentAllRounder - previousAllRounder})\n`);
    }
    
    console.log('✅ Fake previous ratings added! Now recalculate to see arrows and changes.\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addFakePreviousRatings();
