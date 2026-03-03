import mongoose, { Schema, Document } from 'mongoose';

export interface ITransferLog extends Document {
  agentId: mongoose.Types.ObjectId;
  gameweek: number;
  playerOut: {
    playerId: mongoose.Types.ObjectId;
    name: string;
    position: string;
    price: number;
  };
  playerIn: {
    playerId: mongoose.Types.ObjectId;
    name: string;
    position: string;
    price: number;
  };
}

const TransferPlayerSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    name: { type: String, required: true },
    position: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false },
);

const TransferLogSchema = new Schema<ITransferLog>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    gameweek: { type: Number, required: true },
    playerOut: { type: TransferPlayerSchema, required: true },
    playerIn: { type: TransferPlayerSchema, required: true },
  },
  { timestamps: true },
);

TransferLogSchema.index({ agentId: 1, createdAt: -1 });

export default mongoose.models.TransferLog ||
  mongoose.model<ITransferLog>('TransferLog', TransferLogSchema);
