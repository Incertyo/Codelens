import { chromium, expect } from '@playwright/test';
import lz from 'lz-string';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

if (process.env.CI) throw new Error('Visual parity capture is local-only and must not run in CI.');
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const match = /^--(url|output)=(.+)$/.exec(arg);
    if (!match)
      throw new Error('Use --url=http://127.0.0.1:PORT --output=artifacts/refactor/visual-before');
    return [match[1], match[2]];
  }),
);
const url = new URL(args.url ?? 'http://127.0.0.1:3017');
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
const output = args.output ?? 'artifacts/refactor/visual-before';
if (!/^artifacts[\\/]refactor[\\/][a-zA-Z0-9_-]+$/.test(output))
  throw new Error('Output must be a named folder under artifacts/refactor.');
await mkdir(output, { recursive: true });
const code =
  'def total(n):\n    value = 0\n    for i in range(n):\n        value += i\n    return value\n\ndef fib(n):\n    if n < 2:\n        return n\n    return fib(n-1) + fib(n-2)\n\nvalues = [3, 1, 2]\nprint(total(8), fib(4))\n';
const share = (source) =>
  '/#code=' +
  lz.compressToEncodedURIComponent(
    JSON.stringify({ code: source, stdin: '', language: 'python' }),
  );
const browser = await chromium.launch();
const captures = [];
try {
  for (const theme of ['dark', 'light'])
    for (const [device, viewport] of [
      ['desktop', { width: 1440, height: 1000 }],
      ['mobile', { width: 390, height: 844 }],
    ]) {
      const context = await browser.newContext({
        viewport,
        reducedMotion: 'reduce',
        colorScheme: theme,
      });
      await context.route('**/*', (route) => {
        const target = new URL(route.request().url());
        if (target.origin !== url.origin || route.request().method() !== 'GET')
          return route.abort();
        return route.continue();
      });
      await context.addInitScript((value) => localStorage.setItem('codelens-theme', value), theme);
      const page = await context.newPage();
      const capture = async (screen) => {
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        });
        const filename = `${theme}-${device}-${screen}.png`;
        await page.screenshot({
          path: join(output, filename),
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
          mask: [page.locator('.step-counter'), page.locator('.workspace-foot > span').last()],
        });
        captures.push({ theme, device, screen, file: filename });
      };
      const ready = async () => {
        await expect(page.locator('.monaco-editor')).toBeVisible();
        await expect(page.getByTestId('site-loading')).not.toBeVisible();
        await expect(page.locator('.site-shell')).toHaveCSS('opacity', '1');
        await page.evaluate(() => document.fonts.ready);
      };
      const run = async () => {
        await page.getByRole('button', { name: '/ run code', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
        await page.getByRole('button', { name: 'Jump to end' }).click();
      };
      await page.goto(new URL(share(code), url).href);
      await ready();
      await capture('editor');
      await run();
      await capture('trace-recursion');
      await page.getByRole('tab', { name: '02 breakdown' }).click();
      await expect(page.getByText('FROM THE AST', { exact: true })).toBeVisible();
      await capture('breakdown');
      await page.getByRole('tab', { name: '03 analysis' }).click();
      await expect(page.getByLabel('Entry function')).toBeVisible();
      await capture('analysis');
      await page.getByRole('tab', { name: '04 complexity' }).click();
      await page.getByLabel('Entry function').selectOption('total');
      await page.getByLabel('Input generator').selectOption('int');
      await page.getByLabel('Measurement sizes').selectOption('small');
      await page.getByRole('button', { name: 'Measure code', exact: true }).click();
      await expect(page.getByText('Estimated O(n)', { exact: true })).toBeVisible({ timeout: 60000 });
      await capture('complexity');
      await page
        .getByRole('img', { name: 'Real function steps versus input size' })
        .scrollIntoViewIfNeeded();
      await capture('complexity-chart');
      await page.getByRole('button', { name: '/ browse all', exact: true }).click();
      await expect(page.getByRole('dialog', { name: /FIND YOUR/ })).toBeVisible();
      await capture('library');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'MENU', exact: true }).click();
      await capture('menu');
      await page.keyboard.press('Escape');
      await page.goto(
        new URL(share('graph = {"A": ["B", "C"], "B": ["C"], "C": []}\nprint(graph)\n'), url).href,
      );
      await ready();
      await run();
      await capture('graph');
      await page.goto(new URL('/design', url).href);
      await expect(page.getByTestId('site-loading')).not.toBeVisible();
      await expect(page.getByRole('heading', { name: 'DESIGNED TO BE CLEAR.' })).toBeVisible();
      await capture('design');
      await context.close();
    }
  await writeFile(
    join(output, 'manifest.json'),
    JSON.stringify(
      { origin: url.origin, browser: browser.version(), reducedMotion: true, captures },
      null,
      2,
    ),
  );
  console.log(`Captured ${captures.length} local screenshots in ${output}.`);
} finally {
  await browser.close();
}
