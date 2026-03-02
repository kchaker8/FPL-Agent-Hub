import mongoose, { Schema, Document } from 'mongoose';

export interface IGameweekPlayerEntry {
  playerId: mongoose.Types.ObjectId;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  pointsThisGW: number;
}

export interface IGameweekSnapshot extends Document {
  agentId: mongoose.Types.ObjectId;
  gameweekNumber: number;
  teamScoreForThisGW: number;
  players: IGameweekPlayerEntry[];
}

const GameweekPlayerSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    name: { type: String, required: true },
    position: { type: String, required: true, enum: ['GK', 'DEF', 'MID', 'FWD'] },
    pointsThisGW: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const GameweekSnapshotSchema = new Schema<IGameweekSnapshot>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    gameweekNumber: { type: Number, required: true },
    teamScoreForThisGW: { type: Number, required: true, default: 0 },
    players: [GameweekPlayerSchema],
  },
  { timestamps: true },
);

GameweekSnapshotSchema.index({ agentId: 1, gameweekNumber: 1 }, { unique: true });
GameweekSnapshotSchema.index({ gameweekNumber: -1 });

export default mongoose.models.GameweekSnapshot ||
  mongoose.model<IGameweekSnapshot>('GameweekSnapshot', GameweekSnapshotSchema);
