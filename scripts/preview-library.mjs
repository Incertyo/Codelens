import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const index = await page.request.get('http://127.0.0.1:3001/api/library');
  const data = await index.json();
  if (!index.ok() || data.algorithms.length !== 309 || data.implementations.length !== 343)
    throw new Error('Production database coverage mismatch');
  await page.goto('http://127.0.0.1:3001');
  await page.getByTestId('site-loading').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: '/ browse all' }).click();
  const dialog = page.getByRole('dialog', { name: /FIND YOUR/ });
  await dialog.getByRole('searchbox').fill('Fenwick');
  await dialog.getByRole('button', { name: /^Fenwick tree/ }).click();
  await page.screenshot({ path: 'artifacts/database-library-selection.png' });
  await dialog.getByRole('button', { name: '/ load reference code' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await page.getByTestId('run-loading').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toHaveText('12\n');
  await page.locator('.library-provenance summary').click();
  await expect(page.locator('.library-provenance')).toContainText('Expected demonstration output');
  await page.locator('#workspace').scrollIntoViewIfNeeded();
  if ((await new AxeBuilder({ page }).analyze()).violations.length)
    throw new Error('Production accessibility failed');
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.screenshot({ path: 'artifacts/database-library-workspace.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.getByRole('button', { name: '/ browse all' }).click();
  await dialog.getByRole('searchbox').fill('Blossom');
  await dialog.getByRole('button', { name: /^Blossom matching/ }).click();
  await dialog.getByTestId('algorithm-detail').scrollIntoViewIfNeeded();
  if ((await new AxeBuilder({ page }).analyze()).violations.length)
    throw new Error('Mobile library accessibility failed');
  await page.screenshot({ path: 'artifacts/database-library-mobile.png' });
  await page.reload();
  await page.getByTestId('site-loading').waitFor({ state: 'detached' });
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    'Production SQLite → API → editor → Python worker → output verified, desktop/mobile accessibility passed, no page errors.',
  );
} finally {
  await browser.close();
}
