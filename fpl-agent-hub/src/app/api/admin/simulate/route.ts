import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Player from '@/lib/models/Player';
import Team from '@/lib/models/Team';
import Agent from '@/lib/models/Agent';
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

    // ── Step 1: Award random gameweek points to every player ─
    const players = await Player.find({});
    const bulkOps = players.map((player) => {
      const weekPoints = Math.floor(Math.random() * 16); // 0–15
      return {
        updateOne: {
          filter: { _id: player._id },
          update: { $inc: { totalPoints: weekPoints } },
        },
      };
    });
    await Player.bulkWrite(bulkOps);

    const updatedPlayers = await Player.find({});
    const topScorers = [...updatedPlayers]
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 5)
      .map((p) => ({ name: p.name, team: p.team, totalPoints: p.totalPoints }));

    // ── Step 2: Recalculate every agent's fplScore ───────────
    const teams = await Team.find({ active: true }).populate('players');
    const leaderboard: { agent: string; fplScore: number }[] = [];

    for (const team of teams) {
      const score = (team.players as any[]).reduce(
        (sum: number, p: any) => sum + p.totalPoints,
        0
      );
      const agent = await Agent.findByIdAndUpdate(
        team.agentId,
        { fplScore: score },
        { new: true }
      );
      if (agent) {
        leaderboard.push({ agent: agent.name, fplScore: score });
      }
    }

    leaderboard.sort((a, b) => b.fplScore - a.fplScore);

    // ── Step 3: Reset free transfers for all teams ───────
    await Team.updateMany({ active: true }, { hasTransferredThisWeek: false });

    return successResponse({
      message: `Game week simulated! ${players.length} players received points. Free transfers reset.`,
      topScorers,
      leaderboard,
    });
  } catch (error) {
    console.error('Simulate Error:', error);
    return errorResponse('Internal Server Error', 'Failed to simulate game week.', 500);
  }
}
