import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import snapshot from '../src/generated/library.json';
import { examples } from '../src/lib/examples';
import { exampleCode } from '../src/lib/javascript-examples';
import { instrumentJavaScript } from '../src/lib/javascript/instrument';
import { JavaScriptTrace } from '../src/lib/javascript/runtime';
import { analyzeJavaScript } from '../src/lib/javascript/ast';
import { inspectJavaScript } from '../src/lib/javascript/analysis';
import { normalizePythonOutline } from '../src/lib/breakdown';
import { inspectionSchema } from '../src/lib/analysis';
import { traceSchema, type TraceResult } from '../src/lib/trace';
import { detectVisualModels, sourceHints } from '../src/lib/visualizer/detectors';

const location = 'tests/fixtures/revamp/catalog.json';
const updating = process.env.CODELENS_UPDATE_GOLDENS === '1';
const baseline = existsSync(location) ? JSON.parse(readFileSync(location, 'utf8')) : null;
const collected: Record<string, unknown> = {};
const latest = snapshot.index.implementations.map((row) =>
  snapshot.implementations.find((i) => i.id === row.id)!,
);
const corpus = [
  ...latest.map((row) => ({
    id: row.id,
    language: row.language,
    code: row.code,
    stdin: row.fixture.stdin,
  })),
  ...examples.map((example) => ({
    id: `example:${example.id}:javascript`,
    language: 'javascript',
    code: exampleCode(example, 'javascript'),
    stdin: '',
  })),
].sort((a, b) => a.id.localeCompare(b.id));
let python: PyodideInterface;

function stable(value: unknown): unknown {
  if (value instanceof Map)
    return {
      map: [...value.entries()]
        .map(([k, v]) => [stable(k), stable(v)])
        .sort((a, b) => JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]))),
    };
  if (value instanceof Set)
    return {
      set: [...value]
        .map(stable)
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    };
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stable(child)]),
    );
  return value;
}

function normalized(trace: TraceResult): Omit<TraceResult, 'elapsed'> {
  const { elapsed, ...rest } = trace;
  void elapsed;
  return {
    ...rest,
    steps: rest.steps.map((step) => ({
      ...step,
      heap: Object.fromEntries(
        Object.entries(step.heap).map(([key, value]) => [
          key,
          value.type === 'set' || value.type === 'frozenset'
            ? {
                ...value,
                items: [...(value.items ?? [])].sort((a, b) =>
                  JSON.stringify(a).localeCompare(JSON.stringify(b)),
                ),
              }
            : value,
        ]),
      ),
    })),
  };
}

beforeAll(async () => {
  if (!updating && !baseline) return;
  python = await loadPyodide();
  for (const harness of ['tracer', 'outline', 'analysis'])
    python.runPython(readFileSync(`public/${harness}.py`, 'utf8'));
});

afterAll(() => {
  if (updating && Object.keys(collected).length === corpus.length) {
    mkdirSync('tests/fixtures/revamp', { recursive: true });
    writeFileSync(location, JSON.stringify({ version: 1, cases: stable(collected) }) + '\n');
  }
});

describe('revamp real-runtime golden parity', () => {
  it('covers all 343 current implementations and 17 explicit JavaScript examples', () => {
    expect(latest).toHaveLength(343);
    expect(corpus).toHaveLength(360);
    expect(new Set(corpus.map((row) => row.id)).size).toBe(360);
    if (!updating)
      expect(Object.keys(baseline?.cases ?? {}).sort()).toEqual(corpus.map((row) => row.id).sort());
  });

  it.each(corpus)('$id retains trace, sampled models, static outline and analysis', (row) => {
    if (!updating)
      expect(
        baseline,
        'Golden baseline must exist; updates require explicit review',
      ).not.toBeNull();
    let trace: TraceResult;
    let outline: unknown;
    let inspection: unknown;
    if (row.language === 'python') {
      python.globals.set(
        '_request_json',
        JSON.stringify({ code: row.code, stdin: row.stdin, maxSteps: 5000 }),
      );
      trace = traceSchema.parse(JSON.parse(python.runPython('run_trace(_request_json)')));
      outline = normalizePythonOutline(JSON.parse(python.runPython('outline_code(_request_json)')));
      inspection = inspectionSchema.parse(
        JSON.parse(python.runPython('inspect_code(_request_json)')),
      );
    } else {
      const engine = new JavaScriptTrace(5000);
      const code = instrumentJavaScript(row.code);
      try {
        new Function(code.hookName, 'console', 'input', `"use strict";${code.code}`)(
          engine,
          { log: engine.output },
          () => row.stdin,
        );
        trace = traceSchema.parse(engine.result());
      } catch (error) {
        trace = traceSchema.parse(engine.result(error));
      }
      outline = analyzeJavaScript(row.code);
      inspection = inspectJavaScript(row.code);
    }
    expect(trace.error).toBeNull();
    expect(trace.truncated).toBe(false);
    const clean = normalized(trace);
    const indices = [
      ...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.floor((clean.steps.length - 1) * f))),
    ];
    const hints = sourceHints(row.code, row.language as 'python' | 'javascript');
    const record = stable({
      language: row.language,
      sourceHash: createHash('sha256').update(row.code).digest('hex'),
      traceHash: createHash('sha256')
        .update(JSON.stringify(stable(clean)))
        .digest('hex'),
      steps: clean.steps.length,
      models: indices.map((index) => ({
        index,
        models: detectVisualModels(clean.steps[index], hints),
      })),
      outline,
      inspection,
    });
    collected[row.id] = record;
    if (!updating) expect(record).toEqual(baseline.cases[row.id]);
  });
});
