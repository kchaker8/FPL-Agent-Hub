import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Player from '@/lib/models/Player';
import Team from '@/lib/models/Team';
import Agent from '@/lib/models/Agent';
import { authenticateAgent } from '@/lib/utils/auth';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

const REQUIRED_FORMATION: Record<string, number> = { GK: 1, DEF: 1, MID: 2, FWD: 1 };
const MAX_BUDGET = 50.0;

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
    const { playerIds } = body;

    if (!Array.isArray(playerIds) || playerIds.length !== 5) {
      return errorResponse(
        'Invalid team size',
        'Provide exactly 5 player IDs in the "playerIds" array.',
        400
      );
    }

    if (new Set(playerIds).size !== 5) {
      return errorResponse('Duplicate players', 'All 5 players must be unique.', 400);
    }

    const invalidIds = playerIds.filter((id: string) => !mongoose.isValidObjectId(id));
    if (invalidIds.length > 0) {
      return errorResponse(
        'Invalid player IDs',
        `These are not valid MongoDB ObjectIds: ${invalidIds.join(', ')}`,
        400
      );
    }

    const players = await Player.find({ _id: { $in: playerIds } });
    if (players.length !== 5) {
      const foundIds = new Set(players.map((p) => p._id.toString()));
      const missing = playerIds.filter((id: string) => !foundIds.has(id));
      return errorResponse(
        'Players not found',
        `These player IDs do not exist in our database: ${missing.join(', ')}`,
        404
      );
    }

    // ── Position validation ──────────────────────────────────
    const positionCounts: Record<string, number> = {};
    for (const p of players) {
      positionCounts[p.position] = (positionCounts[p.position] || 0) + 1;
    }

    const positionErrors: string[] = [];
    for (const [pos, required] of Object.entries(REQUIRED_FORMATION)) {
      const actual = positionCounts[pos] || 0;
      if (actual !== required) {
        positionErrors.push(`${pos}: need ${required}, got ${actual}`);
      }
    }
    if (positionErrors.length > 0) {
      return errorResponse(
        'Invalid formation',
        `Required formation is 1 GK, 1 DEF, 2 MID, 1 FWD. Problems: ${positionErrors.join('; ')}.`,
        400
      );
    }

    // ── Budget validation ────────────────────────────────────
    const totalCost = players.reduce((sum, p) => sum + p.price, 0);
    if (totalCost > MAX_BUDGET) {
      return errorResponse(
        'Over budget',
        `Total cost is £${totalCost.toFixed(1)}M, which is £${(totalCost - MAX_BUDGET).toFixed(1)}M over the £${MAX_BUDGET}M limit. Drop a premium player or find cheaper alternatives.`,
        400
      );
    }

    // ── Upsert team ──────────────────────────────────────────
    const team = await Team.findOneAndUpdate(
      { agentId: agent._id },
      { agentId: agent._id, players: playerIds, active: true },
      { upsert: true, new: true }
    ).populate('players');

    const remainingBudget = parseFloat((MAX_BUDGET - totalCost).toFixed(1));
    await Agent.findByIdAndUpdate(agent._id, { fplBudget: remainingBudget });

    return successResponse({
      message: 'Team submitted successfully!',
      team: {
        players: team.players,
        totalCost: parseFloat(totalCost.toFixed(1)),
        remainingBudget,
      },
    }, 201);
  } catch (error) {
    console.error('Team Error:', error);
    return errorResponse('Internal Server Error', 'Failed to submit team.', 500);
  }
}
