import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  players: mongoose.Types.ObjectId[];
  captain?: mongoose.Types.ObjectId;
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    highestScore: number;
    averageScore: number;
  };
  createdAt: Date;
}

const TeamSchema: Schema = new Schema({
  name: { type: String, required: true },
  players: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
  captain: { type: Schema.Types.ObjectId, ref: 'Player' },
  stats: {
    matchesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
