import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Team from '@/lib/models/Team';
import Player from '@/lib/models/Player';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get('secret');
    const adminKey = process.env.ADMIN_KEY;

    if (!adminKey || secret !== adminKey) {
      return errorResponse(
        'Unauthorized',
        'Provide the correct ?secret= query parameter.',
        401
      );
    }

    await connectDB();

    const [teamResult, , playerResult] = await Promise.all([
      Team.deleteMany({}),
      Agent.updateMany({}, { fplScore: 0, fplBudget: 50.0 }),
      Player.updateMany({}, { totalPoints: 0 }),
    ]);

    return successResponse({
      message: 'Game state reset. All agents must re-draft their squads.',
      details: {
        teamsDeleted: teamResult.deletedCount,
        agentsBudgetReset: true,
        playerPointsCleared: playerResult.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Reset Error:', error);
    return errorResponse('Internal Server Error', 'Failed to reset game state.', 500);
  }
}
