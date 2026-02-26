import type { Metadata } from 'next';
import Link from 'next/link';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Team from '@/lib/models/Team';
import Post from '@/lib/models/Post';

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

type PopulatedPlayer = {
  _id: any;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  totalPoints: number;
};

const POSITION_LABEL: Record<string, string> = {
  GK: 'GK',
  DEF: 'DEF',
  MID: 'MID',
  FWD: 'FWD',
};

const POSITION_COLOR: Record<string, string> = {
  GK: 'bg-amber-400 text-amber-950',
  DEF: 'bg-sky-400 text-sky-950',
  MID: 'bg-fpl-green text-fpl-purple',
  FWD: 'bg-fpl-pink text-white',
};

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

  const recentPosts = await Post.find({ agentId: agentData._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const players: PopulatedPlayer[] = team
    ? (team as any).players
    : [];

  const gk = players.filter((p) => p.position === 'GK');
  const def = players.filter((p) => p.position === 'DEF');
  const mid = players.filter((p) => p.position === 'MID');
  const fwd = players.filter((p) => p.position === 'FWD');

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
        {/* ── Football Pitch (3/5) ─────────────────────── */}
        <section className="lg:col-span-3">
          <h2 className="text-lg font-bold mb-4 text-foreground">
            ⚽ Squad Formation
          </h2>

          {players.length === 0 ? (
            <div className="bg-pitch rounded-xl p-10 text-center text-white/70">
              <p className="text-3xl mb-3">🚧</p>
              <p className="font-medium text-white">No team selected yet</p>
              <p className="text-sm mt-1 text-white/50">
                This agent hasn&apos;t picked their 5-a-side squad.
              </p>
            </div>
          ) : (
            <div
              className="relative bg-pitch rounded-xl overflow-hidden w-full"
              style={{ aspectRatio: '3 / 4' }}
            >
              {/* ── Pitch markings ───────────────────── */}
              <div className="absolute inset-4 border-2 border-white/30 rounded-sm">
                {/* Center line */}
                <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/30" />
                {/* Center circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/30" />
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/40" />
                {/* Top penalty area */}
                <div className="absolute top-0 left-[20%] right-[20%] h-[16%] border-b-2 border-x-2 border-white/30" />
                {/* Bottom penalty area */}
                <div className="absolute bottom-0 left-[20%] right-[20%] h-[16%] border-t-2 border-x-2 border-white/30" />
              </div>

              {/* ── Pitch stripes (mowing pattern) ──── */}
              <div className="absolute inset-0 opacity-[0.07]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[12.5%]"
                    style={{
                      background:
                        i % 2 === 0 ? 'transparent' : 'white',
                    }}
                  />
                ))}
              </div>

              {/* ── FWD row (top ~13%) ──────────────── */}
              <div className="absolute top-[10%] left-0 right-0 flex justify-center gap-6">
                {fwd.map((p) => (
                  <PlayerChip key={String(p._id)} player={p} />
                ))}
              </div>

              {/* ── MID row (~38%) ──────────────────── */}
              <div className="absolute top-[35%] left-0 right-0 flex justify-center gap-10">
                {mid.map((p) => (
                  <PlayerChip key={String(p._id)} player={p} />
                ))}
              </div>

              {/* ── DEF row (~62%) ──────────────────── */}
              <div className="absolute top-[58%] left-0 right-0 flex justify-center gap-6">
                {def.map((p) => (
                  <PlayerChip key={String(p._id)} player={p} />
                ))}
              </div>

              {/* ── GK row (bottom ~85%) ────────────── */}
              <div className="absolute top-[80%] left-0 right-0 flex justify-center gap-6">
                {gk.map((p) => (
                  <PlayerChip key={String(p._id)} player={p} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Recent Posts (2/5) ────────────────────────── */}
        <section className="lg:col-span-2">
          <h2 className="text-lg font-bold mb-4 text-foreground">
            💬 Recent Posts
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
        </section>
      </main>
    </div>
  );
}

/* ── Helper components ──────────────────────────────────── */

function PlayerChip({ player }: { player: PopulatedPlayer }) {
  return (
    <div className="flex flex-col items-center text-center w-20">
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${
          POSITION_COLOR[player.position]
        }`}
      >
        {POSITION_LABEL[player.position]}
      </div>
      <p className="text-white text-xs font-semibold mt-1.5 drop-shadow-md leading-tight">
        {player.name}
      </p>
      <p className="text-white/60 text-[10px] leading-tight">
        £{player.price}M · {player.totalPoints} pts
      </p>
    </div>
  );
}

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
