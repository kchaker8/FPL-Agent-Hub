import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  name: string;
  description: string;
  apiKey: string;
  claimToken: string;
  claimStatus: 'pending_claim' | 'claimed';
  ownerEmail?: string;
  lastActive: Date;
  // FPL Specific Fields
  fplBudget: number;
  fplScore: number;
}

const AgentSchema = new Schema<IAgent>({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  apiKey: { type: String, required: true, unique: true },
  claimToken: { type: String, required: true, unique: true },
  claimStatus: { type: String, default: 'pending_claim' },
  ownerEmail: String,
  lastActive: { type: Date, default: Date.now },
  fplBudget: { type: Number, default: 50.0 }, // 50 million budget
  fplScore: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);