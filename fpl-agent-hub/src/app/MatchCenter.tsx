'use client';

import { useState } from 'react';
import type { SerializedFixture, SideEvents } from '@/lib/utils/fpl';

/* ── Day grouping ──────────────────────────────────────── */

function groupByDay(fixtures: SerializedFixture[]) {
  const groups: { label: string; fixtures: SerializedFixture[] }[] = [];
  const map = new Map<string, SerializedFixture[]>();

  for (const f of fixtures) {
    const d = new Date(f.kickoffTime);
    const label = d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(f);
  }

  for (const [label, fxs] of map) {
    groups.push({ label, fixtures: fxs });
  }
  return groups;
}

/* ── Main component ────────────────────────────────────── */

export default function MatchCenter({
  fixtures,
}: {
  fixtures: SerializedFixture[];
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const days = groupByDay(fixtures);

  if (fixtures.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-zinc-400 py-10">
        No fixture data available for this game week.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <div key={day.label}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-3 px-1">
            {day.label}
          </p>

          <div className="space-y-2">
            {day.fixtures.map((f) => {
              const isOpen = expanded === f.id;
              const hasEvents =
                f.homeEvents.goals.length > 0 ||
                f.awayEvents.goals.length > 0;

              return (
                <div
                  key={f.id}
                  className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* Score row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : f.id)}
                    className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 cursor-pointer"
                  >
                    {/* Home */}
                    <div className="flex items-center gap-2.5 justify-end">
                      <span className="text-sm font-semibold text-foreground text-right truncate">
                        {f.homeTeam.name}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.homeTeam.badgeUrl}
                        alt={f.homeTeam.shortName}
                        className="w-7 h-7 object-contain"
                      />
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-2 min-w-[72px] justify-center">
                      <span className="text-lg font-extrabold tabular-nums text-foreground">
                        {f.homeScore ?? '-'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-zinc-500 font-bold">
                        –
                      </span>
                      <span className="text-lg font-extrabold tabular-nums text-foreground">
                        {f.awayScore ?? '-'}
                      </span>
                    </div>

                    {/* Away */}
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.awayTeam.badgeUrl}
                        alt={f.awayTeam.shortName}
                        className="w-7 h-7 object-contain"
                      />
                      <span className="text-sm font-semibold text-foreground truncate">
                        {f.awayTeam.name}
                      </span>
                    </div>
                  </button>

                  {/* Expanded events panel */}
                  {isOpen && hasEvents && (
                    <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-3 grid grid-cols-2 gap-4 bg-gray-50 dark:bg-zinc-800/40 text-xs">
                      <EventColumn
                        label={f.homeTeam.shortName}
                        events={f.homeEvents}
                      />
                      <EventColumn
                        label={f.awayTeam.shortName}
                        events={f.awayEvents}
                      />
                    </div>
                  )}

                  {isOpen && !hasEvents && (
                    <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-3 bg-gray-50 dark:bg-zinc-800/40 text-xs text-center text-gray-400 dark:text-zinc-500">
                      No event data recorded for this match.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Event column ──────────────────────────────────────── */

function EventColumn({
  label,
  events,
}: {
  label: string;
  events: SideEvents;
}) {
  const hasAnything =
    events.goals.length > 0 ||
    events.assists.length > 0 ||
    events.yellowCards.length > 0 ||
    events.redCards.length > 0;

  if (!hasAnything) {
    return (
      <div className="text-gray-400 dark:text-zinc-500">
        <p className="font-bold mb-1">{label}</p>
        <p className="italic">—</p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-bold text-foreground mb-1.5">{label}</p>
      {events.goals.length > 0 && (
        <div className="mb-1">
          <span className="text-gray-400 dark:text-zinc-500">⚽</span>{' '}
          {events.goals
            .map(
              (g) =>
                g.playerName + (g.count > 1 ? ` ×${g.count}` : ''),
            )
            .join(', ')}
        </div>
      )}
      {events.assists.length > 0 && (
        <div className="mb-1 text-gray-500 dark:text-zinc-400">
          <span>🎯</span>{' '}
          {events.assists
            .map(
              (a) =>
                a.playerName + (a.count > 1 ? ` ×${a.count}` : ''),
            )
            .join(', ')}
        </div>
      )}
      {events.yellowCards.length > 0 && (
        <div className="mb-1 text-yellow-600 dark:text-yellow-400">
          🟨 {events.yellowCards.join(', ')}
        </div>
      )}
      {events.redCards.length > 0 && (
        <div className="text-red-600 dark:text-red-400">
          🟥 {events.redCards.join(', ')}
        </div>
      )}
    </div>
  );
}
