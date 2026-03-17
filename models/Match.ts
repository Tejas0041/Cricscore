import mongoose, { Schema, Document } from 'mongoose';

export interface IMatch extends Document {
  teamA: {
    id: mongoose.Types.ObjectId;
    name: string;
    players: mongoose.Types.ObjectId[];
    captain: mongoose.Types.ObjectId;
  };
  teamB: {
    id: mongoose.Types.ObjectId;
    name: string;
    players: mongoose.Types.ObjectId[];
    captain: mongoose.Types.ObjectId;
  };
  overs: number;
  tossWinner?: string;
  tossDecision?: 'bat' | 'bowl';
  innings: {
    first: {
      battingTeam: string;
      bowlingTeam: string;
      runs: number;
      wickets: number;
      overs: number;
      balls: number;
      currentBatsman?: mongoose.Types.ObjectId;
      currentBowler?: mongoose.Types.ObjectId;
      completed: boolean;
    };
    second: {
      battingTeam: string;
      bowlingTeam: string;
      runs: number;
      wickets: number;
      overs: number;
      balls: number;
      currentBatsman?: mongoose.Types.ObjectId;
      currentBowler?: mongoose.Types.ObjectId;
      completed: boolean;
    };
  };
  currentInnings: 'first' | 'second';
  status: 'upcoming' | 'live' | 'completed';
  winner?: string;
  motm?: {
    playerId: mongoose.Types.ObjectId;
    playerName: string;
    team: string;
    reason: string;
    provider: 'gemini' | 'groq';
  };
  timeline: Array<{
    over: number;
    ball: number;
    eventType: 'run' | 'wicket' | 'wide' | 'noball' | 'deadball' | 'dot';
    runs: number;
    batsman: mongoose.Types.ObjectId;
    bowler: mongoose.Types.ObjectId;
    innings: 'first' | 'second';
    timestamp: Date;
  }>;
  scoringRules: {
    single: number;
    boundary: number;
  };
  commonPlayers?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema: Schema = new Schema({
  teamA: {
    id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    name: { type: String, required: true },
    players: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    captain: { type: Schema.Types.ObjectId, ref: 'Player' },
  },
  teamB: {
    id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    name: { type: String, required: true },
    players: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    captain: { type: Schema.Types.ObjectId, ref: 'Player' },
  },
  overs: { type: Number, required: true },
  tossWinner: { type: String },
  tossDecision: { type: String, enum: ['bat', 'bowl'] },
  innings: {
    first: {
      battingTeam: { type: String },
      bowlingTeam: { type: String },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      currentBatsman: { type: Schema.Types.ObjectId, ref: 'Player' },
      currentBowler: { type: Schema.Types.ObjectId, ref: 'Player' },
      completed: { type: Boolean, default: false },
    },
    second: {
      battingTeam: { type: String },
      bowlingTeam: { type: String },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      currentBatsman: { type: Schema.Types.ObjectId, ref: 'Player' },
      currentBowler: { type: Schema.Types.ObjectId, ref: 'Player' },
      completed: { type: Boolean, default: false },
    },
  },
  currentInnings: { type: String, enum: ['first', 'second'], default: 'first' },
  status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
  winner: { type: String },
  motm: {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
    playerName: { type: String },
    team: { type: String },
    reason: { type: String },
    provider: { type: String, enum: ['gemini', 'groq'] },
  },
  timeline: [{
    over: { type: Number },
    ball: { type: Number },
    eventType: { type: String, enum: ['run', 'wicket', 'wide', 'noball', 'deadball', 'dot'] },
    runs: { type: Number },
    batsman: { type: Schema.Types.ObjectId, ref: 'Player' },
    bowler: { type: Schema.Types.ObjectId, ref: 'Player' },
    innings: { type: String, enum: ['first', 'second'] },
    timestamp: { type: Date, default: Date.now },
  }],
  scoringRules: {
    single: { type: Number, default: 1 },
    boundary: { type: Number, default: 4 },
  },
  bowlerOversLimit: { type: Number, default: 2 },
  commonPlayers: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Match || mongoose.model<IMatch>('Match', MatchSchema);
