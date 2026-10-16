import { limits } from "../src/shared/limits";
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { readFileSync } from 'node:fs';
import {
  inspectionSchema,
  testHarness,
  fitComplexity,
  generatedInput,
  empiricalSizes,
  executionCounts,
  sourceIdentity,
  sameIdentity,
} from "../src/features/insights/public/model/analysis";
import { traceSchema } from "../src/shared/trace";
let py: PyodideInterface;
beforeAll(async () => {
  py = await loadPyodide();
  py.globals.set('_codelens_limits_json', JSON.stringify(limits));
  py.runPython('import json as _limits_json; _codelens_limits = _limits_json.loads(_codelens_limits_json)');
  py.globals.delete('_codelens_limits_json');
  py.runPython(readFileSync('public/tracer.py', 'utf8'));
  py.runPython(readFileSync('public/analysis.py', 'utf8'));
});
function inspectPython(code: string) {
  py.globals.set('_request_json', JSON.stringify({ code }));
  return inspectionSchema.parse(JSON.parse(py.runPython('inspect_code(_request_json)')));
}
function runPython(code: string) {
  py.globals.set('_request_json', JSON.stringify({ code, stdin: '', maxSteps: 5000 }));
  return traceSchema.parse(JSON.parse(py.runPython('run_trace(_request_json)')));
}
describe('AST inspection and real-trace estimates', () => {
  it('keys source and implementation independently', async () => {
    const a = await sourceIdentity('impl-a', 'one');
    expect(sameIdentity(a, await sourceIdentity('impl-a', 'one'))).toBe(true);
    expect(sameIdentity(a, await sourceIdentity('impl-b', 'one'))).toBe(false);
    expect(sameIdentity(a, await sourceIdentity('impl-a', 'two'))).toBe(false);
  });
  it('fits actual linear function steps in Python, omitting demo drivers', () => {
    const code =
      'def total(n: int):\n    value = 0\n    for i in range(n):\n        value += i\n    return value\nprint("demo must be omitted")';
    const inspected = inspectPython(code);
    expect(inspected.preparationReason).toBeNull();
    expect(inspected.entries[0].time).toBe('O(n) candidate');
    const samples = empiricalSizes.map((n) => {
      const harness = testHarness(
        inspected,
        inspected.entries[0],
        generatedInput('int', n),
        'python',
      );
      const result = runPython(harness);
      expect(result.error).toBeNull();
      expect(result.truncated).toBe(false);
      expect(result.steps.at(-1)?.stdout).not.toContain('demo');
      return { n, steps: result.steps.filter((s) => s.func !== '<module>').length };
    });
    expect(fitComplexity(samples).label).toBe('O(n)');
    expect(samples.at(-1)!.steps).toBeGreaterThan(samples[0].steps);
  });
  it('handles typed lists and strings and rejects mismatched tests', () => {
    for (const [code, arg] of [
      ['def size(items: list[int]):\n    return len(items)', [3, 2, 1]],
      ['def size(text: str):\n    return len(text)', 'abc'],
    ] as const) {
      const inspected = inspectPython(code);
      const result = runPython(
        testHarness(
          inspected,
          inspected.entries[0],
          Array.isArray(arg) ? [...arg] : (arg as string),
          'python',
          true,
        ),
      );
      expect(result.error).toBeNull();
      expect(result.steps.at(-1)?.stdout).toBe('3\n');
      expect(() => testHarness(inspected, inspected.entries[0], 4, 'python')).toThrow();
    }
  });
  it.each([
    'def f(a,b):\n    return a+b',
    'def f(n=2):\n    return n',
    'async def f(n):\n    return n',
    'def f(*args):\n    return args',
    'def f(n):\n    yield n',
    'def f(n: float):\n    return n',
  ])('refuses unsupported Python signature: %s', (code) =>
    expect(inspectPython(code).entries[0].reason).toBeTruthy(),
  );
  it('does not claim recursion, hidden library calls or nonlinear bounds are linear', () => {
    expect(inspectPython('def f(n):\n    return f(n-1)').entries[0].time).toBe('Unknown');
    expect(inspectPython('def f(n):\n    for i in range(n*n):\n        pass').entries[0].time).toBe(
      'Unknown',
    );
  });
  it('refuses executable global initialization and same-line Python drivers', () => {
    expect(
      inspectPython('value = side_effect()\ndef f(n):\n    return n').preparationReason,
    ).toBeTruthy();
    expect(
      inspectPython('value = 3; print("driver")\ndef f(n):\n    return n').preparationReason,
    ).toBeTruthy();
  });
  it('ignores comment/string pseudo-loops and counts only real line events in Python', () => {
    expect(inspectPython('def f(n):\n    """while True"""\n    return "for"').entries[0].time).toBe(
      'O(1) candidate',
    );
    const trace = runPython('n = 0\nfor i in range(5):\n    n += 1\nprint(n)');
    const counts = executionCounts(trace);
    expect(counts[3]).toBeGreaterThan(1);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(
      trace.steps.filter((s) => s.event === 'line').length,
    );
  });
  it('requires complete sample sets and recognizes constant step counts', () => {
    expect(() => fitComplexity([{ n: 4, steps: 3 }])).toThrow();
    expect(fitComplexity(empiricalSizes.map((n) => ({ n, steps: 3 }))).label).toBe('O(1)');
  });
});
