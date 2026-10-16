import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { GET, POST } from '../src/app/api/analyze/route';
import { enrichCode } from '../src/lib/ai/analyze';
import { reserveProviderCall, limiterConfig, takeSharedLimit, localBuckets } from '../src/lib/ai/rate-limit';
import { sourceIdentity } from '../src/lib/analysis';
import { inspectJavaScript } from '../src/lib/javascript/analysis';
import { sharedStoreFixture } from './shared-store-fixture';

const code = 'function f(n) { return n + 1; }';
const input = { code, language: 'javascript' as const, functions: [], steps: [] };
const request = (body: unknown = input) =>
  new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
let store: Awaited<ReturnType<typeof sharedStoreFixture>>;
beforeEach(async () => {
  store = await sharedStoreFixture();
  vi.stubEnv('AI_ENABLED', 'true');
  vi.stubEnv('AI_DAILY_LIMIT', '100');
  vi.stubEnv('VERCEL_ENV', 'development');
  vi.stubEnv('CODELENS_RATE_NAMESPACE', 'codelens');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', store.url);
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'redis-fixture-token');
  vi.stubEnv('LLM_PROVIDER', 'openai-compatible');
  vi.stubEnv('LLM_MODEL', 'fixture-model');
  vi.stubEnv('LLM_API_KEY', 'fixture-provider-secret');
  vi.stubEnv('LLM_BASE_URL', '');
});
afterEach(async () => {
  await store.close();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function providerFixture(onCall?: () => void) {
  let calls = 0;
  const server = createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      calls++;
      onCall?.();
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          id: 'fixture',
          object: 'chat.completion',
          created: 0,
          model: 'fixture-model',
          choices: [
            { index: 0, message: { role: 'assistant', content: '{}' }, finish_reason: 'stop' },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing provider fixture address');
  vi.stubEnv('LLM_BASE_URL', `http://127.0.0.1:${address.port}/v1`);
  return {
    calls: () => calls,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe('production AI readiness and spend controls', () => {
  it('caches concurrent readiness GETs for 30 seconds without repeated store probes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T10:00:00Z'));
    const url = 'http://localhost/api/analyze';
    const results = await Promise.all(Array.from({ length: 12 }, () => GET(new Request(url))));
    for (const response of results)
      expect(await response.json()).toMatchObject({ configured: true });
    expect(store.commands).toHaveLength(1);
    vi.setSystemTime(new Date('2026-10-15T10:00:29Z'));
    await GET(new Request(url));
    expect(store.commands).toHaveLength(1);
    vi.setSystemTime(new Date('2026-10-15T10:00:31Z'));
    await GET(new Request(url));
    expect(store.commands).toHaveLength(2);
    const fixture = await providerFixture();
    try {
      for (let i = 0; i < 5; i++) await POST(request());
      expect((await POST(request())).status).toBe(429);
    } finally {
      await fixture.close();
    }
  });
  it.each(['', 'false', '1'])(
    'requires explicit AI_ENABLED=true even with credentials: %s',
    async (flag) => {
      vi.stubEnv('AI_ENABLED', flag);
      expect(await (await GET(new Request('http://localhost/api/analyze'))).json()).toMatchObject({
        configured: false,
        code: 'ai_disabled',
      });
      expect((await POST(request())).status).toBe(503);
      expect(store.commands).toHaveLength(0);
    },
  );
  it.each(['LLM_API_KEY', 'LLM_MODEL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'])(
    'reports missing configuration without exposing secrets: %s',
    async (name) => {
      vi.stubEnv(name, ' ');
      const body = await (await GET(new Request('http://localhost/api/analyze'))).json();
      expect(body.configured).toBe(false);
      expect(body.reason).toContain(
        name.startsWith('LLM') ? 'provider not configured' : 'rate limiter not configured',
      );
      expect(JSON.stringify(body)).not.toContain('fixture-provider-secret');
      expect(JSON.stringify(body)).not.toContain('redis-fixture-token');
      expect((await POST(request())).status).toBe(503);
    },
  );
  it.each([
    ['AI_DAILY_LIMIT', '0'],
    ['AI_DAILY_LIMIT', '-1'],
    ['AI_DAILY_LIMIT', '1.5'],
    ['AI_DAILY_LIMIT', 'invalid'],
    ['CODELENS_RATE_NAMESPACE', 'unsafe{namespace}'],
    ['VERCEL_ENV', 'unknown'],
    ['UPSTASH_REDIS_REST_URL', 'https://user:secret@example.com'],
    ['LLM_BASE_URL', 'not-a-url'],
  ])('fails closed for invalid %s configuration', async (name, value) => {
    vi.stubEnv(name, value);
    expect(await (await GET(new Request('http://localhost/api/analyze'))).json()).toMatchObject({
      configured: false,
    });
    expect((await POST(request())).status).toBe(503);
    expect(store.commands).toHaveLength(0);
  });
  it('checks store access and remaining quota without spending a provider call', async () => {
    expect(await (await GET(new Request('http://localhost/api/analyze'))).json()).toMatchObject({
      configured: true,
      reason: null,
    });
    expect(await (await GET(new Request('http://localhost/api/analyze'))).json()).toMatchObject({
      configured: true,
    });
    expect(store.counters().size).toBe(0);
    await reserveProviderCall();
    expect(
      [...store.counters().entries()]
        .filter(([key]) => key.includes(':day:'))
        .map(([, value]) => value.count),
    ).toEqual([1]);
  });
  it('never reports ready with an invalid Redis credential', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'invalid-secret');
    expect(await (await GET(new Request('http://localhost/api/analyze'))).json()).toMatchObject({
      configured: false,
      code: 'limiter_unavailable',
    });
    expect((await POST(request())).status).toBe(503);
  });
  it('keeps readiness read-only while POST still requires write permissions', async () => {
    store.writable(false);
    expect(await (await GET(new Request('http://localhost/api/analyze'))).json()).toMatchObject({
      configured: true,
    });
    expect((await POST(request())).status).toBe(503);
  });
  it('stops the validation retry if storage fails after the first provider attempt', async () => {
    const fixture = await providerFixture(() => store.unavailable());
    try {
      const response = await POST(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ code: 'limiter_unavailable' });
      expect(fixture.calls()).toBe(1);
    } finally {
      await fixture.close();
    }
  });
  it('uses stable environment namespaces, independent of deployment IDs and URLs', async () => {
    const originalFetch = globalThis.fetch;
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.fixture.test');
    vi.stubGlobal('fetch', (_url: string, options: RequestInit) =>
      originalFetch(store.url, options),
    );
    vi.stubEnv('AI_DAILY_LIMIT', '1');
    for (const environment of ['production', 'preview', 'development']) {
      vi.stubEnv('VERCEL_ENV', environment);
      await reserveProviderCall();
      vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'another-deployment');
      vi.stubEnv('VERCEL_URL', 'another-preview.vercel.app');
      await expect(reserveProviderCall()).rejects.toMatchObject({ code: 'daily_limit' });
    }
    vi.stubEnv('VERCEL_ENV', '');
    expect(limiterConfig()?.prefix).toBe('{codelens:development}');
    expect([...store.counters().keys()].filter((key) => key.includes(':day:'))).toHaveLength(3);
  });
  it('atomically admits exactly the daily ceiling under concurrent provider calls', async () => {
    vi.stubEnv('AI_DAILY_LIMIT', '3');
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => reserveProviderCall()),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
    expect(await (await GET(new Request('http://localhost/api/analyze'))).json()).toMatchObject({
      configured: false,
      code: 'daily_limit',
      reason: expect.stringContaining('AI notes are paused for today'),
    });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBeTruthy();
    expect(await response.json()).toMatchObject({ source: 'static', code: 'daily_limit' });
  });
  it('resets the daily budget only at UTC midnight, without carrying the old day quota', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T23:59:59Z'));
    vi.stubEnv('AI_DAILY_LIMIT', '1');
    await reserveProviderCall();
    await expect(reserveProviderCall()).rejects.toMatchObject({
      code: 'daily_limit',
      retryAfter: 1,
    });
    vi.setSystemTime(new Date('2026-10-15T00:00:00Z'));
    store.advance(1000);
    await reserveProviderCall();
    expect(store.commands[0][5]).toBe('{codelens:development}:day:2026-10-14');
    expect(store.commands.at(-1)![5]).toBe('{codelens:development}:day:2026-10-15');
  });
  it.each(['notes', 'analysis', 'simulate'])(
    'charges the validation retry and pauses before a second call when daily limit is one: %s',
    async (mode) => {
      vi.stubEnv('AI_DAILY_LIMIT', '1');
      const fixture = await providerFixture();
      try {
        const identity = await sourceIdentity('draft', code);
        const body =
          mode === 'notes'
            ? input
            : mode === 'analysis'
              ? {
                  mode,
                  code,
                  language: 'javascript',
                  identity,
                  entries: inspectJavaScript(code).entries,
                }
              : { mode, code, language: 'cpp', identity, consent: true, maxSteps: 100 };
        const response = await POST(request(body));
        expect(response.status).toBe(429);
        expect(await response.json()).toMatchObject({
          code: 'daily_limit',
          error: expect.stringContaining('AI notes are paused for today'),
        });
        expect(fixture.calls()).toBe(1);
      } finally {
        await fixture.close();
      }
    },
  );
  it('counts both failed attempts and never refunds uncertain provider calls', async () => {
    vi.stubEnv('AI_DAILY_LIMIT', '2');
    const fixture = await providerFixture();
    try {
      expect(await enrichCode(input)).toMatchObject({ source: 'static' });
      expect(fixture.calls()).toBe(2);
      const response = await POST(request());
      expect(response.status).toBe(429);
      expect(fixture.calls()).toBe(2);
    } finally {
      await fixture.close();
    }
  });
  it.each(['unreachable', 'http-error', 'malformed'])(
    'fails closed without contacting a provider when storage is %s',
    async (failure) => {
      const fixture = await providerFixture();
      const originalFetch = globalThis.fetch;
      const intercepted = vi.fn((url: string | URL | Request, options?: RequestInit) => {
        if (url === store.url) {
          if (failure === 'unreachable')
            return Promise.reject(new Error('private transport details'));
          return Promise.resolve(
            new Response(failure === 'malformed' ? '{"result":[1]}' : '{}', {
              status: failure === 'http-error' ? 503 : 200,
            }),
          );
        }
        return originalFetch(url, options);
      });
      vi.stubGlobal('fetch', intercepted);
      try {
        expect(await (await GET(new Request('http://localhost/api/analyze'))).json()).toMatchObject(
          {
            configured: false,
            code: 'limiter_unavailable',
          },
        );
        const response = await POST(request());
        expect(response.status).toBe(503);
        expect(JSON.stringify(await response.json())).not.toContain('private transport details');
        await expect(enrichCode(input)).rejects.toMatchObject({ code: 'limiter_unavailable' });
        expect(fixture.calls()).toBe(0);
      } finally {
        await fixture.close();
      }
    },
  );
});

