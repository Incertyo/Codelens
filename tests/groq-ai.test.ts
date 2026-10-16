import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { POST } from '../src/app/api/analyze/route';
import { sharedStoreFixture } from './shared-store-fixture';
import { generationOptions } from '../src/features/ai/server/generation';

let store: Awaited<ReturnType<typeof sharedStoreFixture>>;
const source = 'def f(n):\n    return n + 1\nf(2)';
const request = {
  code: source,
  language: 'python',
  functions: [{ name: 'f', line: 1, endLine: 2, parameters: ['n'] }],
  steps: [{ index: 1, line: 1, event: 'call', func: 'f' }],
};
const notes = {
  summary: 'Adds one to the input.',
  pattern: 'Simple function',
  functions: [{ name: 'f', line: 1, purpose: 'Adds one.', returns: 'One greater.' }],
  annotations: [{ line: 1, text: 'Define f.' }],
  stepNotes: [{ index: 1, text: 'Enter f.' }],
};

beforeEach(async () => {
  store = await sharedStoreFixture();
  for (const [name, value] of Object.entries({
    AI_ENABLED: 'true',
    AI_DAILY_LIMIT: '100',
    VERCEL_ENV: 'development',
    LLM_PROVIDER: 'openai-compatible',
    LLM_BASE_URL: 'https://api.groq.com/openai/v1',
    LLM_MODEL: 'openai/gpt-oss-20b',
    LLM_API_KEY: 'groq-fixture-key',
    UPSTASH_REDIS_REST_URL: store.url,
    UPSTASH_REDIS_REST_TOKEN: 'redis-fixture-token',
  }))
    vi.stubEnv(name, value);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await store.close();
});

it('limits schema adaptation to the Groq endpoint', () => {
  expect(generationOptions()).toEqual({ providerOptions: { openai: { strictJsonSchema: false } } });
  vi.stubEnv('LLM_BASE_URL', 'https://api.groq.com.example.org/openai/v1');
  expect(generationOptions()).toEqual({});
  vi.stubEnv('LLM_PROVIDER', 'openai');
  vi.stubEnv('LLM_BASE_URL', 'https://api.groq.com/openai/v1');
  expect(generationOptions()).toEqual({});
  vi.stubEnv('LLM_PROVIDER', 'google');
  expect(generationOptions()).toEqual({ reasoning: 'minimal' });
});

it.each(['valid', 'invalid-output', 'invalid-reference'])(
  'uses Groq-compatible schema mode while retaining local validation: %s',
  async (kind) => {
    const payloads: Record<string, unknown>[] = [];
    const fixture = createServer((req, res) => {
      let text = '';
      req.on('data', (chunk) => {
        text += chunk;
      });
      req.on('end', () => {
        const body = JSON.parse(text);
        payloads.push(body);
        res.setHeader('content-type', 'application/json');
        const format = body.response_format?.json_schema;
        const properties = Object.keys(format?.schema?.properties ?? {});
        const required = new Set(format?.schema?.required ?? []);
        if (format?.strict && properties.some((name) => !required.has(name))) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: {
                message: 'Strict schemas require every property.',
                type: 'invalid_request_error',
              },
            }),
          );
          return;
        }
        const output =
          kind === 'valid'
            ? notes
            : kind === 'invalid-output'
              ? { summary: 'Missing required fields.' }
              : { ...notes, annotations: [{ line: 99, text: 'Outside the source.' }] };
        res.end(
          JSON.stringify({
            id: 'groq-fixture',
            object: 'chat.completion',
            created: 0,
            model: body.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: JSON.stringify(output) },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      });
    });
    await new Promise<void>((resolve) => fixture.listen(0, '127.0.0.1', resolve));
    const address = fixture.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture address');
    const fetch = globalThis.fetch;
    vi.stubGlobal('fetch', (url: RequestInfo | URL, init?: RequestInit) => {
      const target = String(url);
      if (target.startsWith('https://api.groq.com/openai/v1/'))
        return fetch(`http://127.0.0.1:${address.port}${new URL(target).pathname}`, init);
      if (!target.startsWith(store.url)) throw new Error('Unexpected external request');
      return fetch(url, init);
    });
    try {
      const response = await POST(
        new Request('http://localhost/api/analyze', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        }),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject(
        kind === 'valid'
          ? { source: 'ai', enrichment: notes }
          : {
              source: 'static',
              reason: expect.stringContaining('invalid response after one validation retry'),
            },
      );
      expect(payloads).toHaveLength(kind === 'valid' ? 1 : 2);
      for (const body of payloads) {
        expect(body.model).toBe('openai/gpt-oss-20b');
        expect(body.response_format).toMatchObject({
          type: 'json_schema',
          json_schema: { strict: false },
        });
      }
      expect([...store.counters()].find(([key]) => key.includes(':day:'))?.[1].count).toBe(
        payloads.length,
      );
    } finally {
      await new Promise<void>((resolve) => fixture.close(() => resolve()));
    }
  },
);
