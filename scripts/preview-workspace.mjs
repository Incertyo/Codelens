import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route('**/monaco/**', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('site-loading').waitFor();
  const animation = await page
    .locator('.loading-orbit span')
    .first()
    .evaluate((e) => getComputedStyle(e).animationName);
  if (animation !== 'loading-breathe') throw new Error('Opening loading loop is missing');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'artifacts/site-loading-viewport.png' });
  release();
  await page.getByTestId('site-loading').waitFor({ state: 'detached' });
  await page.unroute('**/monaco/**');
  await page.getByRole('button', { name: '/ browse all' }).click();
  await page.screenshot({ path: 'artifacts/algorithm-library-desktop.png' });
  await page.getByRole('button', { name: 'Close algorithm library' }).click();
  await page.getByRole('button', { name: '/ new code', exact: true }).click();
  await page.keyboard.insertText('while True:\n    pass\n');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  const loading = page.getByRole('dialog', { name: 'Running code' });
  await loading.waitFor();
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('[data-testid="run-loading"]')).opacity === '1',
  );
  await page.screenshot({ path: 'artifacts/run-loading-viewport.png' });
  await loading.getByRole('button', { name: '/ cancel run' }).click();
  await page.getByTestId('run-loading').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Reduce motion' }).click();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await loading.waitFor();
  const reducedLoop = await page
    .locator('.loading-orbit span')
    .first()
    .evaluate((e) => getComputedStyle(e).animationName);
  if (reducedLoop !== 'none') throw new Error('Reduced motion still animates');
  await page.keyboard.press('Escape');
  await page.getByTestId('run-loading').waitFor({ state: 'detached' });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    'Production library, opening loader, run loader and cancellation verified; zero page errors.',
  );
} finally {
  await browser.close();
}
