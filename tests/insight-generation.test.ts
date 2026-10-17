import { afterEach, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { POST } from '../src/app/api/analyze/route';
import { sharedStoreFixture } from './shared-store-fixture';

afterEach(() => vi.unstubAllEnvs());
it.each(['python', 'for.*range\\(len\\(numbers\\)', 'Three‑way partitioning — Dutch national flag', 'invalid-reference', 'invalid-schema'])('keeps cosmetic headings separate from schema/source validation: %s', async pattern => {
  const store = await sharedStoreFixture();
  const payloads: { messages: { role: string; content: string }[] }[] = [];
  const provider = createServer((request, response) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      payloads.push(JSON.parse(body));
      response.setHeader('Content-Type', 'application/json');
      const output = pattern === 'invalid-schema' ? { summary: 'Missing required fields.' } : { summary: 'Source explanation.', pattern, functions: [], annotations: pattern === 'invalid-reference' ? [{ line: 99, text: 'Invalid line.' }] : [], stepNotes: [] };
      response.end(JSON.stringify({ id: 'local', object: 'chat.completion', created: 0, model: 'fixture', choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(output) }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
    });
  });
  await new Promise<void>(resolve => provider.listen(0, '127.0.0.1', resolve));
  const address = provider.address();
  if (!address || typeof address === 'string') throw new Error('No local fixture port');
  for (const [name, value] of Object.entries({ AI_ENABLED: 'true', AI_DAILY_LIMIT: '100', VERCEL_ENV: 'development', LLM_PROVIDER: 'openai-compatible', LLM_BASE_URL: `http://127.0.0.1:${address.port}/v1`, LLM_MODEL: 'fixture', LLM_API_KEY: 'fixture-key', UPSTASH_REDIS_REST_URL: store.url, UPSTASH_REDIS_REST_TOKEN: 'redis-fixture-token' })) vi.stubEnv(name, value);
  try {
    const result = await POST(new Request('http://localhost/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'print(1)', language: 'python', format: 'structured', functions: [], steps: [] }) }));
    const invalid = pattern.startsWith('invalid-');
    expect(await result.json()).toMatchObject(invalid ? { source: 'static', reason: expect.stringContaining('invalid response') } : { source: 'ai', enrichment: { summary: 'Source explanation.' } });
    expect(payloads).toHaveLength(invalid ? 2 : 1);
    expect(payloads[0].messages.find(message => message.role === 'system')?.content).toContain('plain-English');
    expect(payloads[0].messages.find(message => message.role === 'system')?.content).toContain('Do not provide complexity estimates');
    expect([...store.counters()].find(([key]) => key.includes(':day:'))?.[1].count).toBe(invalid ? 2 : 1);
  } finally {
    provider.closeAllConnections();
    await new Promise<void>(resolve => provider.close(() => resolve()));
    await store.close();
  }
});
