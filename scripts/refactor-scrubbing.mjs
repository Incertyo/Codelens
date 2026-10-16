import { chromium, expect } from '@playwright/test';
import lz from 'lz-string';
import { mkdir, writeFile } from 'node:fs/promises';

const url = new URL(process.argv[2] ?? 'http://127.0.0.1:3017');
if (
  url.protocol !== 'http:' ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
  url.username ||
  url.password ||
  url.pathname !== '/' ||
  url.search ||
  url.hash
)
  throw new Error('Only a loopback HTTP origin is allowed.');
if (process.env.CI) throw new Error('Scrubbing measurement is local-only.');
const browser = await chromium.launch();
const results = [];
try {
  for (const language of ['python']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === url.origin && route.request().method() === 'GET'
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    const code =
      'numbers = [5, 3, 8, 1, 2]\ni = 0\nwhile True:\n    i = (i + 1) % 5\n    numbers[i] += 1';
    const fragment =
      '#code=' + lz.compressToEncodedURIComponent(JSON.stringify({ code, stdin: '', language: 'python' }));
    await page.goto(url.origin + '/' + fragment);
    await expect(page.getByTestId('site-loading')).not.toBeVisible();
    await page.getByRole('button', { name: '/ run code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
    await expect(page.getByRole('slider', { name: 'Execution timeline' })).toHaveAttribute(
      'max',
      '4999',
    );
    await page.getByRole('button', { name: 'Jump to end' }).click();
    const measurement = await page.evaluate(async () => {
      const input = document.querySelector('input[aria-label="Execution timeline"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      const timings = [],
        counters = new Set();
      let previous = await new Promise((resolve) => requestAnimationFrame(resolve));
      for (let frame = 0; frame < 181; frame++) {
        setter.call(input, String((frame * 73) % 5000));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const now = await new Promise((resolve) => requestAnimationFrame(resolve));
        if (frame > 0) timings.push(now - previous);
        counters.add(document.querySelector('[data-testid="step-counter"]').textContent);
        previous = now;
      }
      timings.sort((a, b) => a - b);
      return {
        frames: timings.length,
        changedCounters: counters.size,
        averageFrameMs: timings.reduce((a, b) => a + b, 0) / timings.length,
        p95FrameMs: timings[Math.floor(timings.length * 0.95)],
        maxFrameMs: timings.at(-1),
        finalCounter: document.querySelector('[data-testid="step-counter"]').textContent,
      };
    });
    if (measurement.changedCounters < 100)
      throw new Error('Timeline did not scrub through real rendered steps.');
    results.push({ language, steps: 5000, ...measurement });
    await context.close();
  }
  await mkdir('artifacts/refactor', { recursive: true });
  const report = {
    browser: browser.version(),
    viewport: '1440x1000',
    motion: 'default full',
    description:
      'Headless Chromium requestAnimationFrame intervals during real 5000-step timeline scrubbing; frame-clock quantization and local machine load apply, not an FPS guarantee.',
    results,
  };
  await writeFile('artifacts/refactor/scrubbing.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
