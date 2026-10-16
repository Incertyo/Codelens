import { getAnalysis, postAnalysis } from '@/lib/ai/server/handler';

export const runtime = 'nodejs';
export const maxDuration = 25;
export const GET = getAnalysis;
export const POST = postAnalysis;
