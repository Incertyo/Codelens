import { limits } from '@/shared/limits';
import { createHmac } from 'node:crypto';
import { AIControlError } from "./control-error";
export const CLIENT_MINUTE_LIMIT =
  process.env.AI_CLIENT_MINUTE_LIMIT
    ? Number(process.env.AI_CLIENT_MINUTE_LIMIT)
    : process.env.NODE_ENV === 'test'
      ? limits.clientMinuteTest
      : limits.clientMinuteDefault;
export const GLOBAL_MINUTE_LIMIT =
  process.env.AI_GLOBAL_MINUTE_LIMIT
    ? Number(process.env.AI_GLOBAL_MINUTE_LIMIT)
    : process.env.NODE_ENV === 'test'
      ? limits.globalMinuteTest
      : limits.globalMinuteDefault;
export const DEFAULT_DAILY_LIMIT =
  process.env.AI_DEFAULT_DAILY_LIMIT
    ? Number(process.env.AI_DEFAULT_DAILY_LIMIT)
    : limits.dailyDefault;

export const LIMIT_SCRIPT = `
local mode = ARGV[1]
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
local g = tonumber(redis.call('GET', KEYS[2]) or '0')
local d = tonumber(redis.call('GET', KEYS[3]) or '0')
if d >= tonumber(ARGV[4]) then return {2, tonumber(ARGV[5])} end
if g >= tonumber(ARGV[3]) or (mode ~= 'call' and c >= tonumber(ARGV[2])) then
  return {0, math.max(redis.call('PTTL', KEYS[1]), redis.call('PTTL', KEYS[2]), 1)}
end
if mode == 'client' then
  redis.call('INCR', KEYS[1]); if c == 0 then redis.call('PEXPIRE', KEYS[1], 60000) end
elseif mode == 'call' then
  redis.call('INCR', KEYS[2]); if g == 0 then redis.call('PEXPIRE', KEYS[2], 60000) end
  redis.call('INCR', KEYS[3]); if d == 0 then redis.call('PEXPIRE', KEYS[3], tonumber(ARGV[5])) end
end
return {1, 0}`;

export function limiterConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim(),
    token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const namespace = process.env.CODELENS_RATE_NAMESPACE || 'codelens';
  const environment = process.env.VERCEL_ENV || 'development';
  const daily = process.env.AI_DAILY_LIMIT ?? String(DEFAULT_DAILY_LIMIT);
  try {
    if (
      !/^[a-zA-Z0-9_-]{1,80}$/.test(namespace) ||
      !['production', 'preview', 'development'].includes(environment) ||
      !/^\d+$/.test(daily) ||
      !Number.isSafeInteger(Number(daily)) ||
      Number(daily) < 1
    )
      throw new Error('Invalid configuration');
  } catch {
    throw new AIControlError('limiter_config_invalid', 'AI rate limiter configuration is invalid.');
  }
  if (!url && !token) return null;
  if (!url || !token)
    throw new AIControlError('limiter_not_configured', 'AI rate limiter not configured.');
  try {
    const endpoint = new URL(url);
    const local =
      environment === 'development' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
    if (
      (endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:')) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    )
      throw new Error('Invalid configuration');
  } catch {
    throw new AIControlError('limiter_config_invalid', 'AI rate limiter configuration is invalid.');
  }
  return { url, token, prefix: `{${namespace}:${environment}}`, dailyLimit: Number(daily) };
}
export type LimitResult = {
  allowed: boolean;
  retryAfter: number;
  reason: 'daily' | 'minute' | null;
};

interface Bucket {
  count: number;
  expires: number;
}

export const localBuckets = new Map<string, Bucket>();

export function localLimit(
  mode: 'client' | 'call' | 'check',
  client: string,
): LimitResult {
  const now = new Date();
  const nowMs = now.getTime();
  const day = now.toISOString().slice(0, 10);
  const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const dayTTL = nextDay - nowMs;
  const dailyStr = process.env.AI_DAILY_LIMIT ?? String(DEFAULT_DAILY_LIMIT);
  const dailyLimit = Number(dailyStr);

  for (const [key, bucket] of localBuckets.entries()) {
    if (bucket.expires <= nowMs) {
      localBuckets.delete(key);
    }
  }

  const clientKey = `client:${client}`;
  const globalKey = 'global';
  const dayKey = `day:${day}`;

  const clientBucket = localBuckets.get(clientKey);
  const globalBucket = localBuckets.get(globalKey);
  const dayBucket = localBuckets.get(dayKey);

  const c = clientBucket && clientBucket.expires > nowMs ? clientBucket.count : 0;
  const g = globalBucket && globalBucket.expires > nowMs ? globalBucket.count : 0;
  const d = dayBucket && dayBucket.expires > nowMs ? dayBucket.count : 0;

  if (d >= dailyLimit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(dayTTL / 1000)),
      reason: 'daily',
    };
  }

  if (g >= GLOBAL_MINUTE_LIMIT || (mode !== 'call' && c >= CLIENT_MINUTE_LIMIT)) {
    const clientTTL = clientBucket && clientBucket.expires > nowMs ? clientBucket.expires - nowMs : 0;
    const globalTTL = globalBucket && globalBucket.expires > nowMs ? globalBucket.expires - nowMs : 0;
    const ttl = Math.max(clientTTL, globalTTL, 1);
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(ttl / 1000)),
      reason: 'minute',
    };
  }

  if (mode === 'client') {
    if (clientBucket && clientBucket.expires > nowMs) {
      clientBucket.count += 1;
    } else {
      localBuckets.set(clientKey, { count: 1, expires: nowMs + 60000 });
    }
  } else if (mode === 'call') {
    if (globalBucket && globalBucket.expires > nowMs) {
      globalBucket.count += 1;
    } else {
      localBuckets.set(globalKey, { count: 1, expires: nowMs + 60000 });
    }
    if (dayBucket && dayBucket.expires > nowMs) {
      dayBucket.count += 1;
    } else {
      localBuckets.set(dayKey, { count: 1, expires: nextDay });
    }
  }

  return {
    allowed: true,
    retryAfter: 0,
    reason: null,
  };
}

