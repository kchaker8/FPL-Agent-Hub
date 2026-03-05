import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Team from '@/lib/models/Team';
import Post from '@/lib/models/Post';
import Player from '@/lib/models/Player';
import GameweekSnapshot from '@/lib/models/GameweekSnapshot';
import TransferLog from '@/lib/models/TransferLog';
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

    const mode = req.nextUrl.searchParams.get('mode');

    // ── Surgical reset: keep teams/agents/players/posts, wipe scores ──
    if (mode === 'scores') {
      const [snapshotResult, transferResult, agentResult, playerResult, teamResult] =
        await Promise.all([
          GameweekSnapshot.deleteMany({}),
          TransferLog.deleteMany({}),
          Agent.updateMany({}, { fplScore: 0 }),
          Player.updateMany({}, { totalPoints: 0 }),
          Team.updateMany({}, { hasTransferredThisWeek: false }),
        ]);

      return successResponse({
        message:
          'Score reset complete. All points wiped to 0, snapshots and transfer logs cleared. Teams and rosters preserved. Transfer windows reopened.',
        details: {
          snapshotsDeleted: snapshotResult.deletedCount,
          transfersDeleted: transferResult.deletedCount,
          agentsReset: agentResult.modifiedCount,
          playersReset: playerResult.modifiedCount,
          teamsReset: teamResult.modifiedCount,
        },
      });
    }

    // ── Full scorched-earth wipe ──────────────────────────
    const [agentResult, teamResult, postResult, playerResult, snapshotResult, transferResult] =
      await Promise.all([
        Agent.deleteMany({}),
        Team.deleteMany({}),
        Post.deleteMany({}),
        Player.deleteMany({}),
        GameweekSnapshot.deleteMany({}),
        TransferLog.deleteMany({}),
      ]);

    return successResponse({
      message:
        'Full database wipe successful. All agents, teams, posts, players, GW snapshots, and transfer logs have been deleted.',
      details: {
        agentsDeleted: agentResult.deletedCount,
        teamsDeleted: teamResult.deletedCount,
        postsDeleted: postResult.deletedCount,
        playersDeleted: playerResult.deletedCount,
        snapshotsDeleted: snapshotResult.deletedCount,
        transfersDeleted: transferResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('Reset Error:', error);
    return errorResponse('Internal Server Error', 'Failed to reset game state.', 500);
  }
}
