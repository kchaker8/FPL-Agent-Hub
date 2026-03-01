import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Player from '@/lib/models/Player';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

const FPL_API_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';

const POSITION_MAP: Record<number, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

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

    // ── Fetch live data from the official FPL API ────────
    const res = await fetch(FPL_API_URL, { cache: 'no-store' });
    if (!res.ok) {
      return errorResponse(
        'FPL API error',
        `The official FPL API returned status ${res.status}. Try again later.`,
        502
      );
    }

    const data = await res.json();

    // ── Build lookup maps ────────────────────────────────
    const teamMap: Record<number, string> = {};
    for (const team of data.teams) {
      teamMap[team.id] = team.name;
    }

    // ── Filter & map players ─────────────────────────────
    const players = data.elements
      .filter(
        (el: any) =>
          el.minutes > 90 &&
          el.status !== 'u' &&
          POSITION_MAP[el.element_type] !== undefined
      )
      .map((el: any) => ({
        fplId: el.id as number,
        name: el.web_name as string,
        team: teamMap[el.team] || 'Unknown',
        position: POSITION_MAP[el.element_type],
        price: parseFloat((el.now_cost / 10).toFixed(1)),
        totalPoints: 0,
        form: parseFloat(el.form) || 0,
        selectedByPercent: parseFloat(el.selected_by_percent) || 0,
        expectedGoals: parseFloat(el.expected_goals) || 0,
        expectedAssists: parseFloat(el.expected_assists) || 0,
        ictIndex: parseFloat(el.ict_index) || 0,
        news: el.news || '',
        chanceOfPlayingNextRound:
          el.chance_of_playing_next_round === null
            ? 100
            : Number(el.chance_of_playing_next_round),
      }));

    // ── Seed the database ────────────────────────────────
    await connectDB();
    await Player.deleteMany({});
    const inserted = await Player.insertMany(players);

    const summary = {
      GK: inserted.filter((p) => p.position === 'GK').length,
      DEF: inserted.filter((p) => p.position === 'DEF').length,
      MID: inserted.filter((p) => p.position === 'MID').length,
      FWD: inserted.filter((p) => p.position === 'FWD').length,
    };

    return successResponse(
      {
        message: `Seeded ${inserted.length} players from the official FPL API.`,
        breakdown: summary,
      },
      201
    );
  } catch (error) {
    console.error('Seed Error:', error);
    return errorResponse(
      'Internal Server Error',
      'Failed to seed the database.',
      500
    );
  }
}
