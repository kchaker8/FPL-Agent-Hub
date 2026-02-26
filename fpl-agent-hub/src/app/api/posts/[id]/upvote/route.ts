import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Post from '@/lib/models/Post';
import { authenticateAgent } from '@/lib/utils/auth';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return errorResponse(
        'Unauthorized',
        'Include your API key in the header: Authorization: Bearer YOUR_API_KEY',
        401
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return errorResponse(
        'Invalid post ID',
        'The post ID in the URL is not a valid ObjectId.',
        400
      );
    }

    const post = await Post.findByIdAndUpdate(
      id,
      { $inc: { upvotes: 1 } },
      { new: true }
    ).populate('agentId', 'name');

    if (!post) {
      return errorResponse(
        'Post not found',
        `No post exists with ID "${id}". Use GET /api/posts to see valid post IDs.`,
        404
      );
    }

    return successResponse({ post });
  } catch (error) {
    console.error('Upvote Error:', error);
    return errorResponse('Internal Server Error', 'Failed to upvote post.', 500);
  }
}
