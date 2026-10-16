import { limits } from '../src/shared/limits';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { readFileSync } from 'node:fs';
import { executeJavaScriptMeasurement } from '../src/lib/javascript/measurement';
import {
  measurementOptionsSchema,
  measurementRequestSchema,
  measurementSizeSchema,
  measurementSeries,
  measurementSizes,
  type MeasurementRequest,
} from '../src/lib/measurement';
import { measurementPrograms, measurementArguments } from './measurement-programs';

let py: PyodideInterface;
beforeAll(async () => {
  py = await loadPyodide();
  py.globals.set('_codelens_limits_json', JSON.stringify(limits));
  py.runPython('import json as _limits_json; _codelens_limits = _limits_json.loads(_codelens_limits_json)');
  py.globals.delete('_codelens_limits_json');
  py.runPython(readFileSync('public/analysis.py', 'utf8'));
  py.runPython(readFileSync('public/measurement.py', 'utf8'));
});
function python(request: MeasurementRequest) {
  py.globals.set(
    '_measurement_request_json',
    JSON.stringify(measurementRequestSchema.parse(request)),
  );
  return measurementSizeSchema.parse(
    JSON.parse(py.runPython('measure_code(_measurement_request_json)')),
  );
}

describe('snapshot-free real measurement engines', () => {
  it('measures a named JavaScript function expression selected by its binding name', () => {
    const request = {
      code: 'const algorithm = function inner(n) { let value=0; for(let i=0;i<n;i++) value++; return value; };',
      entry: 'algorithm',
      n: 16,
      args: [16],
      options: measurementOptionsSchema.parse({}),
    };
    const result = executeJavaScriptMeasurement(request);
    expect(result.status).toBe('complete');
    expect(result.lineEvents).toBeGreaterThan(16);
  });
  for (const language of ['javascript', 'python'] as const) {
    it.each(measurementPrograms)(
      `${language}: $name matches the known time and auxiliary-space classes`,
      (program) => {
        const sizes = [];
        for (const n of measurementSizes) {
          const request = {
            code: program[language],
            entry: 'algorithm',
            n,
            args: measurementArguments(program.input, n),
            options: measurementOptionsSchema.parse({}),
          };
          const result =
            language === 'python'
              ? python(request)
              : measurementSizeSchema.parse(executeJavaScriptMeasurement(request));
          sizes.push(result);
          if (result.status !== 'complete') break;
        }
        const series = measurementSeries(sizes);
        expect(series.time?.label, JSON.stringify(sizes)).toBe(program.time);
        expect(series.space?.label, JSON.stringify(sizes)).toBe(program.space);
        if (program.name === 'linear scan') expect(series.totalSpace?.label).toBe('O(n)');
        expect(sizes.filter((size) => size.status === 'complete').length).toBeGreaterThanOrEqual(4);
        expect(
          sizes.every((size) => !('steps' in size) && !('heap' in size) && !('stdout' in size)),
        ).toBe(true);
      },
    );
  }
  for (const language of ['javascript', 'python'] as const) {
    const run = (code: string, args: MeasurementRequest['args'], limits = {}, n = 128) => {
      const request = {
        code,
        entry: 'algorithm',
        n,
        args,
        options: measurementOptionsSchema.parse(limits),
      };
      return language === 'python'
        ? python(request)
        : measurementSizeSchema.parse(executeJavaScriptMeasurement(request));
    };
    it(`${language}: exceeds the trace cap without retaining snapshots`, () => {
      const result = run(measurementPrograms[8][language], [4000]);
      expect(result.status).toBe('complete');
      expect(result.lineEvents).toBeGreaterThan(5000);
      expect(Object.keys(result).sort()).toEqual([
        'auxiliaryPeak',
        'events',
        'inputUnits',
        'lineEvents',
        'n',
        'reason',
        'samples',
        'status',
        'totalPeak',
      ]);
    });
    it(`${language}: preserves the budget flag even if user code catches the limit`, () => {
      const source =
        language === 'python'
          ? 'def algorithm(n):\n    try:\n        while True:\n            n += 1\n    except BaseException:\n        return n'
          : 'function algorithm(n) { try { while(true) { n++; } } catch(error) { return n; } }';
      const result = run(source, [4], { eventBudget: 100 });
      expect(result.status).toBe('budget-exceeded');
      expect(result.events).toBe(100);
      expect(measurementSeries([result]).time).toBeNull();
    });
    it(`${language}: uses full input collections and subtracts aliased input once`, () => {
      const source =
        language === 'python'
          ? 'def algorithm(items):\n    alias = items\n    return alias'
          : 'function algorithm(items) { const alias = items; return alias; }';
      const result = run(source, [Array.from({ length: 400 }, (_, i) => i)]);
      expect(result.status).toBe('complete');
      expect(result.inputUnits).toBe(401);
      expect(result.totalPeak).toBe(405);
      expect(result.auxiliaryPeak).toBe(4);
    });
    it(`${language}: strings use the documented cap without double counting a returned alias`, () => {
      const source =
        language === 'python'
          ? 'def algorithm(text):\n    return text'
          : 'function algorithm(text) { return text; }';
      const result = run(source, ['x'.repeat(12000)]);
      expect(result.status).toBe('complete');
      expect(result.inputUnits).toBe(10000);
      expect(result.auxiliaryPeak).toBe(3);
    });
    it(`${language}: bounds objects, depth and visit work and excludes partial samples`, () => {
      const source =
        language === 'python'
          ? 'def algorithm(items):\n    return items'
          : 'function algorithm(items) { return items; }';
      for (const limits of [{ maxObjects: 2 }, { maxDepth: 2 }, { maxVisits: 4 }]) {
        const result = run(source, [[[[1, 2, 3, 4]]]], limits);
        expect(result.status).toBe('partial');
        const allocating =
          language === 'python'
            ? 'def algorithm(n):\n    values = [[[1, 2, 3, 4]]]\n    return values'
            : 'function algorithm(n) { const values=[[[1,2,3,4]]]; return values; }';
        const partials = [4, 8, 12, 16].map((n) => run(allocating, [n], limits, n));
        expect(partials.every((size) => size.status === 'partial' && size.totalPeak! > 0)).toBe(
          true,
        );
        expect(measurementSeries(partials).space).toBeNull();
      }
    });
    it(`${language}: supports several arguments and does not execute demo calls`, () => {
      const source =
        language === 'python'
          ? 'def algorithm(items, target):\n    return len(items) + target\nraise RuntimeError("demo must not execute")'
          : 'function algorithm(items, target) { return items.length + target; }\nthrow new Error("demo must not execute");';
      const compatible = source
        .replace('raise RuntimeError("demo must not execute")', 'print("demo must not execute")')
        .replace(
          'throw new Error("demo must not execute");',
          'console.log("demo must not execute");',
        );
      const result = run(compatible, [[1, 2, 3], 4]);
      expect(result.status).toBe('complete');
      expect(result.inputUnits).toBe(4);
      expect(result.lineEvents).toBe(1);
    });
    it(`${language}: keeps sampling cyclic live data finite`, () => {
      const source =
        language === 'python'
          ? 'def algorithm(n):\n    values = []\n    values.append(values)\n    return values'
          : 'function algorithm(n) { const values=[]; values.push(values); return values; }';
      const result = run(source, [4]);
      expect(result.status).toBe('complete');
      expect(result.totalPeak).toBe(6);
    });
    it(`${language}: preserves own special keys in validated measurement inputs`, () => {
      const source =
        language === 'python'
          ? 'def algorithm(items):\n    if "__proto__" not in items or "constructor" not in items:\n        raise ValueError("input fields lost")\n    return items'
          : 'function algorithm(items) { if(!Object.hasOwn(items,"__proto__") || !Object.hasOwn(items,"constructor") || typeof items.hasOwnProperty !== "function") throw new Error("input fields lost"); return items; }';
      const result = run(source, [JSON.parse('{"__proto__":[1],"constructor":2}')]);
      expect(result.status).toBe('complete');
    });
    it(`${language}: requires four complete points and marks small or tied fits inconclusive`, () => {
      const sizes = measurementSizes.map((n) => run(measurementPrograms[8][language], [n], {}, n));
      expect(measurementSeries(sizes.slice(0, 3)).time).toBeNull();
      expect(measurementSeries(sizes.slice(0, 4)).time?.inconclusive).toBe(true);
      const series = measurementSeries(sizes);
      expect(series.time?.label).toBe('O(n)');
      expect(series.time?.validPoints).toBe(10);
      expect(series.space?.label).toBe('O(1)');
      expect(series.space?.inconclusive).toBe(true);
      expect(series.time?.runnerUp.error).toBeGreaterThanOrEqual(series.time!.error);
    });
  }
});
