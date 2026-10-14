import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { analyzeAdvice, simulate, simulationRequestSchema } from '../src/lib/ai/phase3';
import { sourceIdentity } from '../src/lib/analysis';
import { inspectJavaScript } from '../src/lib/javascript/analysis';
import { POST } from '../src/app/api/analyze/route';
import { sharedStoreFixture } from './shared-store-fixture';
let store: Awaited<ReturnType<typeof sharedStoreFixture>>;
beforeEach(async () => {
  store = await sharedStoreFixture();
  vi.stubEnv('AI_ENABLED', 'true');
  vi.stubEnv('AI_DAILY_LIMIT', '100');
  vi.stubEnv('VERCEL_ENV', 'development');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', store.url);
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'redis-fixture-token');
});
const code = 'function f(n) { return n + 1; }';
const validAdvice = {
  summary: 'Possible boundary cases.',
  issues: [{ line: 1, severity: 'edge-case', message: 'Check negative values.' }],
  optimization: {
    code: 'function f(n) { return 1 + n; }',
    explanation: 'A proposal, not verified.',
    lines: [1],
  },
  tests: [{ name: 'zero', entry: 'f', line: 1, argument: 0, expectedOutput: '1' }],
};
async function providerFixture(output: (call: number) => unknown, stall = false) {
  let calls = 0;
  const payloads: unknown[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (b) => (body += b));
    req.on('end', () => {
      calls++;
      payloads.push(JSON.parse(body));
      if (stall) return;
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
              message: { role: 'assistant', content: JSON.stringify(output(calls)) },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  vi.stubEnv('LLM_PROVIDER', 'openai-compatible');
  vi.stubEnv('LLM_MODEL', 'fixture-model');
  vi.stubEnv('LLM_API_KEY', 'fixture-key');
  vi.stubEnv('LLM_BASE_URL', `http://127.0.0.1:${address.port}/v1`);
  return {
    calls: () => calls,
    payloads,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
afterEach(async () => {
  await store.close();
  vi.unstubAllEnvs();
});
describe('Phase 3 strict provider pipeline', () => {
  it('rejects entry metadata outside actual source lines before contacting storage/providers', async () => {
    const input = {
      mode: 'analysis',
      code,
      language: 'javascript',
      identity: await sourceIdentity('draft', code),
      entries: inspectJavaScript(code).entries.map((e) => ({ ...e, line: 999 })),
    };
    const response = await POST(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(400);
  });
  it('retries an out-of-source reference once, validates tests and preserves identity', async () => {
    const fixture = await providerFixture((call) =>
      call === 1
        ? { ...validAdvice, issues: [{ line: 999, severity: 'bug', message: 'Invalid source' }] }
        : validAdvice,
    );
    try {
      const identity = await sourceIdentity('impl-v1', code);
      const result = await analyzeAdvice({
        mode: 'analysis',
        code,
        language: 'javascript',
        identity,
        entries: inspectJavaScript(code).entries,
      });
      expect(result).toEqual({ source: 'ai', identity, advice: validAdvice });
      expect(fixture.calls()).toBe(2);
      const sent = fixture.payloads[0] as Record<string, unknown>;
      expect(sent.max_tokens ?? sent.max_completion_tokens).toBe(3500);
      const prompt = JSON.stringify(fixture.payloads);
      expect(prompt).not.toContain('stdin');
      expect(prompt).not.toContain('runtime variable');
    } finally {
      await fixture.close();
    }
  });
  it('falls back after exactly two malformed test references', async () => {
    const fixture = await providerFixture(() => ({
      ...validAdvice,
      tests: [{ ...validAdvice.tests[0], entry: 'fabricated' }],
    }));
    try {
      expect(
        await analyzeAdvice({
          mode: 'analysis',
          code,
          language: 'javascript',
          identity: await sourceIdentity('draft', code),
          entries: inspectJavaScript(code).entries,
        }),
      ).toMatchObject({ source: 'static' });
      expect(fixture.calls()).toBe(2);
    } finally {
      await fixture.close();
    }
  });
  it('has one total 18-second deadline even when a provider stalls', async () => {
    const fixture = await providerFixture(() => validAdvice, true);
    const started = performance.now();
    try {
      expect(
        await analyzeAdvice({
          mode: 'analysis',
          code,
          language: 'javascript',
          identity: await sourceIdentity('draft', code),
          entries: inspectJavaScript(code).entries,
        }),
      ).toMatchObject({ source: 'static' });
      expect(performance.now() - started).toBeGreaterThan(17500);
      expect(performance.now() - started).toBeLessThan(20500);
      expect(fixture.calls()).toBe(1);
    } finally {
      await fixture.close();
    }
  });
  it('rejects consent omissions, real execution languages, and mismatched hashes before calls', async () => {
    const base = {
      mode: 'simulate',
      code: 'int main(){}',
      language: 'cpp',
      identity: await sourceIdentity('cpp', 'int main(){}'),
      maxSteps: 100,
    };
    expect(simulationRequestSchema.safeParse(base).success).toBe(false);
    expect(simulationRequestSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    for (const language of ['python', 'javascript'])
      expect(simulationRequestSchema.safeParse({ ...base, consent: true, language }).success).toBe(
        false,
      );
    const response = await POST(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...base,
          consent: true,
          identity: { implementationId: 'cpp', sourceHash: '0'.repeat(64) },
        }),
      }),
    );
    expect(response.status).toBe(400);
  });
  it('rejects malformed simulated call stacks twice with no repaired trace', async () => {
    const fixture = await providerFixture(() => ({
      steps: [
        {
          index: 0,
          line: 1,
          event: 'line',
          func: '<module>',
          callStack: [],
          globals: {},
          heap: {},
          stdout: '',
        },
        {
          index: 1,
          line: 1,
          event: 'return',
          func: '<module>',
          callStack: [],
          globals: {},
          heap: {},
          stdout: '',
        },
      ],
      truncated: false,
      error: null,
      elapsed: 0,
    }));
    try {
      const result = await simulate({
        mode: 'simulate',
        code: 'int main(){}',
        language: 'cpp',
        identity: await sourceIdentity('cpp', 'int main(){}'),
        consent: true,
        maxSteps: 100,
      });
      expect(result.source).toBe('static');
      expect(result).not.toHaveProperty('trace');
      expect(fixture.calls()).toBe(2);
    } finally {
      await fixture.close();
    }
  });
});
