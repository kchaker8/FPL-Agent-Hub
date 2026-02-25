import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Player from '@/lib/models/Player';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

const PLAYERS = [
  // ── GK (8) ──────────────────────────────────────────────
  { name: 'Alisson',        team: 'Liverpool',          position: 'GK',  price: 5.5 },
  { name: 'Ederson',        team: 'Man City',           position: 'GK',  price: 5.5 },
  { name: 'Raya',           team: 'Arsenal',            position: 'GK',  price: 5.5 },
  { name: 'Onana',          team: 'Man United',         position: 'GK',  price: 5.0 },
  { name: 'Martinez',       team: 'Aston Villa',        position: 'GK',  price: 5.0 },
  { name: 'Pickford',       team: 'Everton',            position: 'GK',  price: 4.5 },
  { name: 'Flekken',        team: 'Brentford',          position: 'GK',  price: 4.5 },
  { name: 'Ramsdale',       team: 'Southampton',        position: 'GK',  price: 4.0 },

  // ── DEF (12) ─────────────────────────────────────────────
  { name: 'Alexander-Arnold', team: 'Liverpool',        position: 'DEF', price: 7.5 },
  { name: 'Van Dijk',       team: 'Liverpool',          position: 'DEF', price: 6.5 },
  { name: 'Saliba',         team: 'Arsenal',            position: 'DEF', price: 6.0 },
  { name: 'Gabriel',        team: 'Arsenal',            position: 'DEF', price: 6.0 },
  { name: 'Dias',           team: 'Man City',           position: 'DEF', price: 6.0 },
  { name: 'Trippier',       team: 'Newcastle',          position: 'DEF', price: 6.0 },
  { name: 'Gvardiol',       team: 'Man City',           position: 'DEF', price: 5.5 },
  { name: 'Dalot',          team: 'Man United',         position: 'DEF', price: 5.0 },
  { name: 'Estupinan',      team: 'Brighton',           position: 'DEF', price: 5.0 },
  { name: 'Robinson',       team: 'Fulham',             position: 'DEF', price: 4.5 },
  { name: 'Konsa',          team: 'Aston Villa',        position: 'DEF', price: 4.5 },
  { name: 'Mitchell',       team: 'Crystal Palace',     position: 'DEF', price: 4.0 },

  // ── MID (18) ─────────────────────────────────────────────
  { name: 'Salah',          team: 'Liverpool',          position: 'MID', price: 13.0 },
  { name: 'Palmer',         team: 'Chelsea',            position: 'MID', price: 10.5 },
  { name: 'Saka',           team: 'Arsenal',            position: 'MID', price: 10.0 },
  { name: 'Son',            team: 'Tottenham',          position: 'MID', price: 10.0 },
  { name: 'Foden',          team: 'Man City',           position: 'MID', price: 9.5 },
  { name: 'Bruno Fernandes', team: 'Man United',        position: 'MID', price: 8.5 },
  { name: 'Odegaard',       team: 'Arsenal',            position: 'MID', price: 8.5 },
  { name: 'Gordon',         team: 'Newcastle',          position: 'MID', price: 7.5 },
  { name: 'Maddison',       team: 'Tottenham',          position: 'MID', price: 7.5 },
  { name: 'Mbeumo',         team: 'Brentford',          position: 'MID', price: 7.0 },
  { name: 'Bowen',          team: 'West Ham',           position: 'MID', price: 7.0 },
  { name: 'Eze',            team: 'Crystal Palace',     position: 'MID', price: 7.0 },
  { name: 'Madueke',        team: 'Chelsea',            position: 'MID', price: 6.5 },
  { name: 'Savio',          team: 'Man City',           position: 'MID', price: 6.5 },
  { name: 'Wissa',          team: 'Brentford',          position: 'MID', price: 6.0 },
  { name: 'Elanga',         team: 'Nottingham Forest',  position: 'MID', price: 5.5 },
  { name: 'Rogers',         team: 'Aston Villa',        position: 'MID', price: 5.5 },
  { name: 'Andreas Pereira', team: 'Fulham',            position: 'MID', price: 5.0 },

  // ── FWD (12) ─────────────────────────────────────────────
  { name: 'Haaland',        team: 'Man City',           position: 'FWD', price: 14.5 },
  { name: 'Isak',           team: 'Newcastle',          position: 'FWD', price: 8.5 },
  { name: 'Watkins',        team: 'Aston Villa',        position: 'FWD', price: 8.0 },
  { name: 'Havertz',        team: 'Arsenal',            position: 'FWD', price: 8.0 },
  { name: 'Jackson',        team: 'Chelsea',            position: 'FWD', price: 7.5 },
  { name: 'Solanke',        team: 'Tottenham',          position: 'FWD', price: 7.5 },
  { name: 'Cunha',          team: 'Wolves',             position: 'FWD', price: 7.0 },
  { name: 'Muniz',          team: 'Fulham',             position: 'FWD', price: 6.5 },
  { name: 'Johnson',        team: 'Nottingham Forest',  position: 'FWD', price: 6.0 },
  { name: 'Welbeck',        team: 'Brighton',           position: 'FWD', price: 5.5 },
  { name: 'Nketiah',        team: 'Crystal Palace',     position: 'FWD', price: 5.5 },
  { name: 'Awoniyi',        team: 'Nottingham Forest',  position: 'FWD', price: 5.0 },
] as const;

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

    await Player.deleteMany({});
    const inserted = await Player.insertMany(
      PLAYERS.map((p) => ({ ...p, totalPoints: 0 }))
    );

    const summary = {
      GK: inserted.filter((p) => p.position === 'GK').length,
      DEF: inserted.filter((p) => p.position === 'DEF').length,
      MID: inserted.filter((p) => p.position === 'MID').length,
      FWD: inserted.filter((p) => p.position === 'FWD').length,
    };

    return successResponse({
      message: `Seeded ${inserted.length} players successfully.`,
      breakdown: summary,
    }, 201);
  } catch (error) {
    console.error('Seed Error:', error);
    return errorResponse('Internal Server Error', 'Failed to seed the database.', 500);
  }
}
