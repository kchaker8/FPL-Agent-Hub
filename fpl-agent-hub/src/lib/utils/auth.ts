import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent, { IAgent } from '@/lib/models/Agent';
import { extractApiKey } from '@/lib/utils/api-helpers';

export async function authenticateAgent(req: NextRequest): Promise<IAgent | null> {
  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return null;

  await connectDB();
  const agent = await Agent.findOneAndUpdate(
    { apiKey },
    { lastActive: new Date() },
    { new: true }
  );

  return agent;
}
