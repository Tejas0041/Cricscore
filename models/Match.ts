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
    innings: 'first' | 'second' | 'so_first' | 'so_second';
    timestamp: Date;
  }>;
  scoringRules: {
    single: number;
    boundary: number;
    six: number;
    wideRuns: number;
    noballRuns: number;
  };
  enabledButtons?: {
    single: boolean;
    boundary: boolean;
    six: boolean;
    wicket: boolean;
    dot: boolean;
    wide: boolean;
    noball: boolean;
    deadball: boolean;
  };
  commonPlayers?: mongoose.Types.ObjectId[];
  superOver?: {
    active: boolean;
    completed: boolean;
    winner?: string;
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
    overs: number;
  };
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
    innings: { type: String, enum: ['first', 'second', 'so_first', 'so_second'] },
    timestamp: { type: Date, default: Date.now },
  }],
  scoringRules: {
    single: { type: Number, default: 1 },
    boundary: { type: Number, default: 4 },
    six: { type: Number, default: 6 },
    wideRuns: { type: Number, default: 1 },
    noballRuns: { type: Number, default: 1 },
  },
  enabledButtons: {
    single: { type: Boolean, default: true },
    boundary: { type: Boolean, default: true },
    six: { type: Boolean, default: true },
    wicket: { type: Boolean, default: true },
    dot: { type: Boolean, default: true },
    wide: { type: Boolean, default: true },
    noball: { type: Boolean, default: true },
    deadball: { type: Boolean, default: true },
  },
  bowlerOversLimit: { type: Number, default: 2 },
  commonPlayers: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
  superOver: {
    active: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
    winner: { type: String },
    overs: { type: Number, default: 1 },
    currentInnings: { type: String, enum: ['first', 'second'], default: 'first' },
    innings: {
      first: {
        battingTeam: { type: String, default: '' },
        bowlingTeam: { type: String, default: '' },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 },
        currentBatsman: { type: Schema.Types.ObjectId, ref: 'Player' },
        currentBowler: { type: Schema.Types.ObjectId, ref: 'Player' },
        completed: { type: Boolean, default: false },
      },
      second: {
        battingTeam: { type: String, default: '' },
        bowlingTeam: { type: String, default: '' },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 },
        currentBatsman: { type: Schema.Types.ObjectId, ref: 'Player' },
        currentBowler: { type: Schema.Types.ObjectId, ref: 'Player' },
        completed: { type: Boolean, default: false },
      },
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Delete cached model to avoid stale schema issues (e.g. enum mismatches after schema changes)
if (mongoose.models.Match) delete mongoose.models.Match;
export default mongoose.model<IMatch>('Match', MatchSchema);
