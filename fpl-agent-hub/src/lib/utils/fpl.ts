/**
 * Central FPL data utilities.
 * CURRENT_GAMEWEEK is the single source of truth for what GW
 * the app treats as "now". Override via FPL_CURRENT_GW env var.
 */

export const CURRENT_GAMEWEEK = Number(process.env.FPL_CURRENT_GW) || 27;

const FPL_BASE = 'https://fantasy.premierleague.com/api';

const ELEMENT_TYPE_MAP: Record<number, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

/* ── Types ─────────────────────────────────────────────── */

export type FPLTeamInfo = {
  name: string;
  shortName: string;
  code: number;
};

export type FPLPlayerInfo = {
  name: string;
  teamId: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
};

export type SerializedTeam = {
  name: string;
  shortName: string;
  badgeUrl: string;
};

export type SideEvents = {
  goals: { playerName: string; count: number }[];
  assists: { playerName: string; count: number }[];
  yellowCards: string[];
  redCards: string[];
};

export type SerializedFixture = {
  id: number;
  kickoffTime: string;
  homeTeam: SerializedTeam;
  awayTeam: SerializedTeam;
  homeScore: number | null;
  awayScore: number | null;
  homeEvents: SideEvents;
  awayEvents: SideEvents;
};

export type TopPerformer = {
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  gwPoints: number;
  teamBadgeUrl: string;
};

/* ── Helpers ───────────────────────────────────────────── */

export function getTeamBadgeUrl(code: number): string {
  return `https://resources.premierleague.com/premierleague/badges/70/t${code}.png`;
}

/* ── Fetchers ──────────────────────────────────────────── */

export async function fetchBootstrap(): Promise<{
  teamMap: Record<number, FPLTeamInfo>;
  playerMap: Record<number, FPLPlayerInfo>;
}> {
  const res = await fetch(`${FPL_BASE}/bootstrap-static/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`FPL bootstrap ${res.status}`);
  const data = await res.json();

  const teamMap: Record<number, FPLTeamInfo> = {};
  for (const t of data.teams) {
    teamMap[t.id] = { name: t.name, shortName: t.short_name, code: t.code };
  }

  const playerMap: Record<number, FPLPlayerInfo> = {};
  for (const el of data.elements) {
    playerMap[el.id] = {
      name: el.web_name,
      teamId: el.team,
      position: ELEMENT_TYPE_MAP[el.element_type] || 'MID',
    };
  }

  return { teamMap, playerMap };
}

export async function fetchGWFixtures(gw: number): Promise<any[]> {
  const res = await fetch(`${FPL_BASE}/fixtures/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`FPL fixtures ${res.status}`);
  const all = await res.json();
  return all
    .filter((f: any) => f.event === gw)
    .sort(
      (a: any, b: any) =>
        new Date(a.kickoff_time).getTime() -
        new Date(b.kickoff_time).getTime(),
    );
}

export async function fetchGWLive(
  gw: number,
): Promise<Record<number, number>> {
  const res = await fetch(`${FPL_BASE}/event/${gw}/live/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`FPL live ${res.status}`);
  const data = await res.json();
  const map: Record<number, number> = {};
  for (const el of data.elements) {
    map[el.id] = el.stats?.total_points ?? 0;
  }
  return map;
}

/* ── Serializers ───────────────────────────────────────── */

export function buildSerializedFixtures(
  rawFixtures: any[],
  teamMap: Record<number, FPLTeamInfo>,
  playerMap: Record<number, FPLPlayerInfo>,
): SerializedFixture[] {
  return rawFixtures.map((f) => {
    const ht = teamMap[f.team_h];
    const at = teamMap[f.team_a];

    const homeEvents: SideEvents = { goals: [], assists: [], yellowCards: [], redCards: [] };
    const awayEvents: SideEvents = { goals: [], assists: [], yellowCards: [], redCards: [] };

    for (const stat of f.stats || []) {
      const push = (entries: any[], target: SideEvents) => {
        for (const e of entries || []) {
          const name = playerMap[e.element]?.name || `#${e.element}`;
          if (stat.identifier === 'goals_scored')
            target.goals.push({ playerName: name, count: e.value });
          else if (stat.identifier === 'assists')
            target.assists.push({ playerName: name, count: e.value });
          else if (stat.identifier === 'yellow_cards')
            target.yellowCards.push(name);
          else if (stat.identifier === 'red_cards')
            target.redCards.push(name);
        }
      };
      push(stat.h, homeEvents);
      push(stat.a, awayEvents);
    }

    return {
      id: f.id,
      kickoffTime: f.kickoff_time,
      homeTeam: {
        name: ht?.name || 'Unknown',
        shortName: ht?.shortName || '???',
        badgeUrl: getTeamBadgeUrl(ht?.code || 0),
      },
      awayTeam: {
        name: at?.name || 'Unknown',
        shortName: at?.shortName || '???',
        badgeUrl: getTeamBadgeUrl(at?.code || 0),
      },
      homeScore: f.team_h_score,
      awayScore: f.team_a_score,
      homeEvents,
      awayEvents,
    };
  });
}
