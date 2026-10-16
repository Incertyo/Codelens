import { describe, expect, it } from 'vitest';
import {
  growthModels,
  growthValue,
  fitGrowthModel,
  predictGrowth,
  operationCount,
  neighboringModels,
  staticComparison,
} from '../src/lib/complexity';
import { fitComplexity, empiricalSizes, testHarness } from '../src/lib/analysis';
import { inspectJavaScript } from '../src/lib/javascript/analysis';
import { instrumentJavaScript } from '../src/lib/javascript/instrument';
import { JavaScriptTrace } from '../src/lib/javascript/runtime';

describe('fixed Big-O references', () => {
  it('evaluates only the seven fixed growth functions', () => {
    expect(growthModels.map((model) => growthValue(model.id, 8))).toEqual([
      1, 3, 8, 24, 64, 512, 256,
    ]);
    expect(growthValue('logarithmic', 1)).toBe(0);
    expect(growthValue('linearithmic', 1)).toBe(0);
    expect(new Set(growthModels.map((model) => model.dash)).size).toBe(7);
    expect(growthModels.every((model) => model.name && model.example)).toBe(true);
  });
  it('rejects invalid domains and keeps exponential evaluation finite', () => {
    for (const n of [0, -1, NaN, Infinity]) expect(() => growthValue('linear', n)).toThrow();
    expect(growthValue('exponential', 1_000_000)).toBe(1e100);
    expect(() => growthValue('source supplied equation' as never, 10)).toThrow();
  });
  it('uses the nonnegative least-squares multiplier for reference shapes', () => {
    const samples = [1, 2, 4].map((n) => ({ n, steps: 3 * n + 5 }));
    const reference = fitGrowthModel('linear', samples, false);
    expect(reference.intercept).toBe(0);
    expect(predictGrowth(reference, 1)).toBeCloseTo(98 / 21);
    const fit = fitGrowthModel('linear', samples, true);
    expect(fit.intercept).toBeCloseTo(5);
    expect(predictGrowth(fit, 8)).toBeCloseTo(29);
    const declining = fitGrowthModel(
      'linear',
      [
        { n: 1, steps: 4 },
        { n: 2, steps: 2 },
      ],
      true,
    );
    expect(declining.scale).toBe(0);
    expect(declining.intercept).toBe(3);
    const zeroLog = fitGrowthModel('logarithmic', [{ n: 1, steps: 4 }], false);
    expect(predictGrowth(zeroLog, 1)).toBe(0);
  });
  it('fits real instrumented function events and supplies the existing best-fit curve', () => {
    const source =
      'function total(n) { let value=0; for(let i=0;i<n;i++){value+=i;} return value; }';
    const inspection = inspectJavaScript(source);
    const samples = empiricalSizes.map((n) => {
      const instrumented = instrumentJavaScript(
        testHarness(inspection, inspection.entries[0], n, 'javascript'),
      );
      const runtime = new JavaScriptTrace(5000);
      new Function(instrumented.hookName, instrumented.code)(runtime);
      const trace = runtime.result();
      expect(trace.error).toBeNull();
      expect(trace.truncated).toBe(false);
      return { n, steps: trace.steps.filter((step) => step.func !== '<module>').length };
    });
    const fit = fitComplexity(samples);
    expect(fit.label).toBe('O(n)');
    for (const sample of samples) expect(predictGrowth(fit, sample.n)).toBeCloseTo(sample.steps);
    for (const model of growthModels) {
      const reference = fitGrowthModel(model.id, samples, false);
      expect(reference.scale).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(reference.error)).toBe(true);
      expect(Number.isFinite(predictGrowth(reference, 64))).toBe(true);
    }
    expect(staticComparison('O(n) candidate', fit.id)).toContain('Both suggest');
    expect(staticComparison('O(n^2) candidate', fit.id)).toBe(
      'Static analysis suggests O(n²); measured data fits O(n) best at the tested sizes.',
    );
    expect(staticComparison('Unknown', fit.id)).toContain('Unknown');
  });
  it('handles constant fits and large exponential sample sizes without overflow', () => {
    const fit = fitComplexity([1, 2, 3, 4].map((n) => ({ n, steps: 7 })));
    expect(predictGrowth(fit, 100)).toBe(7);
    const exponential = fitGrowthModel(
      'exponential',
      [
        { n: 999_999, steps: 50 },
        { n: 1_000_000, steps: 100 },
      ],
      false,
    );
    expect(predictGrowth(exponential, 1_000_000)).toBeCloseTo(100);
    expect(predictGrowth(exponential, 999_999)).toBeCloseTo(50);
    expect(() => fitComplexity([1, 1, 1, 1].map((n) => ({ n, steps: n })))).toThrow();
  });
  it('formats scale counts without overflowing or building giant exponential integers', () => {
    expect(operationCount('linear', 1000)).toEqual({
      notation: '1,000',
      plainEnglish: 'about a thousand steps',
    });
    expect(operationCount('constant', 1_000_000).notation).toBe('1');
    expect(operationCount('quadratic', 1_000_000).notation).toBe('1 × 10^12');
    expect(operationCount('cubic', 1_000_000).notation).toBe('1 × 10^18');
    expect(operationCount('exponential', 10).notation).toBe('1,024');
    expect(operationCount('exponential', 1000).notation).toBe('1.07 × 10^301');
    expect(operationCount('exponential', 1_000_000).notation).toBe('9.9 × 10^301029');
    expect(operationCount('exponential', 1_000_000).plainEnglish).toContain(
      'effectively never finishes',
    );
    for (const model of growthModels) {
      for (const n of [10, 1000, 1_000_000, Number.MAX_SAFE_INTEGER]) {
        const result = operationCount(model.id, n);
        expect(result.notation).not.toMatch(/Infinity|NaN/);
        expect(result.notation.length).toBeLessThan(45);
        expect(result.plainEnglish).toBeTruthy();
      }
    }
    expect(() => operationCount('linear', 1.5)).toThrow();
    expect(neighboringModels('constant').map((model) => model.id)).toEqual([
      'constant',
      'logarithmic',
    ]);
    expect(neighboringModels('linear').map((model) => model.id)).toEqual([
      'logarithmic',
      'linear',
      'linearithmic',
    ]);
    expect(neighboringModels('exponential').map((model) => model.id)).toEqual([
      'cubic',
      'exponential',
    ]);
  });
  it('supports safely predicting growth with calibrated anchor and scale fallbacks', () => {
    const rawFit = { id: 'quadratic' as const, label: 'O(n²)', error: 0.05, maxN: 64 };
    const safeFit = {
      ...rawFit,
      scale: 90,
      intercept: 0,
      anchor: rawFit.maxN ?? 64,
    };
    const at32 = predictGrowth(safeFit, 32);
    expect(at32).toBeCloseTo(90 * (32 / 64) ** 2);
    expect(Number.isFinite(at32)).toBe(true);
  });
});