async function sharedLimit(
  mode: 'client' | 'call' | 'check',
  client: string,
  signal?: AbortSignal,
): Promise<LimitResult> {
  const config = limiterConfig();
  if (!config) {
    return localLimit(mode, client);
  }
  const { url, token, prefix, dailyLimit } = config;
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const dayTTL = nextDay - now.getTime();
  const hash = createHmac('sha256', token).update(client).digest('hex');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        'EVAL',
        LIMIT_SCRIPT,
        '4',
        `${prefix}:client:${hash}`,
        `${prefix}:global`,
        `${prefix}:day:${day}`,
        `${prefix}:probe:${hash}`,
        mode,
        String(CLIENT_MINUTE_LIMIT),
        String(GLOBAL_MINUTE_LIMIT),
        String(dailyLimit),
        String(dayTTL),
      ]),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(limits.limiterTimeoutMs)])
        : AbortSignal.timeout(limits.limiterTimeoutMs),
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Store unavailable');
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      !('result' in data) ||
      !Array.isArray(data.result) ||
      data.result.length !== 2 ||
      ![0, 1, 2].includes(data.result[0]) ||
      typeof data.result[1] !== 'number' ||
      !Number.isFinite(data.result[1]) ||
      data.result[1] < 0
    )
      throw new Error('Invalid shared limiter response.');
    return {
      allowed: data.result[0] === 1,
      retryAfter: Math.max(1, Math.ceil(data.result[1] / 1000)),
      reason: data.result[0] === 2 ? 'daily' : data.result[0] === 0 ? 'minute' : null,
    };
  } catch {
    throw new AIControlError(
      'limiter_unavailable',
      'AI rate limiter is unavailable. Static analysis and traces remain available.',
    );
  }
}
export const takeSharedLimit = (client: string) => sharedLimit('client', client);
export const checkSharedReadiness = (client: string) => sharedLimit('check', client);
export function requireAllowed(limit: LimitResult) {
  if (!limit.allowed)
    throw new AIControlError(
      limit.reason === 'daily' ? 'daily_limit' : 'minute_limit',
      limit.reason === 'daily'
        ? 'AI notes are paused for today. Static analysis and traces remain available.'
        : 'Too many AI requests. Try again shortly.',
      429,
      limit.retryAfter,
    );
}
export async function reserveProviderCall(signal?: AbortSignal) {
  requireAllowed(await sharedLimit('call', 'provider-budget', signal));
}
