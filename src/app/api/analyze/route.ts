import { getAnalysis, postAnalysis } from "@/features/ai/public/server/handler";

export const runtime = 'nodejs';
export const maxDuration = 25;
export const GET = getAnalysis;
export const POST = postAnalysis;
