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
} from '../src/lib/analysis';
import { inspectJavaScript } from '../src/lib/javascript/analysis';
import { instrumentJavaScript } from '../src/lib/javascript/instrument';
import { JavaScriptTrace } from '../src/lib/javascript/runtime';
import { traceSchema } from '../src/lib/trace';
import { validateSimulation } from '../src/lib/ai/simulation';
let py: PyodideInterface;
beforeAll(async () => {
  py = await loadPyodide();
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
function runJS(code: string) {
  const engine = new JavaScriptTrace(5000);
  const instrumented = instrumentJavaScript(code);
  try {
    new Function(instrumented.hookName, 'console', `"use strict";${instrumented.code}`)(engine, {
      log: engine.output,
    });
    return traceSchema.parse(engine.result());
  } catch (e) {
    return traceSchema.parse(engine.result(e));
  }
}
describe('AST inspection and real-trace estimates', () => {
  it('keys source and implementation independently', async () => {
    const a = await sourceIdentity('impl-a', 'one');
    expect(sameIdentity(a, await sourceIdentity('impl-a', 'one'))).toBe(true);
    expect(sameIdentity(a, await sourceIdentity('impl-b', 'one'))).toBe(false);
    expect(sameIdentity(a, await sourceIdentity('impl-a', 'two'))).toBe(false);
  });
  it.each(['python', 'javascript'] as const)(
    'fits actual linear function steps in %s, omitting demo drivers',
    (language) => {
      const code =
        language === 'python'
          ? 'def total(n: int):\n    value = 0\n    for i in range(n):\n        value += i\n    return value\nprint("demo must be omitted")'
          : 'function total(n) {\n let value=0;\n for(let i=0;i<n;i++){value+=i;}\n return value;\n}\nconsole.log("demo must be omitted");';
      const inspected = language === 'python' ? inspectPython(code) : inspectJavaScript(code);
      expect(inspected.preparationReason).toBeNull();
      expect(inspected.entries[0].time).toBe('O(n) candidate');
      const samples = empiricalSizes.map((n) => {
        const harness = testHarness(
          inspected,
          inspected.entries[0],
          generatedInput('int', n),
          language,
        );
        const result = language === 'python' ? runPython(harness) : runJS(harness);
        expect(result.error).toBeNull();
        expect(result.truncated).toBe(false);
        expect(result.steps.at(-1)?.stdout).not.toContain('demo');
        return { n, steps: result.steps.filter((s) => s.func !== '<module>').length };
      });
      expect(fitComplexity(samples).label).toBe('O(n)');
      expect(samples.at(-1)!.steps).toBeGreaterThan(samples[0].steps);
    },
  );
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
    'function f(a,b){return a+b;}',
    'function f(n=2){return n;}',
    'async function f(n){return n;}',
    'function f({n}){return n;}',
    'function* f(n){yield n;}',
  ])('refuses unsupported JS signature: %s', (code) =>
    expect(inspectJavaScript(code).entries[0].reason).toBeTruthy(),
  );
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
    expect(
      inspectJavaScript('function f(n){for(let i=0;i<n*n;i++){} return n;}').entries[0].time,
    ).toBe('Unknown');
    expect(inspectJavaScript('function f(items){return items.sort();}').entries[0].time).toBe(
      'Unknown',
    );
  });
  it('refuses executable global initialization and same-line Python drivers', () => {
    expect(
      inspectJavaScript('const value=sideEffect(); function f(n){return n;}').preparationReason,
    ).toBeTruthy();
    expect(
      inspectPython('value = side_effect()\ndef f(n):\n    return n').preparationReason,
    ).toBeTruthy();
    expect(
      inspectPython('value = 3; print("driver")\ndef f(n):\n    return n').preparationReason,
    ).toBeTruthy();
  });
  it('ignores comment/string pseudo-loops and counts only real line events', () => {
    expect(inspectJavaScript('function f(n){/*while(true)*/return "for";}').entries[0].time).toBe(
      'O(1) candidate',
    );
    const trace = runJS('let n=0;\nfor(let i=0;i<5;i++){n++;}\nconsole.log(n);');
    const counts = executionCounts(trace);
    expect(counts[2]).toBeGreaterThan(1);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(
      trace.steps.filter((s) => s.event === 'line').length,
    );
    expect(executionCounts({ ...trace, origin: 'ai-simulated' })).toEqual({});
  });
  it('requires complete sample sets and recognizes constant step counts', () => {
    expect(() => fitComplexity([{ n: 4, steps: 3 }])).toThrow();
    expect(fitComplexity(empiricalSizes.map((n) => ({ n, steps: 3 }))).label).toBe('O(1)');
  });
});
const valid = {
  steps: [
    {
      index: 0,
      line: 1,
      event: 'call',
      func: '<module>',
      callStack: [{ id: 'root', func: '<module>', line: 1, locals: {} }],
      globals: {},
      heap: {},
      stdout: '',
    },
    {
      index: 1,
      line: 1,
      event: 'return',
      func: '<module>',
      callStack: [{ id: 'root', func: '<module>', line: 1, locals: {} }],
      globals: {},
      heap: {},
      stdout: '',
    },
  ],
  truncated: false,
  error: null,
  elapsed: 0,
};
describe('untrusted AI-simulated trace structural validation', () => {
  it('rejects unsafe integer numbers and accepts exact decimal strings', () => {
    const trace = structuredClone(valid);
    Object.assign(trace.steps[1].globals, { large: 9007199254740992 });
    expect(() => validateSimulation(trace, 'int main(){}', 100)).toThrow();
    Object.assign(trace.steps[1].globals, { large: '9007199254740993' });
    expect(validateSimulation(trace, 'int main(){}', 100).steps[1].globals.large).toBe(
      '9007199254740993',
    );
  });
  it('does not resolve inherited Object properties as declared heap objects', () => {
    const trace = structuredClone(valid);
    Object.assign(trace.steps[1].globals, { x: { ref: 'constructor' } });
    expect(() => validateSimulation(trace, 'int main(){}', 100)).toThrow(
      'Dangling simulated heap reference',
    );
  });
  it('labels accepted traces and retains exact values', () => {
    expect(validateSimulation(valid, 'int main(){}', 100)).toMatchObject({
      ...valid,
      origin: 'ai-simulated',
    });
  });
  it.each([
    'line',
    'frame-line',
    'index',
    'pop',
    'push',
    'heap',
    'cap',
    'unknown',
    'elapsed',
    'stdout',
  ] as const)('rejects, never repairs: %s', (kind) => {
    const trace = structuredClone(valid);
    if (kind === 'line') trace.steps[1].line = 2;
    if (kind === 'frame-line') trace.steps[1].callStack[0].line = 2;
    if (kind === 'index') trace.steps[1].index = 9;
    if (kind === 'pop') trace.steps[1].callStack = [];
    if (kind === 'push') trace.steps[1].event = 'call';
    if (kind === 'heap') Object.assign(trace.steps[1].globals, { x: { ref: 'missing' } });
    if (kind === 'unknown') Object.assign(trace.steps[1], { fabricated: true });
    if (kind === 'elapsed') trace.elapsed = 10;
    if (kind === 'stdout') {
      trace.steps[0].stdout = 'a';
      trace.steps[1].stdout = 'b';
    }
    expect(() => validateSimulation(trace, 'int main(){}', kind === 'cap' ? 1 : 100)).toThrow();
  });
});
