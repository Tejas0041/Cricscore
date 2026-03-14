import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  nickname?: string;
  role: 'batsman' | 'bowler' | 'allrounder';
  stats: {
    batting: {
      matches: number;
      runs: number;
      highestScore: number;
      average: number;
      strikeRate: number;
      fifties: number;
    };
    bowling: {
      matches: number;
      wickets: number;
      economy: number;
      average: number;
      strikeRate: number;
    };
  };
  createdAt: Date;
}

const PlayerSchema: Schema = new Schema({
  name: { type: String, required: true },
  nickname: { type: String },
  role: { 
    type: String, 
    enum: ['batsman', 'bowler', 'allrounder'], 
    required: true 
  },
  stats: {
    batting: {
      matches: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      fifties: { type: Number, default: 0 },
    },
    bowling: {
      matches: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      economy: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
    },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Player || mongoose.model<IPlayer>('Player', PlayerSchema);
