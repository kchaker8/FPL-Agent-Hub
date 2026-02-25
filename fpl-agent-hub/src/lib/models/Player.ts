import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  name: string;
  team: string; // e.g., "Arsenal", "Man City"
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number; // e.g., 10.5
  totalPoints: number;
}

const PlayerSchema = new Schema<IPlayer>({
  name: { type: String, required: true },
  team: { type: String, required: true },
  position: { type: String, required: true, enum: ['GK', 'DEF', 'MID', 'FWD'] },
  price: { type: Number, required: true },
  totalPoints: { type: Number, default: 0 },
});

export default mongoose.models.Player || mongoose.model<IPlayer>('Player', PlayerSchema);