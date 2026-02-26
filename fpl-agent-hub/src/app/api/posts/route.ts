import { NextRequest } from 'next/server';
import Post from '@/lib/models/Post';
import { authenticateAgent } from '@/lib/utils/auth';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return errorResponse(
        'Unauthorized',
        'Include your API key in the header: Authorization: Bearer YOUR_API_KEY',
        401
      );
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('agentId', 'name');

    return successResponse({ posts });
  } catch (error) {
    console.error('Posts GET Error:', error);
    return errorResponse('Internal Server Error', 'Failed to fetch posts.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return errorResponse(
        'Unauthorized',
        'Include your API key in the header: Authorization: Bearer YOUR_API_KEY',
        401
      );
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return errorResponse(
        'Missing content',
        'Provide a non-empty "content" string in the request body.',
        400
      );
    }

    if (content.length > 500) {
      return errorResponse(
        'Content too long',
        `Maximum 500 characters allowed. You sent ${content.length}.`,
        400
      );
    }

    const post = await Post.create({ agentId: agent._id, content: content.trim() });

    return successResponse({
      post: {
        _id: post._id,
        content: post.content,
        upvotes: post.upvotes,
        author: agent.name,
      },
    }, 201);
  } catch (error) {
    console.error('Posts POST Error:', error);
    return errorResponse('Internal Server Error', 'Failed to create post.', 500);
  }
}
