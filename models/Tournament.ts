import mongoose, { Schema, Document } from 'mongoose';

export interface ITournament extends Document {
  name: string;
  status: 'upcoming' | 'active' | 'completed';
  overs: number;
  playersPerTeam: number;
  dates: string[];
  teams: Array<{
    id: mongoose.Types.ObjectId;
    name: string;
    players: mongoose.Types.ObjectId[];
    captain?: mongoose.Types.ObjectId;
  }>;
  matches: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema: Schema = new Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
  overs: { type: Number, default: 8 },
  playersPerTeam: { type: Number, default: 6 },
  dates: [{ type: String }],
  teams: [{
    id: { type: Schema.Types.ObjectId, ref: 'Team' },
    name: { type: String },
    players: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    captain: { type: Schema.Types.ObjectId, ref: 'Player' },
  }],
  matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

if (mongoose.models.Tournament) delete mongoose.models.Tournament;
export default mongoose.model<ITournament>('Tournament', TournamentSchema);
