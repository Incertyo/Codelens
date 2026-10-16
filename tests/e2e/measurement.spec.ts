import { test, expect, type Page } from '@playwright/test';
import { buildSync } from 'esbuild';
import type { MeasurementRunner } from '../../src/lib/measurement-runner';
import type {
  MeasurementSeries,
  MeasurementOptions,
  MeasurementArgument,
} from '../../src/lib/measurement';
import { encodeShare } from '../../src/lib/share';
import { measurementPrograms, measurementArguments } from '../measurement-programs';

const harness = buildSync({
  entryPoints: ['src/lib/measurement-runner.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'MeasurementHarness',
  platform: 'browser',
  write: false,
  minify: true,
  define: { 'import.meta.url': 'location.href' },
}).outputFiles[0].text;
type BrowserHarness = typeof window & {
  MeasurementHarness: { MeasurementRunner: typeof MeasurementRunner };
  workerUrls: string[];
  javascriptWorkerUrl: string;
  workerMessages: { type: string; worker: number; nonce?: string }[];
  terminatedWorkers: number[];
  activeMeasurement?: MeasurementRunner;
};

async function prepare(page: Page) {
  await page.addInitScript(() => {
    const state = window as BrowserHarness;
    state.workerUrls = [];
    state.workerMessages = [];
    state.terminatedWorkers = [];
    const NativeWorker = Worker;
    window.Worker = class extends NativeWorker {
      private sequence: number;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.sequence = state.workerUrls.push(String(url)) - 1;
        this.addEventListener('message', (event) => {
          state.workerMessages.push({
            type: event.data?.type,
            worker: this.sequence,
            nonce: event.data?.nonce,
          });
        });
      }
      terminate() {
        state.terminatedWorkers.push(this.sequence);
        return super.terminate();
      }
    };
  });
  await page.goto('/' + encodeShare('let value = 1;', '', 'javascript'));
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.evaluate(() => {
    const state = window as BrowserHarness;
    const index = state.workerMessages.find((event) => event.type === 'result')!.worker;
    state.javascriptWorkerUrl = state.workerUrls[index];
  });
  await page.addScriptTag({ content: harness });
}

async function measure(
  page: Page,
  data: {
    code: string;
    language: 'python' | 'javascript';
    sizes?: number[];
    args?: Record<number, MeasurementArgument[]>;
    options?: Partial<MeasurementOptions>;
  },
): Promise<MeasurementSeries> {
  return page.evaluate(async (serialized) => {
    const request: typeof data = JSON.parse(serialized);
    const state = window as BrowserHarness;
    const runner = new state.MeasurementHarness.MeasurementRunner(
      (language) =>
        new Worker(language === 'python' ? '/tracer.worker.js' : state.javascriptWorkerUrl),
    );
    state.activeMeasurement = runner;
    return runner.measure({
      ...request,
      entry: 'algorithm',
      argumentsForSize: (n) => request.args?.[n] ?? [n],
    });
  }, JSON.stringify(data));
}

