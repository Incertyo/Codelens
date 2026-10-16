import { afterAll, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { POST, GET } from '../src/app/api/analyze/route';
import { GET as library } from '../src/app/api/library/route';
import { analyzeJavaScript } from '../src/lib/javascript/ast';
import { inspectJavaScript } from '../src/lib/javascript/analysis';
import { instrumentJavaScript } from '../src/lib/javascript/instrument';
import { JavaScriptTrace } from '../src/lib/javascript/runtime';
import { decodeShare, encodeShare, encodeShortShare } from '../src/lib/share';
import { sharedStoreFixture } from './shared-store-fixture';

const location = 'tests/fixtures/revamp/contracts.json';
const updating = process.env.CODELENS_UPDATE_GOLDENS === '1';
const baseline = existsSync(location) ? JSON.parse(readFileSync(location, 'utf8')) : null;
const collected: Record<string, unknown> = {};
function compare(name: string, actual: unknown) {
  collected[name] = actual;
  if (!updating) {
    const original = baseline?.[name];
    const expected = name === 'api' ? {
      ...Object.fromEntries(Object.entries(original).filter(([key]) => key !== 'simulationRequest')),
      responses: Object.fromEntries(Object.entries(original.responses).filter(([key]) => key !== 'simulation')),
      providerRequests: original.providerRequests.slice(0, 2),
    } : original;
    expect(actual).toEqual(expected);
  }
}
afterAll(() => {
  if (updating && Object.keys(collected).length === 2) {
    mkdirSync('tests/fixtures/revamp', { recursive: true });
    writeFileSync(location, JSON.stringify(collected, null, 2) + '\n');
  }
});

it('retains exact legacy, compact, Unicode, unsupported and invalid share contracts', () => {
  const cases = [
    { code: 'print("hello 🌱")\n', stdin: 'Ada\n', language: 'python' },
    { code: 'console.log(input());', stdin: 'hello', language: 'javascript' },
    { code: 'int main() { return 0; }', stdin: '', language: 'cpp' },
    {
      code: 'class Main { public static void main(String[] args) {} }',
      stdin: '',
      language: 'java',
    },
  ];
  compare('share', {
    cases: cases.map((value) => {
      const legacy = encodeShare(value.code, value.stdin, value.language);
      const compact = encodeShortShare(value.code, value.stdin, value.language);
      expect(decodeShare(legacy)).toEqual(value);
      expect(decodeShare(compact)).toEqual(value);
      return {
        legacy,
        compact,
        decoded: decodeShare(legacy),
        compactDecoded: decodeShare(compact),
      };
    }),
    invalid: ['', '#s=broken', '#code=broken', '#s=' + 'x'.repeat(100001)].map(decodeShare),
  });
});

it('retains real SDK and route contracts using loopback provider and store fixtures', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'codelens-parity-'));
  const store = await sharedStoreFixture();
  const code =
    'function total(n) {\n let value=0;\n for(let i=0;i<n;i++){value+=i;}\n return value;\n}\nconsole.log(total(4));';
  const ast = analyzeJavaScript(code);
  const inspection = inspectJavaScript(code);
  const instrumented = instrumentJavaScript(code);
  const engine = new JavaScriptTrace(5000);
  new Function(instrumented.hookName, 'console', `"use strict";${instrumented.code}`)(engine, {
    log: engine.output,
  });
  const sampled = engine
    .result()
    .steps.filter((step) => step.func === 'total')
    .slice(0, 3)
    .map(({ index, line, event, func }) => ({ index, line, event, func }));
  const notes = {
    summary: 'Adds integers.',
    pattern: 'Loop',
    functions: [{ name: 'total', line: 1, purpose: 'Adds integers.', returns: 'A total.' }],
    annotations: [{ line: 3, text: 'Accumulate.' }],
    stepNotes: [{ index: sampled[0].index, text: 'Enter the function.' }],
  };
  const advice = {
    summary: 'Review the boundary.',
    issues: [{ line: 3, severity: 'edge-case', message: 'Check zero.' }],
    optimization: {
      code: code.replace('value+=i', 'value=value+i'),
      explanation: 'Unverified proposal.',
      lines: [3],
    },
    tests: [{ name: 'zero', entry: 'total', line: 1, argument: 0, expectedOutput: '0\n' }],
  };
  const requests: unknown[] = [];
  let output: unknown = notes;
  const provider = createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (part) => {
      body += part;
    });
    req.on('end', () => {
      requests.push(JSON.parse(body));
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          id: 'fixture',
          object: 'chat.completion',
          created: 0,
          model: 'parity-model',
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
  await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
  const address = provider.address();
  if (!address || typeof address === 'string') throw new Error('Missing local fixture address');
  const responses: Record<string, unknown> = {};
  const capture = async (key: string, response: Response) => {
    responses[key] = {
      status: response.status,
      cache: response.headers.get('cache-control'),
      body: await response.json(),
    };
  };
  const post = (body: unknown, contentType = 'application/json') =>
    POST(
      new Request('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'content-type': contentType },
        body: JSON.stringify(body),
      }),
    );
  try {
    for (const [key, value] of Object.entries({
      AI_ENABLED: 'true',
      VERCEL_ENV: 'development',
      AI_DAILY_LIMIT: '100',
      LLM_PROVIDER: 'openai-compatible',
      LLM_MODEL: 'parity-model',
      LLM_API_KEY: 'fixture-key',
      LLM_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
      UPSTASH_REDIS_REST_URL: store.url,
      UPSTASH_REDIS_REST_TOKEN: 'redis-fixture-token',
      CODELENS_RATE_NAMESPACE: 'parity',
      CODELENS_STATIC_LIBRARY: '1',
      CODELENS_LIBRARY_DB: join(directory, 'fixture.sqlite'),
    }))
      vi.stubEnv(key, value);
    await capture('ready', await GET(new Request('http://localhost/api/analyze')));
    await capture('wrongContentType', await post({}, 'text/plain'));
    await capture('invalidMode', await post({ mode: 'missing' }));
    const notesRequest = {
      code,
      language: 'javascript',
      functions: ast.functions.map(({ name, line, endLine, parameters }) => ({
        name,
        line,
        endLine,
        parameters,
      })),
      steps: sampled,
    };
    await capture('notes', await post(notesRequest));
    output = advice;
    const identity = {
      implementationId: 'draft:javascript',
      sourceHash: createHash('sha256').update(code).digest('hex'),
    };
    const adviceRequest = {
      mode: 'analysis',
      code,
      language: 'javascript',
      identity,
      entries: inspection.entries,
    };
    await capture('advice', await post(adviceRequest));
    await capture(
      'wrongIdentity',
      await post({ ...adviceRequest, identity: { ...identity, sourceHash: '0'.repeat(64) } }),
    );
    await capture('saveAnalysisMissingHash', await post({ mode: 'save_analysis' }));
    await capture('saveComplexityMissingHash', await post({ mode: 'save_complexity' }));
    await capture(
      'cacheMiss',
      await GET(new Request('http://localhost/api/analyze?sourceHash=' + '0'.repeat(64))),
    );
    await capture(
      'invalidLibrary',
      library(new Request('http://localhost/api/library?id=missing')),
    );
    const index = await library(new Request('http://localhost/api/library')).json();
    expect(index.algorithms).toHaveLength(309);
    responses.library = {
      algorithms: index.algorithms.map((row: { id: string }) => row.id),
      implementations: index.implementations,
    };
    expect(requests).toHaveLength(2);
    const prompts = JSON.stringify(
      requests.map((request) =>
        (request as { messages: { role: string; content: string }[] }).messages.filter(
          (message) => message.role === 'user',
        ),
      ),
    );
    expect(prompts).not.toContain('stdin');
    expect(prompts).not.toContain('stdout');
    expect(prompts).not.toContain('globals');
    compare('api', {
      notesRequest,
      adviceRequest,
      responses,
      providerRequests: requests,
    });
  } finally {
    await new Promise<void>((resolve) => provider.close(() => resolve()));
    await store.close();
    vi.unstubAllEnvs();
    for (const file of readdirSync(directory)) unlinkSync(join(directory, file));
    rmdirSync(directory);
  }
});
