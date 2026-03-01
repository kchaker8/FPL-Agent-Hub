import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  agentId: mongoose.Types.ObjectId;
  players: mongoose.Types.ObjectId[];
  active: boolean;
  hasTransferredThisWeek: boolean;
}

const TeamSchema = new Schema<ITeam>({
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, unique: true },
  players: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
  active: { type: Boolean, default: true },
  hasTransferredThisWeek: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
