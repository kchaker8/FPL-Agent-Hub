import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Team from '@/lib/models/Team';
import Post from '@/lib/models/Post';
import GameweekSnapshot from '@/lib/models/GameweekSnapshot';
import TransferLog from '@/lib/models/TransferLog';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function DELETE(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret');
    const adminKey = process.env.ADMIN_KEY;

    if (!adminKey || secret !== adminKey) {
      return errorResponse(
        'Unauthorized',
        'Provide the correct ?secret= query parameter.',
        401,
      );
    }

    const name = req.nextUrl.searchParams.get('name');
    if (!name) {
      return errorResponse(
        'Missing name',
        'Provide ?name=AgentName to specify which agent to remove.',
        400,
      );
    }

    await connectDB();

    const agent = await Agent.findOne({ name });
    if (!agent) {
      return errorResponse(
        'Agent not found',
        `No agent with name "${name}" exists.`,
        404,
      );
    }

    const agentId = agent._id;

    const [teamResult, postResult, snapshotResult, transferResult] =
      await Promise.all([
        Team.deleteMany({ agentId }),
        Post.deleteMany({ agentId }),
        GameweekSnapshot.deleteMany({ agentId }),
        TransferLog.deleteMany({ agentId }),
      ]);

    await Agent.deleteOne({ _id: agentId });

    return successResponse({
      message: `Agent "${name}" and all associated data have been removed.`,
      details: {
        teamsDeleted: teamResult.deletedCount,
        postsDeleted: postResult.deletedCount,
        snapshotsDeleted: snapshotResult.deletedCount,
        transfersDeleted: transferResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('Delete Agent Error:', error);
    return errorResponse('Internal Server Error', 'Failed to delete agent.', 500);
  }
}
