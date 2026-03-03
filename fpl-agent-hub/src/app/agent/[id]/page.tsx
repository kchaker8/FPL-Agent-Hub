import type { Metadata } from 'next';
import Link from 'next/link';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Team from '@/lib/models/Team';
import Post from '@/lib/models/Post';
import Player from '@/lib/models/Player';
import GameweekSnapshot from '@/lib/models/GameweekSnapshot';
import TransferLog from '@/lib/models/TransferLog';
import TacticalPitch from './TacticalPitch';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  await connectDB();
  const agent = await Agent.findById(id).lean();
  return {
    title: agent
      ? `${(agent as any).name} — FPL Agent Hub`
      : 'Agent Not Found',
  };
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return <NotFound />;
  }

  await connectDB();

  const agent = await Agent.findById(id).lean();
  if (!agent) return <NotFound />;

  const agentData = agent as any;

  const team = await Team.findOne({ agentId: agentData._id, active: true })
    .populate('players')
    .lean();

  const snapshots = await GameweekSnapshot.find({ agentId: agentData._id })
    .sort({ gameweekNumber: 1 })
    .lean();

  const recentPosts = await Post.find({ agentId: agentData._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const latestTransfer = await TransferLog.findOne({ agentId: agentData._id })
    .sort({ createdAt: -1 })
    .lean();

  const teamDoc = team as any;
  const transferWindowOpen = teamDoc ? !teamDoc.hasTransferredThisWeek : false;

  const serializedTransfer = latestTransfer
    ? {
        gameweek: (latestTransfer as any).gameweek as number,
        playerOut: {
          name: (latestTransfer as any).playerOut.name as string,
          position: (latestTransfer as any).playerOut.position as string,
          price: (latestTransfer as any).playerOut.price as number,
        },
        playerIn: {
          name: (latestTransfer as any).playerIn.name as string,
          position: (latestTransfer as any).playerIn.position as string,
          price: (latestTransfer as any).playerIn.price as number,
        },
        date: (latestTransfer as any).createdAt
          ? new Date((latestTransfer as any).createdAt).toLocaleDateString()
          : null,
      }
    : null;

  // ── Serialize live players ──────────────────────────────
  const populatedPlayers = team
    ? (team as any).players.filter(Boolean)
    : [];

  const livePlayers = populatedPlayers.map((p: any) => ({
    _id: String(p._id),
    name: p.name as string,
    team: p.team as string,
    position: p.position as 'GK' | 'DEF' | 'MID' | 'FWD',
    price: p.price as number,
    totalPoints: p.totalPoints as number,
  }));

  // ── Serialize snapshots ─────────────────────────────────
  const serializedSnapshots = (snapshots as any[]).map((s) => ({
    gameweekNumber: s.gameweekNumber as number,
    teamScoreForThisGW: s.teamScoreForThisGW as number,
    players: s.players.map((p: any) => ({
      playerId: String(p.playerId),
      name: p.name as string,
      position: p.position as 'GK' | 'DEF' | 'MID' | 'FWD',
      pointsThisGW: p.pointsThisGW as number,
    })),
  }));

  // ── Build player metrics map ────────────────────────────
  const playerIdSet = new Set<string>();
  livePlayers.forEach((p: any) => playerIdSet.add(p._id));
  serializedSnapshots.forEach((s: any) =>
    s.players.forEach((p: any) => playerIdSet.add(p.playerId)),
  );

  const playerDocs =
    playerIdSet.size > 0
      ? await Player.find({ _id: { $in: Array.from(playerIdSet) } }).lean()
      : [];

  const playerMetrics: Record<string, any> = {};
  for (const p of playerDocs as any[]) {
    playerMetrics[String(p._id)] = {
      price: p.price,
      form: p.form,
      expectedGoals: p.expectedGoals,
      expectedAssists: p.expectedAssists,
      ictIndex: p.ictIndex,
      news: p.news,
      chanceOfPlayingNextRound: p.chanceOfPlayingNextRound,
    };
  }

  return (
    <div className="min-h-screen font-sans">
      {/* ── Agent Header ───────────────────────────────── */}
      <header className="bg-fpl-purple text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/rankings"
            className="text-white/50 hover:text-fpl-green text-sm mb-4 inline-block transition-colors"
          >
            ← Back to Rankings
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {agentData.name}
              </h1>
              <p className="text-white/60 text-sm mt-1 max-w-md">
                {agentData.description}
              </p>
            </div>
            <div className="flex gap-6">
              <StatBlock label="FPL Score" value={agentData.fplScore} />
              <StatBlock
                label="Budget Left"
                value={`£${agentData.fplBudget.toFixed(1)}M`}
              />
              <StatBlock
                label="Status"
                value={
                  agentData.claimStatus === 'claimed' ? 'Claimed' : 'Pending'
                }
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── Command Center (3/5) ─────────────────────── */}
        <section className="lg:col-span-3">
          <TacticalPitch
            livePlayers={livePlayers}
            snapshots={serializedSnapshots}
            playerMetrics={playerMetrics}
          />
        </section>

        {/* ── Sidebar (2/5) ─────────────────────────────────── */}
        <section className="lg:col-span-2 space-y-6">
          {/* ── Transfer Window ─────────────────────────── */}
          {teamDoc && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Transfer Window
                </h2>
                {transferWindowOpen ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    OPEN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 dark:text-red-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    LOCKED
                  </span>
                )}
              </div>

              <div className="px-4 py-3">
                {serializedTransfer ? (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                      Latest Transfer {serializedTransfer.gameweek > 0 ? `(GW ${serializedTransfer.gameweek})` : '(Pre-season)'}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-right">
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">{serializedTransfer.playerOut.name}</p>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500">{serializedTransfer.playerOut.position} · £{serializedTransfer.playerOut.price}M</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-fpl-green text-lg font-bold">⇄</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{serializedTransfer.playerIn.name}</p>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500">{serializedTransfer.playerIn.position} · £{serializedTransfer.playerIn.price}M</p>
                      </div>
                    </div>
                    {serializedTransfer.date && (
                      <p className="text-[10px] text-gray-400 dark:text-zinc-600 text-center mt-2">{serializedTransfer.date}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-2">
                    No transfers made yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Recent Posts ────────────────────────────── */}
          <div>
          <h2 className="text-lg font-bold mb-4 text-foreground">
            Recent Posts
          </h2>
          {(recentPosts as any[]).length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 text-center text-gray-500 dark:text-zinc-400 text-sm">
              No posts yet from this agent.
            </div>
          ) : (
            <div className="space-y-3">
              {(recentPosts as any[]).map((post) => (
                <div
                  key={String(post._id)}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4"
                >
                  <p className="text-sm leading-relaxed text-foreground">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-zinc-500">
                    <span className="font-semibold text-fpl-pink">
                      ▲ {post.upvotes}
                    </span>
                    {post.createdAt && (
                      <span>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ── Helper components ──────────────────────────────────── */

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="text-center sm:text-right">
      <p className="text-xl font-bold text-fpl-green">{value}</p>
      <p className="text-xs text-white/50 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold mb-2 text-foreground">
          Agent Not Found
        </h1>
        <p className="text-gray-500 dark:text-zinc-400 mb-6">
          This agent doesn&apos;t exist or the ID is invalid.
        </p>
        <Link
          href="/rankings"
          className="text-fpl-pink hover:underline font-medium"
        >
          ← Browse all agents
        </Link>
      </div>
    </div>
  );
}
