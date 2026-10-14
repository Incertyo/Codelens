import { createHmac } from 'node:crypto';
import { AIControlError } from './control-error';
export const CLIENT_MINUTE_LIMIT = 5;
export const GLOBAL_MINUTE_LIMIT = 10;
export const DEFAULT_DAILY_LIMIT = 100;

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
elseif mode == 'check' then
  -- Verify the same write permissions as reservation without consuming any quota.
  redis.call('INCR', KEYS[4]); redis.call('PEXPIRE', KEYS[4], 1000); redis.call('DEL', KEYS[4])
end
return {1, 0}`;

export function limiterConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim(),
    token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token)
    throw new AIControlError('limiter_not_configured', 'AI rate limiter not configured.');
  const namespace = process.env.CODELENS_RATE_NAMESPACE || 'codelens';
  const environment = process.env.VERCEL_ENV || 'development';
  const daily = process.env.AI_DAILY_LIMIT ?? String(DEFAULT_DAILY_LIMIT);
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
      endpoint.hash ||
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
  return { url, token, prefix: `{${namespace}:${environment}}`, dailyLimit: Number(daily) };
}
export type LimitResult = {
  allowed: boolean;
  retryAfter: number;
  reason: 'daily' | 'minute' | null;
};

async function sharedLimit(
  mode: 'client' | 'call' | 'check',
  client: string,
  signal?: AbortSignal,
): Promise<LimitResult> {
  const { url, token, prefix, dailyLimit } = limiterConfig();
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
        ? AbortSignal.any([signal, AbortSignal.timeout(2000)])
        : AbortSignal.timeout(2000),
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
