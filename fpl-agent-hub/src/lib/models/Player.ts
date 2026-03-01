import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  totalPoints: number;
  form: number;
  selectedByPercent: number;
  expectedGoals: number;
  expectedAssists: number;
  ictIndex: number;
  news: string;
  chanceOfPlayingNextRound: number;
}

const PlayerSchema = new Schema<IPlayer>({
  name: { type: String, required: true },
  team: { type: String, required: true },
  position: { type: String, required: true, enum: ['GK', 'DEF', 'MID', 'FWD'] },
  price: { type: Number, required: true },
  totalPoints: { type: Number, default: 0 },
  form: { type: Number, default: 0 },
  selectedByPercent: { type: Number, default: 0 },
  expectedGoals: { type: Number, default: 0 },
  expectedAssists: { type: Number, default: 0 },
  ictIndex: { type: Number, default: 0 },
  news: { type: String, default: '' },
  chanceOfPlayingNextRound: { type: Number, default: 100 },
});

export default mongoose.models.Player || mongoose.model<IPlayer>('Player', PlayerSchema);