for (const language of ['javascript', 'python'] as const) {
  test(`all nine known algorithms match time and auxiliary space through real ${language} workers`, async ({
    page,
  }) => {
    test.setTimeout(240000);
    await prepare(page);
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST') requests.push(request.url());
    });
    for (const program of measurementPrograms) {
      const before = await page.evaluate(() => (window as BrowserHarness).workerUrls.length);
      const result = await measure(page, {
        language,
        code: program[language],
        args: Object.fromEntries(
          [4, 8, 12, 16, 24, 32, 48, 64, 96, 128].map((n) => [
            n,
            measurementArguments(program.input, n),
          ]),
        ),
      });
      expect(result.time?.label, `${program.name}: ${JSON.stringify(result.sizes)}`).toBe(
        program.time,
      );
      expect(result.space?.label, `${program.name}: ${JSON.stringify(result.sizes)}`).toBe(
        program.space,
      );
      await test.info().attach(`${language}-${program.name}-measurements`, {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      });
      const protocol = await page.evaluate((index) => {
        const state = window as BrowserHarness;
        const events = state.workerMessages.filter((event) => event.worker === index);
        return {
          workers: state.workerUrls.length,
          ready: events.filter((event) => event.type === 'ready').length,
          started: events.filter((event) => event.type === 'started').length,
          measurements: events.filter((event) => event.type === 'measurement').length,
          uniqueRunNonces: new Set(
            events.filter((event) => event.type === 'started').map((event) => event.nonce),
          ).size,
          terminated: state.terminatedWorkers.includes(index),
        };
      }, before);
      expect(protocol.workers).toBe(before + 1);
      expect(protocol.ready).toBe(1);
      expect(protocol.started).toBe(result.sizes.length);
      expect(protocol.uniqueRunNonces).toBe(result.sizes.length);
      expect(protocol.measurements).toBeGreaterThanOrEqual(
        result.sizes.filter((size) => size.status === 'complete').length,
      );
      expect(protocol.terminated).toBe(true);
    }
    expect(requests).toEqual([]);
  });
  test(`${language} reuses one worker with fresh globals, no snapshot cap, and reduced budgets`, async ({
    page,
  }) => {
    await prepare(page);
    const code =
      language === 'python'
        ? 'calls = 0\ndef algorithm(n):\n    global calls\n    calls += 1\n    if calls != 1:\n        raise RuntimeError("stale globals")\n    value = 0\n    for i in range(n):\n        value += 1\n    return value'
        : 'let calls=0; function algorithm(n) { calls++; if(calls!==1) throw new Error("stale globals"); let value=0; for(let i=0;i<n;i++) value++; return value; }';
    const result = await measure(page, { code, language, sizes: [3000, 4000, 5000, 6000] });
    expect(
      result.sizes.every((size) => size.status === 'complete' && size.lineEvents! > 5000),
    ).toBe(true);
    expect(result.time?.label).toBe('O(n)');
    const bounded = await measure(page, {
      code,
      language,
      options: { eventBudget: 110 },
      sizes: [4, 8, 12, 16, 24, 32, 48, 64],
    });
    expect(bounded.reduced).toBe(true);
    expect(bounded.sizes.at(-1)?.status).toBe('budget-exceeded');
    expect(bounded.time?.label).toBe('O(n)');
    expect(bounded.time?.validPoints).toBe(bounded.sizes.length - 1);
    const specialKeys = await measure(page, {
      language,
      code:
        language === 'python'
          ? 'def algorithm(items):\n    if "__proto__" not in items or "constructor" not in items:\n        raise ValueError("input fields lost")\n    return items'
          : 'function algorithm(items) { if(!Object.hasOwn(items,"__proto__") || !Object.hasOwn(items,"constructor") || typeof items.hasOwnProperty !== "function") throw new Error("input fields lost"); return items; }',
      sizes: [4, 8, 12, 16],
      args: Object.fromEntries(
        [4, 8, 12, 16].map((n) => [n, [JSON.parse('{"__proto__":[1],"constructor":2}')]]),
      ),
    });
    expect(specialKeys.sizes.every((size) => size.status === 'complete')).toBe(true);
    if (language === 'javascript') {
      const aliased = await measure(page, {
        language,
        sizes: [4, 8, 12, 16],
        code: 'const algorithm = function inner(n) { let value=0; for(let i=0;i<n;i++) value++; return value; };',
      });
      expect(aliased.time?.label).toBe('O(n)');
      expect(
        aliased.sizes.every((size) => size.status === 'complete' && size.lineEvents! > size.n),
      ).toBe(true);
    }
  });
}

test('parent rejects unauthenticated real counters and replayed started cannot extend the absolute deadline', async ({
  page,
}) => {
  await prepare(page);
  await page.evaluate(() => {
    const NativeWorker = Worker;
    window.Worker = class extends NativeWorker {
      set onmessage(handler: ((event: MessageEvent) => void) | null) {
        super.onmessage = handler
          ? (event) => {
              if (event.data?.type === 'measurement') {
                const missing = structuredClone(event.data);
                delete missing.nonce;
                handler.call(this, new MessageEvent('message', { data: missing }));
                handler.call(
                  this,
                  new MessageEvent('message', { data: { ...event.data, nonce: 'wrong' } }),
                );
                return;
              }
              handler.call(this, event);
              if (event.data?.type === 'started') setTimeout(() => handler.call(this, event), 200);
            }
          : null;
      }
    };
  });
  const start = Date.now();
  const result = await measure(page, {
    language: 'javascript',
    code: measurementPrograms[8].javascript,
    options: { timeoutMs: 400 },
  });
  expect(result.sizes[0].status).toBe('budget-exceeded');
  expect(result.sizes[0].lineEvents).toBeNull();
  expect(result.time).toBeNull();
  expect(Date.now() - start).toBeLessThan(3000);
});

test('single trusted started and casual forged protocol calls are bounded by the parent deadline', async ({
  page,
}) => {
  await prepare(page);
  const start = Date.now();
  const result = await measure(page, {
    language: 'javascript',
    code: 'function algorithm(n) { try { postMessage({type:"started"}); } catch(error) {} Function("const start=performance.now();while(performance.now()-start<14000){}")(); return n; }',
  });
  expect(result.sizes[0].status).toBe('budget-exceeded');
  expect(result.sizes[0].lineEvents).toBeNull();
  expect(Date.now() - start).toBeLessThan(12500);
});

test('measurement cancellation terminates its real worker without completing later sizes', async ({
  page,
}) => {
  await prepare(page);
  const pending = measure(page, {
    language: 'javascript',
    code: 'function algorithm(n) { Function("while(true){}")(); return n; }',
  }).then(
    () => 'unexpected completion',
    (error) => String(error),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as BrowserHarness).workerMessages.filter((message) => message.type === 'started')
            .length,
      ),
    )
    .toBe(2);
  await page.evaluate(() => (window as BrowserHarness).activeMeasurement?.dispose());
  expect(await pending).toContain('Measurement cancelled');
  expect(
    await page.evaluate(() =>
      (window as BrowserHarness).terminatedWorkers.includes(
        (window as BrowserHarness).workerUrls.length - 1,
      ),
    ),
  ).toBe(true);
});
