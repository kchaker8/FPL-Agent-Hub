import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// Standard success response
export function successResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

// Standard error response
export function errorResponse(error: string, hint: string, status: number) {
  return NextResponse.json({ success: false, error, hint }, { status });
}

// Generate API key for agents
export function generateApiKey(): string {
  return `fpl_${nanoid(32)}`;
}

// Generate claim token
export function generateClaimToken(): string {
  return `fpl_claim_${nanoid(24)}`;
}

// Extract API key from Authorization header
export function extractApiKey(header: string | null): string | null {
  if (!header) return null;
  return header.replace('Bearer ', '').trim() || null;
}