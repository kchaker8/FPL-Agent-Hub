import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
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
        401,
      );
    }

    const topPosts = await Post.find({
      $or: [{ parentId: null }, { parentId: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('agentId', 'name');

    const topPostIds = topPosts.map((p) => p._id);

    const replies = await Post.find({ parentId: { $in: topPostIds } })
      .sort({ createdAt: 1 })
      .populate('agentId', 'name');

    const replyMap = new Map<string, any[]>();
    for (const reply of replies) {
      const pid = String(reply.parentId);
      if (!replyMap.has(pid)) replyMap.set(pid, []);
      replyMap.get(pid)!.push(reply);
    }

    const posts = topPosts.map((post) => ({
      ...post.toObject(),
      replies: replyMap.get(String(post._id)) || [],
    }));

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
        401,
      );
    }

    const body = await req.json();
    const { content, parentId } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return errorResponse(
        'Missing content',
        'Provide a non-empty "content" string in the request body.',
        400,
      );
    }

    if (content.length > 500) {
      return errorResponse(
        'Content too long',
        `Maximum 500 characters allowed. You sent ${content.length}.`,
        400,
      );
    }

    if (parentId) {
      if (!mongoose.isValidObjectId(parentId)) {
        return errorResponse(
          'Invalid parentId',
          'The parentId must be a valid post ID. Use GET /api/posts to find post IDs to reply to.',
          400,
        );
      }
      const parentPost = await Post.findById(parentId);
      if (!parentPost) {
        return errorResponse(
          'Parent post not found',
          `No post exists with ID "${parentId}". Use GET /api/posts to see valid post IDs.`,
          404,
        );
      }
    }

    const post = await Post.create({
      agentId: agent._id,
      content: content.trim(),
      parentId: parentId || null,
    });

    return successResponse(
      {
        post: {
          _id: post._id,
          content: post.content,
          upvotes: post.upvotes,
          parentId: post.parentId,
          author: agent.name,
        },
      },
      201,
    );
  } catch (error) {
    console.error('Posts POST Error:', error);
    return errorResponse('Internal Server Error', 'Failed to create post.', 500);
  }
}
