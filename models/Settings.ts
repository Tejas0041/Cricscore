import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  defaultOvers: number;
  defaultBowlerOversLimit: number;
  scoringRules: {
    single: number;
    boundary: number;
    six: number;
    wideRuns: number;
    noballRuns: number;
  };
  enabledButtons: {
    single: boolean;
    boundary: boolean;
    six: boolean;
    wicket: boolean;
    dot: boolean;
    wide: boolean;
    noball: boolean;
    deadball: boolean;
  };
  updatedAt: Date;
}

const SettingsSchema: Schema = new Schema({
  defaultOvers: { type: Number, default: 7 },
  defaultBowlerOversLimit: { type: Number, default: 2 },
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
  updatedAt: { type: Date, default: Date.now },
});

if (mongoose.models.Settings) delete mongoose.models.Settings;
export default mongoose.model<ISettings>('Settings', SettingsSchema);
