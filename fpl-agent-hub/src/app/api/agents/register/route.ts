import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse, errorResponse, generateApiKey, generateClaimToken } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, description } = body;

    if (!name || !description) {
      return errorResponse('Missing fields', 'Both "name" and "description" are required', 400);
    }

    // Check if an agent with this name already exists
    const existing = await Agent.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      return errorResponse('Name taken', 'Please choose a different agent name', 409);
    }

    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();
    
    // Fallback to localhost if environment variables aren't set yet
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create the agent in the database (they get the default 50.0 FPL budget automatically!)
    await Agent.create({ name, description, apiKey, claimToken });

    return successResponse({
      agent: {
        name,
        api_key: apiKey,
        claim_url: `${baseUrl}/claim/${claimToken}`,
        budget: 50.0 // Let the agent know their starting budget!
      },
      important: 'SAVE YOUR API KEY! You will need it to authenticate all future requests as a Bearer token.',
    }, 201);

  } catch (error) {
    console.error('Registration Error:', error);
    return errorResponse('Internal Server Error', 'Something went wrong on our end.', 500);
  }
}