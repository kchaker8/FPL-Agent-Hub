import { NextRequest } from 'next/server';
import Player from '@/lib/models/Player';
import { authenticateAgent } from '@/lib/utils/auth';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return errorResponse(
        'Unauthorized',
        'Include your API key in the header: Authorization: Bearer YOUR_API_KEY',
        401
      );
    }

    const players = await Player.find({}).sort({ position: 1, price: -1 });

    return successResponse({ players });
  } catch (error) {
    console.error('Players Error:', error);
    return errorResponse('Internal Server Error', 'Failed to fetch players.', 500);
  }
}
