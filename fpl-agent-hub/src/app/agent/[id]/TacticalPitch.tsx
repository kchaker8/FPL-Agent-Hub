'use client';

import { useState } from 'react';

/* ── Types ─────────────────────────────────────────────── */

type PlayerMetrics = {
  price: number;
  form: number;
  expectedGoals: number;
  expectedAssists: number;
  ictIndex: number;
  news: string;
  chanceOfPlayingNextRound: number;
};

type SnapshotPlayer = {
  playerId: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  pointsThisGW: number;
};

type Snapshot = {
  gameweekNumber: number;
  teamScoreForThisGW: number;
  players: SnapshotPlayer[];
};

type LivePlayer = {
  _id: string;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  totalPoints: number;
};

type DisplayPlayer = {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  points: number;
};

type TacticalPitchProps = {
  livePlayers: LivePlayer[];
  snapshots: Snapshot[];
  playerMetrics: Record<string, PlayerMetrics>;
};

/* ── Constants ─────────────────────────────────────────── */

const POSITION_COLOR: Record<string, string> = {
  GK: 'bg-amber-400 text-amber-950',
  DEF: 'bg-sky-400 text-sky-950',
  MID: 'bg-fpl-green text-fpl-purple',
  FWD: 'bg-fpl-pink text-white',
};

/* ── Main Component ────────────────────────────────────── */

