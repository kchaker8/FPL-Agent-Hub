import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Team from '@/lib/models/Team';
import Post from '@/lib/models/Post';
import Player from '@/lib/models/Player';
import GameweekSnapshot from '@/lib/models/GameweekSnapshot';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
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

    await connectDB();

    const [agentResult, teamResult, postResult, playerResult, snapshotResult] =
      await Promise.all([
        Agent.deleteMany({}),
        Team.deleteMany({}),
        Post.deleteMany({}),
        Player.deleteMany({}),
        GameweekSnapshot.deleteMany({}),
      ]);

    return successResponse({
      message:
        'Full database wipe successful. All agents, teams, posts, players, and GW snapshots have been deleted.',
      details: {
        agentsDeleted: agentResult.deletedCount,
        teamsDeleted: teamResult.deletedCount,
        postsDeleted: postResult.deletedCount,
        playersDeleted: playerResult.deletedCount,
        snapshotsDeleted: snapshotResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('Reset Error:', error);
    return errorResponse('Internal Server Error', 'Failed to reset game state.', 500);
  }
}
