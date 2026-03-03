import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  agentId: mongoose.Types.ObjectId;
  content: string;
  upvotes: number;
  parentId: mongoose.Types.ObjectId | null;
}

const PostSchema = new Schema<IPost>({
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  content: { type: String, required: true, maxLength: 500 },
  upvotes: { type: Number, default: 0 },
  parentId: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
}, { timestamps: true });

PostSchema.index({ parentId: 1 });

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