export default function TacticalPitch({
  livePlayers,
  snapshots,
  playerMetrics,
}: TacticalPitchProps) {
  const hasSnapshots = snapshots.length > 0;

  // gwIndex 0..N-1 = historical GWs, N = current squad
  const [gwIndex, setGwIndex] = useState(
    hasSnapshots ? snapshots.length - 1 : 0,
  );

  const isLiveView = !hasSnapshots || gwIndex >= snapshots.length;
  const isLatestGW = hasSnapshots && gwIndex === snapshots.length - 1;
  const showTrafficLights = isLatestGW || isLiveView;

  const canGoLeft = hasSnapshots && gwIndex > 0;
  const canGoRight = hasSnapshots && gwIndex < snapshots.length;

  let displayPlayers: DisplayPlayer[];
  let gwLabel: string;
  let gwScore: number;

  if (isLiveView) {
    displayPlayers = livePlayers.map((p) => ({
      id: p._id,
      name: p.name,
      position: p.position,
      points: p.totalPoints,
    }));
    gwLabel = 'Current Squad';
    gwScore = livePlayers.reduce((sum, p) => sum + p.totalPoints, 0);
  } else {
    const snap = snapshots[gwIndex];
    displayPlayers = snap.players.map((p) => ({
      id: p.playerId,
      name: p.name,
      position: p.position,
      points: p.pointsThisGW,
    }));
    gwLabel = `Gameweek ${snap.gameweekNumber}`;
    gwScore = snap.teamScoreForThisGW;
  }

  const gk = displayPlayers.filter((p) => p.position === 'GK');
  const def = displayPlayers.filter((p) => p.position === 'DEF');
  const mid = displayPlayers.filter((p) => p.position === 'MID');
  const fwd = displayPlayers.filter((p) => p.position === 'FWD');

  if (livePlayers.length === 0 && !hasSnapshots) {
    return (
      <div className="bg-pitch rounded-xl p-10 text-center text-white/70">
        <p className="text-3xl mb-3">🚧</p>
        <p className="font-medium text-white">No team selected yet</p>
        <p className="text-sm mt-1 text-white/50">
          This agent hasn&apos;t picked their 6-a-side squad.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── GW Navigation Header ──────────────────────── */}
      <div className="flex items-center justify-center gap-6 bg-fpl-purple rounded-t-xl py-4 px-4">
        <button
          onClick={() => setGwIndex((i) => Math.max(0, i - 1))}
          disabled={!canGoLeft}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            canGoLeft
              ? 'bg-white/10 text-white hover:bg-fpl-green hover:text-fpl-purple'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
          aria-label="Previous game week"
        >
          ◀
        </button>

        <div className="text-center min-w-[150px]">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">
            {gwLabel}
          </p>
          <p className="text-fpl-green font-extrabold text-3xl leading-tight">
            {gwScore}
            <span className="text-sm font-bold ml-1 text-fpl-green/70">pts</span>
          </p>
        </div>

        <button
          onClick={() =>
            setGwIndex((i) => Math.min(snapshots.length, i + 1))
          }
          disabled={!canGoRight}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            canGoRight
              ? 'bg-white/10 text-white hover:bg-fpl-green hover:text-fpl-purple'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
          aria-label="Next game week"
        >
          ▶
        </button>
      </div>

      {/* ── Pitch ─────────────────────────────────────── */}
      <div className="relative rounded-b-xl" style={{ aspectRatio: '3 / 4' }}>
        {/* Background layer — clipped for rounded corners */}
        <div className="absolute inset-0 bg-pitch rounded-b-xl overflow-hidden">
          {/* Mowing stripes */}
          <div className="absolute inset-0 opacity-[0.07]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[12.5%]"
                style={{
                  background: i % 2 === 0 ? 'transparent' : 'white',
                }}
              />
            ))}
          </div>

          {/* Pitch markings */}
          <div className="absolute inset-4 border-2 border-white/30 rounded-sm">
            <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/40" />
            <div className="absolute top-0 left-[20%] right-[20%] h-[16%] border-b-2 border-x-2 border-white/30" />
            <div className="absolute bottom-0 left-[20%] right-[20%] h-[16%] border-t-2 border-x-2 border-white/30" />
          </div>
        </div>

        {/* Player layer — overflow visible for tooltips */}
        <div className="absolute inset-0">
          {/* FWD row */}
          <div className="absolute top-[10%] left-0 right-0 flex justify-center gap-6">
            {fwd.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                metrics={playerMetrics[p.id]}
                showTrafficLight={showTrafficLights}
                tooltipBelow
              />
            ))}
          </div>

          {/* MID row */}
          <div className="absolute top-[35%] left-0 right-0 flex justify-center gap-10">
            {mid.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                metrics={playerMetrics[p.id]}
                showTrafficLight={showTrafficLights}
                tooltipBelow
              />
            ))}
          </div>

          {/* DEF row */}
          <div className="absolute top-[58%] left-0 right-0 flex justify-center gap-10">
            {def.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                metrics={playerMetrics[p.id]}
                showTrafficLight={showTrafficLights}
              />
            ))}
          </div>

          {/* GK row */}
          <div className="absolute top-[80%] left-0 right-0 flex justify-center gap-6">
            {gk.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                metrics={playerMetrics[p.id]}
                showTrafficLight={showTrafficLights}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Player Card ───────────────────────────────────────── */

function PlayerCard({
  player,
  metrics,
  showTrafficLight,
  tooltipBelow = false,
}: {
  player: DisplayPlayer;
  metrics?: PlayerMetrics;
  showTrafficLight: boolean;
  tooltipBelow?: boolean;
}) {
  const chance = metrics?.chanceOfPlayingNextRound ?? 100;

  let ringClasses = '';
  if (showTrafficLight) {
    if (chance === 0) {
      ringClasses =
        'ring-2 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    } else if (chance < 100) {
      ringClasses =
        'ring-2 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]';
    } else {
      ringClasses =
        'ring-2 ring-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]';
    }
  }

  const tooltipPos = tooltipBelow
    ? 'top-full mt-2 left-1/2 -translate-x-1/2'
    : '-top-2 left-1/2 -translate-x-1/2 -translate-y-full';

  return (
    <div
      className="group relative flex flex-col items-center text-center w-20 cursor-pointer outline-none"
      tabIndex={0}
    >
      {/* Kit circle */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-shadow ${POSITION_COLOR[player.position]} ${ringClasses}`}
      >
        {player.position}
      </div>

      {/* Name */}
      <p className="text-white text-xs font-semibold mt-1.5 drop-shadow-md leading-tight truncate w-full">
        {player.name}
      </p>

      {/* Points dark box */}
      <div className="mt-1 bg-fpl-purple/90 text-white text-[11px] font-bold px-3 py-0.5 rounded-sm min-w-[32px]">
        {player.points}
      </div>

      {/* Glassmorphism tooltip */}
      {metrics && (
        <div
          className={`absolute ${tooltipPos} w-44 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-focus:opacity-100 group-focus:scale-100 transition-all duration-200 pointer-events-none z-50`}
        >
          <div className="bg-black/50 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl text-left text-xs space-y-1.5">
            <MetricRow label="Price" value={`£${metrics.price}M`} />
            <MetricRow label="Form" value={metrics.form.toFixed(1)} />
            <MetricRow
              label="xG"
              value={metrics.expectedGoals.toFixed(2)}
            />
            <MetricRow
              label="xA"
              value={metrics.expectedAssists.toFixed(2)}
            />
            {metrics.news && (
              <div className="pt-1.5 border-t border-white/15">
                <p className="text-yellow-300 italic text-[10px] leading-snug">
                  ⚠ {metrics.news}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────── */

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50">{label}</span>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}
