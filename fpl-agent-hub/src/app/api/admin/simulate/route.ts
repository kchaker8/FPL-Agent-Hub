import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Player from '@/lib/models/Player';
import Team from '@/lib/models/Team';
import Agent from '@/lib/models/Agent';
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

    const gw = req.nextUrl.searchParams.get('gw');
    await connectDB();

    // ── Build per-player GW points map ──────────────────
    const players = await Player.find({});
    const gwPointsMap: Record<string, number> = {};
    let mode: string;

    if (gw) {
      mode = `GW${gw} (live)`;

      const res = await fetch(
        `https://fantasy.premierleague.com/api/event/${gw}/live/`,
        { cache: 'no-store' },
      );

      if (!res.ok) {
        return errorResponse(
          'FPL API error',
          `The FPL live endpoint for GW${gw} returned status ${res.status}. Check the game week number is valid.`,
          502,
        );
      }

      const data = await res.json();
      const fplPointsMap: Record<number, number> = {};
      for (const el of data.elements) {
        fplPointsMap[el.id] = el.stats?.total_points ?? 0;
      }

      for (const p of players) {
        if (fplPointsMap[p.fplId] !== undefined) {
          gwPointsMap[p._id.toString()] = fplPointsMap[p.fplId];
        }
      }
    } else {
      mode = 'random';
      for (const p of players) {
        gwPointsMap[p._id.toString()] = Math.floor(Math.random() * 16);
      }
    }

    // ── Apply GW points to player totalPoints ───────────
    const bulkOps = Object.entries(gwPointsMap).map(([id, pts]) => ({
      updateOne: {
        filter: { _id: id },
        update: { $inc: { totalPoints: pts } },
      },
    }));

    if (bulkOps.length > 0) {
      await Player.bulkWrite(bulkOps);
    }

    // ── Determine GW number ─────────────────────────────
    let snapshotGW: number;
    if (gw) {
      snapshotGW = parseInt(gw, 10);
    } else {
      const lastSnapshot = await GameweekSnapshot.findOne()
        .sort({ gameweekNumber: -1 })
        .lean();
      snapshotGW = lastSnapshot
        ? (lastSnapshot as any).gameweekNumber + 1
        : 1;
    }

    // ── Create snapshots ─────────────────────────────────
    const teams = await Team.find({ active: true }).populate('players');
    const snapshotDocs: any[] = [];

    for (const team of teams) {
      const populatedPlayers = (team.players as any[]).filter(Boolean);

      const snapshotPlayers = populatedPlayers.map((p: any) => ({
        playerId: p._id,
        name: p.name,
        position: p.position,
        pointsThisGW: gwPointsMap[p._id.toString()] || 0,
      }));

      const teamGWScore = snapshotPlayers.reduce(
        (sum: number, sp: any) => sum + sp.pointsThisGW,
        0,
      );

      snapshotDocs.push({
        agentId: team.agentId,
        gameweekNumber: snapshotGW,
        teamScoreForThisGW: teamGWScore,
        players: snapshotPlayers,
      });
    }

    if (snapshotDocs.length > 0) {
      await GameweekSnapshot.insertMany(snapshotDocs);
    }

    // ── Recalculate agent scores from snapshot history ───
    const scoreSums = await GameweekSnapshot.aggregate([
      { $group: { _id: '$agentId', totalScore: { $sum: '$teamScoreForThisGW' } } },
    ]);
    const scoreMap = new Map(
      scoreSums.map((s: any) => [String(s._id), s.totalScore as number]),
    );

    const leaderboard: { agent: string; fplScore: number }[] = [];
    for (const team of teams) {
      const correctScore = scoreMap.get(String(team.agentId)) || 0;
      const agent = await Agent.findByIdAndUpdate(
        team.agentId,
        { fplScore: correctScore },
        { new: true },
      );
      if (agent) {
        leaderboard.push({ agent: agent.name, fplScore: correctScore });
      }
    }

    leaderboard.sort((a, b) => b.fplScore - a.fplScore);

    // ── Top scorers this GW ─────────────────────────────
    const topScorers = players
      .filter((p) => gwPointsMap[p._id.toString()] !== undefined)
      .map((p) => ({
        name: p.name,
        team: p.team,
        gwPoints: gwPointsMap[p._id.toString()],
      }))
      .sort((a, b) => b.gwPoints - a.gwPoints)
      .slice(0, 5);

    // ── Reset free transfers ────────────────────────────
    await Team.updateMany({ active: true }, { hasTransferredThisWeek: false });

    return successResponse({
      message: `Game week ${snapshotGW} simulated (${mode})! ${Object.keys(gwPointsMap).length} players received points. Free transfers reset.`,
      gameweek: snapshotGW,
      topScorers,
      leaderboard,
    });
  } catch (error) {
    console.error('Simulate Error:', error);
    return errorResponse(
      'Internal Server Error',
      'Failed to simulate game week.',
      500,
    );
  }
}
