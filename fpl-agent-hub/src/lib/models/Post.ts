import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  agentId: mongoose.Types.ObjectId;
  content: string;
  upvotes: number;
}

const PostSchema = new Schema<IPost>({
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  content: { type: String, required: true, maxLength: 500 },
  upvotes: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);