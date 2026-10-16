import type { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createHash } from 'node:crypto';
import { limits } from "@/shared/limits";
import { limiterConfig, checkSharedReadiness, requireAllowed } from "./rate-limit";
import { AIControlError } from "./control-error";
export function providerStatus() {
  if (process.env.AI_ENABLED?.trim().toLowerCase() !== 'true')
    return { configured: false, reason: 'AI is disabled.', code: 'ai_disabled' };
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
  if (
    !process.env.LLM_API_KEY?.trim() ||
    !process.env.LLM_MODEL?.trim() ||
    !['openai', 'openai-compatible', 'anthropic', 'google'].includes(provider)
  )
    return {
      configured: false,
      reason: 'AI provider not configured.',
      code: 'provider_not_configured',
    };
  if (process.env.LLM_BASE_URL) {
    try {
      const endpoint = new URL(process.env.LLM_BASE_URL);
      const local = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development';
      if (
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash ||
        (endpoint.protocol !== 'https:' &&
          !(
            local &&
            endpoint.protocol === 'http:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
          ))
      )
        throw new Error('Invalid URL');
    } catch {
      return {
        configured: false,
        reason: 'AI provider configuration is invalid.',
        code: 'provider_config_invalid',
      };
    }
  }
  try {
    limiterConfig();
    return { configured: true, reason: null, code: null };
  } catch (error) {
    return {
      configured: false,
      reason:
        error instanceof AIControlError
          ? error.message
          : 'AI rate limiter configuration is invalid.',
      code: error instanceof AIControlError ? error.code : 'limiter_config_invalid',
    };
  }
}
type Readiness = ReturnType<typeof providerStatus> & { retryAfter?: number };
const readinessCache = new Map<string, { expires: number; result: Promise<Readiness> }>();
let readinessConfig = '';
async function readReadiness(
  client: string,
  status: ReturnType<typeof providerStatus>,
): Promise<Readiness> {
  try {
    requireAllowed(await checkSharedReadiness(client));
    return status;
  } catch (error) {
    return {
      configured: false,
      reason: error instanceof AIControlError ? error.message : 'AI rate limiter is unavailable.',
      code: error instanceof AIControlError ? error.code : 'limiter_unavailable',
      retryAfter: error instanceof AIControlError ? error.retryAfter : undefined,
    };
  }
}
export async function aiReadiness(client = 'local') {
  const status = providerStatus();
  if (!status.configured) return status;
  const config = createHash('sha256')
    .update(
      JSON.stringify([
        process.env.LLM_PROVIDER,
        process.env.LLM_MODEL,
        process.env.LLM_API_KEY,
        process.env.LLM_BASE_URL,
        process.env.UPSTASH_REDIS_REST_URL,
        process.env.UPSTASH_REDIS_REST_TOKEN,
        process.env.CODELENS_RATE_NAMESPACE,
        process.env.VERCEL_ENV,
        process.env.AI_DAILY_LIMIT,
        new Date().toISOString().slice(0, 10),
      ]),
    )
    .digest('hex');
  if (config !== readinessConfig) {
    readinessCache.clear();
    readinessConfig = config;
  }
  const key = createHash('sha256').update(client).digest('hex');
  const now = Date.now();
  const cached = readinessCache.get(key);
  if (cached && cached.expires > now) return cached.result;
  if (readinessCache.size >= limits.readinessEntries) readinessCache.delete(readinessCache.keys().next().value!);
  const result = readReadiness(client, status);
  readinessCache.set(key, { expires: now + limits.readinessTtlMs, result });
  return result;
}
export function model(): LanguageModel {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
  const apiKey = process.env.LLM_API_KEY!;
  const name = process.env.LLM_MODEL!;
  if (provider === 'anthropic') return createAnthropic({ apiKey })(name);
  if (provider === 'google') return createGoogle({ apiKey })(name);
  const openai = createOpenAI({
    apiKey,
    ...(process.env.LLM_BASE_URL ? { baseURL: process.env.LLM_BASE_URL } : {}),
  });
  return provider === 'openai-compatible' ? openai.chat(name) : openai(name);
}
