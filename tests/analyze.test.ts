import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { enrichCode, type AnalyzeRequest } from '../src/lib/ai/analyze';
import { takeSharedLimit, reserveProviderCall } from '../src/lib/ai/rate-limit';
import { sharedStoreFixture } from './shared-store-fixture';
import { POST, GET } from '../src/app/api/analyze/route';
const input: AnalyzeRequest = {
  code: 'function f(n){return n+1;}\nf(2);',
  language: 'javascript',
  functions: [{ name: 'f', line: 1, endLine: 1, parameters: ['n'] }],
  steps: [{ index: 1, line: 1, event: 'call', func: 'f' }],
};
const valid = {
  summary: 'Adds one to a value. The call returns a result.',
  pattern: 'Simple function',
  functions: [{ name: 'f', line: 1, purpose: 'Adds one.', returns: 'The input plus one.' }],
  annotations: [{ line: 1, text: 'Define a function.' }],
  stepNotes: [{ index: 1, text: 'Enter f with the supplied argument.' }],
};
let store: Awaited<ReturnType<typeof sharedStoreFixture>>;
beforeEach(async () => {
  vi.stubEnv('AI_ENABLED', 'true');
  vi.stubEnv('VERCEL_ENV', 'development');
  vi.stubEnv('AI_DAILY_LIMIT', '100');
  vi.stubEnv('LLM_BASE_URL', '');
  vi.stubEnv('LLM_API_KEY', 'fixture-key');
  vi.stubEnv('LLM_MODEL', 'fixture-model');
  store = await sharedStoreFixture();
  vi.stubEnv('UPSTASH_REDIS_REST_URL', store.url);
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'redis-fixture-token');
});
afterEach(async () => {
  await store.close();
  vi.unstubAllEnvs();
});
describe('single analysis route and provider contract', () => {
  it('enforces the API client ceiling and rejects streamed oversized bodies', async () => {
    for (let i = 0; i < 5; i++) expect((await takeSharedLimit('rate-fixture')).allowed).toBe(true);
    const limited = await POST(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': 'rate-fixture' },
        body: JSON.stringify(input),
      }),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBeTruthy();
    expect(
      (
        await POST(
          new Request('http://localhost/api/analyze', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-forwarded-for': 'size-fixture' },
            body: 'x'.repeat(200001),
          }),
        )
      ).status,
    ).toBe(413);
  });
  it.each(['schema', 'locations'])(
    'falls back after two invalid provider outputs: %s',
    async (kind) => {
      let calls = 0;
      const server = createServer((req, res) => {
        req.resume();
        req.on('end', () => {
          calls++;
          res.setHeader('content-type', 'application/json');
          const bad =
            kind === 'schema'
              ? { summary: 'Incomplete JSON' }
              : { ...valid, stepNotes: [{ index: 4999, text: 'A fabricated step.' }] };
          res.end(
            JSON.stringify({
              id: 'invalid-fixture',
              object: 'chat.completion',
              created: 0,
              model: 'fixture-model',
              choices: [
                {
                  index: 0,
                  message: { role: 'assistant', content: JSON.stringify(bad) },
                  finish_reason: 'stop',
                },
              ],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            }),
          );
        });
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('No fixture address');
      vi.stubEnv('LLM_PROVIDER', 'openai-compatible');
      vi.stubEnv('LLM_MODEL', 'fixture-model');
      vi.stubEnv('LLM_API_KEY', 'fixture-key');
      vi.stubEnv('LLM_BASE_URL', `http://127.0.0.1:${address.port}/v1`);
      try {
        expect(await enrichCode(input)).toMatchObject({ source: 'static' });
        expect(calls).toBe(2);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    },
  );
  it('returns an honest offline fallback with no key', async () => {
    vi.stubEnv('LLM_API_KEY', '');
    expect(await enrichCode(input)).toMatchObject({ source: 'static' });
    expect(await (await GET(new Request('http://localhost/api/analyze'))).json()).toMatchObject({
      configured: false,
      reason: 'AI provider not configured.',
    });
  });
  it('validates code length and bounds bodies before processing', async () => {
    const headers = { 'content-type': 'application/json', 'x-forwarded-for': 'validation' };
    expect(
      (
        await POST(
          new Request('http://localhost/api/analyze', {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...input, code: 'x'.repeat(30001) }),
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          new Request('http://localhost/api/analyze', {
            method: 'POST',
            headers: { ...headers, 'content-length': '200001' },
            body: '{}',
          }),
        )
      ).status,
    ).toBe(413);
    expect(
      (await POST(new Request('http://localhost/api/analyze', { method: 'POST', body: '{}' })))
        .status,
    ).toBe(415);
  });
  it('shares client/global ceilings over HTTP, expires buckets', async () => {
    for (let i = 0; i < 5; i++) expect((await takeSharedLimit('a')).allowed).toBe(true);
    expect((await takeSharedLimit('a')).allowed).toBe(false);
    const global = await Promise.allSettled(
      Array.from({ length: 11 }, () => reserveProviderCall()),
    );
    expect(global.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    store.advance(60001);
    expect((await takeSharedLimit('a')).allowed).toBe(true);
  });
  it('fails closed when shared storage is missing', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('LLM_API_KEY', 'fixture-key');
    vi.stubEnv('LLM_MODEL', 'fixture-model');
    const response = await POST(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ source: 'static' });
  });
  it('uses a configured provider, retries malformed JSON, and validates locations', async () => {
    let calls = 0;
    let authorization = '';
    const server = createServer((req, res) => {
      authorization = String(req.headers.authorization);
      req.resume();
      req.on('end', () => {
        calls++;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            id: 'fixture',
            object: 'chat.completion',
            created: 0,
            model: 'fixture-model',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: calls === 1 ? 'malformed JSON' : JSON.stringify(valid),
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No server address');
    vi.stubEnv('LLM_PROVIDER', 'openai-compatible');
    vi.stubEnv('LLM_MODEL', 'fixture-model');
    vi.stubEnv('LLM_API_KEY', 'test-key-never-real');
    vi.stubEnv('LLM_BASE_URL', `http://127.0.0.1:${address.port}/v1`);
    try {
      const response = await POST(
        new Request('http://localhost/api/analyze', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': 'fixture' },
          body: JSON.stringify(input),
        }),
      );
      const result = await response.json();
      expect(result).toMatchObject({ source: 'ai', enrichment: valid });
      expect(calls).toBe(2);
      expect(authorization).toBe('Bearer test-key-never-real');
      expect(JSON.stringify(result)).not.toContain('test-key');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
