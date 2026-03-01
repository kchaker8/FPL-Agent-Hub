import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Player from '@/lib/models/Player';
import Team from '@/lib/models/Team';
import Agent from '@/lib/models/Agent';
import { authenticateAgent } from '@/lib/utils/auth';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

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
    const { playerOutId, playerInId } = body;

    if (!playerOutId || !playerInId) {
      return errorResponse(
        'Missing fields',
        'Provide both "playerOutId" and "playerInId" in the request body.',
        400
      );
    }

    if (
      !mongoose.isValidObjectId(playerOutId) ||
      !mongoose.isValidObjectId(playerInId)
    ) {
      return errorResponse(
        'Invalid player IDs',
        'Both "playerOutId" and "playerInId" must be valid MongoDB ObjectIds.',
        400
      );
    }

    if (playerOutId === playerInId) {
      return errorResponse(
        'Same player',
        'playerOutId and playerInId cannot be the same player.',
        400
      );
    }

    // ── Check agent has a team ───────────────────────────
    const team = await Team.findOne({ agentId: agent._id, active: true });
    if (!team) {
      return errorResponse(
        'No team found',
        'You must submit a full 6-a-side squad via POST /api/team before making transfers.',
        404
      );
    }

    // ── Check weekly transfer allowance ──────────────────
    if (team.hasTransferredThisWeek) {
      return errorResponse(
        'Transfer already used',
        'You have already used your free transfer this game week. Wait for the next simulation to reset it.',
        400
      );
    }

    // ── Verify playerOut is in the squad ─────────────────
    const teamPlayerIds = team.players.map((id) => id.toString());
    if (!teamPlayerIds.includes(playerOutId)) {
      return errorResponse(
        'Player not in squad',
        `Player "${playerOutId}" is not in your current team. Use GET /api/players to check your squad.`,
        400
      );
    }

    // ── Verify playerIn is NOT already in the squad ──────
    if (teamPlayerIds.includes(playerInId)) {
      return errorResponse(
        'Player already in squad',
        `Player "${playerInId}" is already in your team. Pick a different player to bring in.`,
        400
      );
    }

    // ── Fetch both players from DB ───────────────────────
    const [playerOut, playerIn] = await Promise.all([
      Player.findById(playerOutId),
      Player.findById(playerInId),
    ]);

    if (!playerOut) {
      return errorResponse(
        'Player not found',
        `playerOutId "${playerOutId}" does not exist in the database.`,
        404
      );
    }
    if (!playerIn) {
      return errorResponse(
        'Player not found',
        `playerInId "${playerInId}" does not exist in the database.`,
        404
      );
    }

    // ── Position check ───────────────────────────────────
    if (playerOut.position !== playerIn.position) {
      return errorResponse(
        'Position mismatch',
        `Cannot swap a ${playerOut.position} (${playerOut.name}) for a ${playerIn.position} (${playerIn.name}). Transfers must be like-for-like positions.`,
        400
      );
    }

    // ── Budget check ─────────────────────────────────────
    const keptPlayerIds = teamPlayerIds.filter((id) => id !== playerOutId);
    const keptPlayers = await Player.find({ _id: { $in: keptPlayerIds } });
    const newTotalCost =
      keptPlayers.reduce((sum, p) => sum + p.price, 0) + playerIn.price;

    if (newTotalCost > MAX_BUDGET) {
      return errorResponse(
        'Over budget',
        `Swapping ${playerOut.name} (£${playerOut.price}M) for ${playerIn.name} (£${playerIn.price}M) would bring your squad total to £${newTotalCost.toFixed(1)}M, which is £${(newTotalCost - MAX_BUDGET).toFixed(1)}M over the £${MAX_BUDGET}M limit.`,
        400
      );
    }

    // ── Execute the swap ─────────────────────────────────
    const outIndex = team.players.findIndex(
      (id) => id.toString() === playerOutId
    );
    team.players[outIndex] = new mongoose.Types.ObjectId(playerInId);
    team.hasTransferredThisWeek = true;
    await team.save();

    const updatedTeam = await Team.findById(team._id).populate('players');
    const remainingBudget = parseFloat((MAX_BUDGET - newTotalCost).toFixed(1));
    await Agent.findByIdAndUpdate(agent._id, { fplBudget: remainingBudget });

    return successResponse({
      message: `Transfer complete! ${playerOut.name} out, ${playerIn.name} in.`,
      transfer: {
        out: { name: playerOut.name, position: playerOut.position, price: playerOut.price },
        in: { name: playerIn.name, position: playerIn.position, price: playerIn.price },
      },
      team: {
        players: updatedTeam!.players,
        totalCost: parseFloat(newTotalCost.toFixed(1)),
        remainingBudget,
      },
    });
  } catch (error) {
    console.error('Transfer Error:', error);
    return errorResponse('Internal Server Error', 'Failed to process transfer.', 500);
  }
}
