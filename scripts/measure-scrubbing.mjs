import { chromium } from '@playwright/test';
import lz from 'lz-string';
const { compressToEncodedURIComponent } = lz;
import { mkdir, writeFile } from 'node:fs/promises';
const code =
  'numbers = [5, 3, 8, 1, 2]\ni = 0\nwhile True:\n    i = (i + 1) % 5\n    numbers[i] += 1';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(
    'http://127.0.0.1:3001/#code=' +
      compressToEncodedURIComponent(JSON.stringify({ code, stdin: '', language: 'python' })),
  );
  await page.locator('.monaco-editor').waitFor();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await page.getByRole('button', { name: 'Jump to end' }).waitFor();
  await page.waitForFunction(
    () => !document.querySelector('button.run-button')?.textContent.includes('/ stop'),
    {},
    { timeout: 90000 },
  );
  const timeline = page.getByRole('slider', { name: 'Execution timeline' });
  await timeline.waitFor();
  const count = await timeline.getAttribute('max');
  if (count !== '4999') throw new Error('Expected 5,000 steps, got ' + count);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await page.screenshot({ path: 'artifacts/stress.png', fullPage: true });
  const timings = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const input = document.querySelector('input[aria-label="Execution timeline"]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        const samples = [];
        let previous = 0;
        let frame = 0;
        const tick = (timestamp) => {
          if (previous) samples.push(timestamp - previous);
          previous = timestamp;
          setter.call(input, String((frame * 73) % 5000));
          input.dispatchEvent(new Event('input', { bubbles: true }));
          frame++;
          if (frame < 181) requestAnimationFrame(tick);
          else resolve(samples);
        };
        requestAnimationFrame(tick);
      }),
  );
  const sorted = [...timings].sort((a, b) => a - b);
  const result = {
    steps: 5000,
    frames: timings.length,
    averageFrameMs: timings.reduce((a, b) => a + b) / timings.length,
    p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
    maxFrameMs: sorted.at(-1),
    counter: await page.getByTestId('step-counter').innerText(),
    environment:
      'Chromium headless, 1440×1000, production build, synthetic timeline scrubbing, default full motion',
  };
  result.averageFps = 1000 / result.averageFrameMs;
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/scrubbing.json', JSON.stringify(result, null, 2));
  console.log(result);
} finally {
  await browser.close();
}
