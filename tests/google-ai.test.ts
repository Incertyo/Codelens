import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../src/app/api/analyze/route';
import { sharedStoreFixture } from './shared-store-fixture';
import { isProviderQuotaError } from '../src/lib/ai/provider-quota';
import { providerOutputSchema } from '../src/lib/ai/output-schema';
import { enrichmentSchema } from '../src/lib/breakdown';
import { sourceIdentity } from '../src/lib/analysis';
import { inspectJavaScript } from '../src/lib/javascript/analysis';

let store: Awaited<ReturnType<typeof sharedStoreFixture>>;
const code = 'function f(n){return n+1;}\nf(2);';
const input = {
  code,
  language: 'javascript',
  functions: [{ name: 'f', line: 1, endLine: 1, parameters: ['n'] }],
  steps: [{ index: 1, line: 1, event: 'call', func: 'f' }],
};
const valid = {
  summary: 'Adds one.',
  pattern: 'Simple function',
  functions: [{ name: 'f', line: 1, purpose: 'Adds one.', returns: 'One greater.' }],
  annotations: [{ line: 1, text: 'Function definition.' }],
  stepNotes: [{ index: 1, text: 'Enter f.' }],
};
beforeEach(async () => {
  store = await sharedStoreFixture();
  for (const [key, value] of Object.entries({
    AI_ENABLED: 'true',
    AI_DAILY_LIMIT: '100',
    VERCEL_ENV: 'development',
    LLM_PROVIDER: 'google',
    LLM_API_KEY: 'google-fixture-key',
    LLM_MODEL: 'configured-fixture-model',
    LLM_BASE_URL: '',
    UPSTASH_REDIS_REST_URL: store.url,
    UPSTASH_REDIS_REST_TOKEN: 'redis-fixture-token',
  }))
    vi.stubEnv(key, value);
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await store.close();
});
const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
function googleFixture(output: unknown, status = 200) {
  const original = globalThis.fetch;
  const requests: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', async (url: RequestInfo | URL, init?: RequestInit) => {
    if (!String(url).startsWith('https://generativelanguage.googleapis.com/'))
      return original(url, init);
    requests.push({
      url: String(url),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)),
    });
    return Response.json(
      status === 200
        ? {
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: [
                    {
                      text: JSON.stringify(
                        typeof output === 'function' ? output(requests.length) : output,
                      ),
                    },
                  ],
                },
                finishReason: 'STOP',
              },
            ],
            usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
          }
        : {
            error: {
              code: status,
              status: status === 429 ? 'RESOURCE_EXHAUSTED' : 'INVALID_ARGUMENT',
              message: 'private provider diagnostic',
            },
          },
      { status },
    );
  });
  return requests;
}
describe('actual Google SDK contract through the route', () => {
  it('uses the environment model and AI Studio header and validates returned notes', async () => {
    const requests = googleFixture(valid);
    const response = await post(input);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ source: 'ai', enrichment: valid });
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain('/models/configured-fixture-model:generateContent');
    expect(requests[0].headers.get('x-goog-api-key')).toBe('google-fixture-key');
    expect(JSON.stringify(requests[0].body)).not.toContain('maxItems');
    expect(JSON.stringify(requests[0].body)).not.toContain('maxLength');
    expect(
      (requests[0].body.generationConfig as Record<string, unknown>).thinkingConfig,
    ).toBeDefined();
  });
  it.each([400, 401, 403, 404, 503])(
    'does not spend a validation retry on provider HTTP %s',
    async (status) => {
      const requests = googleFixture(null, status);
      const response = await post(input);
      expect(response.status).toBe(503);
      const result = await response.json();
      expect(result.code).toMatch(/^provider_(request|auth|model|unavailable)$/);
      expect(JSON.stringify(result)).not.toContain('private provider diagnostic');
      expect(requests).toHaveLength(1);
      expect(
        [...store.counters()]
          .filter(([key]) => key.includes(':day:'))
          .map(([, value]) => value.count),
      ).toEqual([1]);
    },
  );
  it('validates Google advice and supplies reference feedback for the only retry', async () => {
    const advice = {
      summary: 'Check bounds.',
      issues: [],
      optimization: null,
      tests: [{ name: 'zero', entry: 'f', line: 1, argument: 0, expectedOutput: '1' }],
    };
    const requests = googleFixture((call: number) =>
      call === 1 ? { ...advice, tests: [{ ...advice.tests[0], entry: 'invented' }] } : advice,
    );
    const response = await post({
      mode: 'analysis',
      code,
      language: 'javascript',
      identity: await sourceIdentity('draft', code),
      entries: inspectJavaScript(code).entries,
    });
    expect((await response.json()).advice).toEqual(advice);
    expect(requests).toHaveLength(2);
    expect(JSON.stringify(requests[1].body)).toContain('argument type');
  });
  it.each(['cpp', 'java'])(
    'accepts a balanced Google simulation for %s after rejecting an invalid stack',
    async (language) => {
      const frame = { id: 'root', func: '<module>', line: 1, locals: {} };
      const step = {
        line: 1,
        func: '<module>',
        callStack: [frame],
        globals: {},
        heap: {},
        stdout: '',
      };
      const trace = {
        steps: [
          { ...step, index: 0, event: 'call' },
          { ...step, index: 1, event: 'return' },
        ],
        truncated: false,
        error: null,
        elapsed: 0,
      };
      const requests = googleFixture((call: number) =>
        call === 1 ? { ...trace, steps: trace.steps.map((s) => ({ ...s, callStack: [] })) } : trace,
      );
      const source = language === 'cpp' ? 'int main(){}' : 'class Main {}';
      const response = await post({
        mode: 'simulate',
        code: source,
        language,
        identity: await sourceIdentity('draft', source),
        consent: true,
        maxSteps: 100,
      });
      expect((await response.json()).trace).toMatchObject({ ...trace, origin: 'ai-simulated' });
      expect(requests).toHaveLength(2);
      expect(JSON.stringify(requests[1].body)).toContain('Invalid simulated frame push');
    },
  );
  it.each(['notes', 'analysis', 'simulate'])(
    'does not retry provider quota failures for %s',
    async (mode) => {
      const requests = googleFixture(null, 429);
      let body: unknown = input;
      if (mode === 'analysis')
        body = {
          mode,
          code,
          language: 'javascript',
          identity: await sourceIdentity('draft', code),
          entries: inspectJavaScript(code).entries,
        };
      if (mode === 'simulate')
        body = {
          mode,
          code,
          language: 'cpp',
          identity: await sourceIdentity('draft', code),
          consent: true,
          maxSteps: 100,
        };
      const response = await post(body);
      expect(response.status).toBe(429);
      const result = await response.json();
      expect(result).toMatchObject({
        source: 'static',
        code: 'provider_quota',
        reason: expect.stringContaining('AI notes are paused: provider quota reached'),
      });
      expect(JSON.stringify(result)).not.toContain('private provider diagnostic');
      expect(requests).toHaveLength(1);
      expect(
        [...store.counters()].filter(([key]) => key.includes(':day:')).map(([, v]) => v.count),
      ).toEqual([1]);
    },
  );
  it('still rejects oversized output even with relaxed outgoing Google constraints', async () => {
    const schema = providerOutputSchema(enrichmentSchema);
    if (!('validate' in schema)) throw new Error('Expected Google schema');
    expect(await schema.validate!({ ...valid, summary: 'x'.repeat(1201) })).toMatchObject({
      success: false,
    });
    const requests = googleFixture({ ...valid, annotations: [{ line: 999, text: 'Invented' }] });
    expect((await (await post(input)).json()).source).toBe('static');
    expect(requests).toHaveLength(2);
  });
  it('recognizes structured RESOURCE_EXHAUSTED independently of HTTP 429', () => {
    expect(
      isProviderQuotaError({
        cause: { responseBody: JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED' } }) },
      }),
    ).toBe(true);
    expect(isProviderQuotaError({ statusCode: 400, responseBody: 'not JSON' })).toBe(false);
    expect(isProviderQuotaError(new Error('RESOURCE_EXHAUSTED in arbitrary text'))).toBe(false);
  });
});
