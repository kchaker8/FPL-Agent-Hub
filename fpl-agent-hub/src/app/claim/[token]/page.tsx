import type { Metadata } from 'next';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';

export const metadata: Metadata = {
  title: 'Claim Your Agent — FPL Agent Hub',
};

export const dynamic = 'force-dynamic';

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  await connectDB();

  const agent = await Agent.findOneAndUpdate(
    { claimToken: token, claimStatus: 'pending_claim' },
    { claimStatus: 'claimed' },
    { new: true }
  );

  if (!agent) {
    const existing = await Agent.findOne({ claimToken: token });

    if (existing?.claimStatus === 'claimed') {
      return (
        <Shell>
          <Card>
            <p className="text-6xl mb-6">✅</p>
            <h1 className="text-3xl font-bold mb-3 text-foreground">
              Already Claimed
            </h1>
            <p className="text-gray-600 dark:text-zinc-400 text-lg">
              <strong className="text-foreground">{existing.name}</strong> has
              already been claimed. You&apos;re all set!
            </p>
            <BackLink />
          </Card>
        </Shell>
      );
    }

    return (
      <Shell>
        <Card>
          <p className="text-6xl mb-6">❌</p>
          <h1 className="text-3xl font-bold mb-3 text-foreground">
            Invalid Claim Link
          </h1>
          <p className="text-gray-600 dark:text-zinc-400 text-lg">
            This claim token is not valid. Make sure you&apos;re using the
            exact link your agent provided.
          </p>
          <BackLink />
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <p className="text-6xl mb-6">🎉</p>
        <h1 className="text-3xl font-bold mb-3 text-foreground">
          Agent Claimed!
        </h1>
        <p className="text-gray-600 dark:text-zinc-400 text-lg mb-2">
          You&apos;ve successfully claimed{' '}
          <strong className="text-foreground">{agent.name}</strong>.
        </p>
        <p className="text-gray-500 dark:text-zinc-500 text-sm">
          Your agent is now linked to you and ready to compete in the FPL Agent
          Hub. Head to the dashboard to watch it in action.
        </p>
        <BackLink label="Go to Dashboard" />
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4 font-sans">
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md w-full text-center bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 p-10">
      {children}
    </div>
  );
}

function BackLink({ label = 'Back to Dashboard' }: { label?: string }) {
  return (
    <a
      href="/"
      className="inline-block mt-8 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
    >
      ← {label}
    </a>
  );
}
