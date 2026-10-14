import { expect, it } from 'vitest';
import { introProgress, INTRO_MAX_MS, INTRO_MIN_MS, INTRO_SKIP_MS } from '../src/lib/intro';
it('reports 100 only when every actual readiness signal is complete', () => {
  const all = { hydration: true, fonts: true, manifest: true, editor: true };
  expect(introProgress(all)).toBe(100);
  for (const key of Object.keys(all))
    expect(introProgress({ ...all, [key]: false })).toBeLessThan(100);
  expect(introProgress({ hydration: false, fonts: false, manifest: false, editor: false })).toBe(0);
  expect(INTRO_SKIP_MS).toBeLessThan(INTRO_MIN_MS);
  expect(INTRO_MIN_MS).toBe(1400);
  expect(INTRO_MAX_MS).toBeLessThanOrEqual(10000);
});