describe('in-memory rate limiter fallback for local dev', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    localBuckets.clear();
  });
  afterEach(() => {
    localBuckets.clear();
  });
  it('returns null from limiterConfig when both Redis URL and token are absent', () => {
    expect(limiterConfig()).toBeNull();
  });
  it('enforces 5 client requests per minute in memory', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await takeSharedLimit('test-client')).allowed).toBe(true);
    }
    const sixth = await takeSharedLimit('test-client');
    expect(sixth.allowed).toBe(false);
    expect(sixth.reason).toBe('minute');
    expect(sixth.retryAfter).toBeGreaterThan(0);
    expect((await takeSharedLimit('other-client')).allowed).toBe(true);
  });
  it('enforces 10 global provider calls per minute in memory', async () => {
    for (let i = 0; i < 10; i++) {
      await expect(reserveProviderCall()).resolves.toBeUndefined();
    }
    await expect(reserveProviderCall()).rejects.toMatchObject({
      code: 'minute_limit',
    });
  });
  it('enforces daily quota in memory and resets at UTC midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    vi.stubEnv('AI_DAILY_LIMIT', '2');
    await reserveProviderCall();
    await reserveProviderCall();
    await expect(reserveProviderCall()).rejects.toMatchObject({
      code: 'daily_limit',
    });
    vi.setSystemTime(new Date('2026-10-16T00:00:01Z'));
    await expect(reserveProviderCall()).resolves.toBeUndefined();
  });
  it('expires minute buckets after 60 seconds and cleans up lazily', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    for (let i = 0; i < 5; i++) {
      await takeSharedLimit('expiring-client');
    }
    expect((await takeSharedLimit('expiring-client')).allowed).toBe(false);
    vi.setSystemTime(new Date('2026-10-15T12:01:01Z'));
    expect((await takeSharedLimit('expiring-client')).allowed).toBe(true);
  });
});
