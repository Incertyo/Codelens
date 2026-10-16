import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { algorithms } from "../../src/lib/algorithm-catalog";

test('database index and nonfeatured algorithms load and run through Python workers', async ({
  page,
  request,
}) => {
  const index = await request.get('/api/library');
  expect(index.ok()).toBe(true);
  const body = await index.json();
  expect(body.algorithms).toHaveLength(309);
  expect(body.implementations).toHaveLength(343);
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).toHaveCount(0);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const [name, output] of [
    ['Dijkstra’s algorithm', '[0, 2, 3, 6]'],
    ['Fenwick tree', '12'],
    ['Blossom matching', '2'],
    ['Fast Fourier transform', '10.0'],
  ] as const) {
    await page.getByRole('button', { name: '/ browse all' }).click();
    const dialog = page.getByRole('dialog', { name: /FIND YOUR/ });
    await dialog.getByRole('searchbox').fill(name);
    await dialog.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await dialog.getByRole('button', { name: '/ load reference code' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.library-provenance')).toContainText(name);
    await expect(page.getByLabel('Programming language')).toHaveValue('python');
    await expect(page.locator('.detection-chip')).toHaveCount(0);
    await page.getByRole('button', { name: '/ run code', exact: true }).click();
    await expect(page.getByTestId('run-loading')).toHaveCount(0);
    await page.getByRole('button', { name: 'Jump to end' }).click();
    await expect(page.getByTestId('stdout')).toContainText(output);
    await expect(page.locator('.notice[role="alert"]')).toHaveCount(0);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/database-library-workspace.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('featured database variants, loading failures, and edited code remain usable', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).toHaveCount(0);
  await page.getByRole('button', { name: '/ browse all' }).click();
  const dialog = page.getByRole('dialog', { name: /FIND YOUR/ });
  await dialog.getByRole('searchbox').fill('Palindrome check');
  await dialog.getByRole('button', { name: /^Palindrome check/ }).click();
  await expect(dialog.getByLabel('Implementation language').locator('option')).toHaveCount(1);
  await expect(dialog.getByLabel('Implementation language')).toHaveValue('python');
  await dialog.getByRole('button', { name: '/ load example EX.08' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('Programming language')).toHaveValue('python');
  await expect(page.locator('.detection-chip')).toHaveCount(0);
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByTestId('run-loading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('Palindrome: True');
  await page.getByRole('button', { name: '/ browse all' }).click();
  await dialog.getByRole('searchbox').fill('Dijkstra');
  await dialog.getByRole('button', { name: /^Dijkstra/ }).click();
  await page.route('**/api/library?*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"error":"unavailable"}',
    }),
  );
  await dialog.getByRole('button', { name: '/ load reference code' }).click();
  await expect(dialog.getByTestId('library-error')).toContainText('Please retry');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close algorithm library' }).click();
  await expect(page.getByLabel('Programming language')).toHaveValue('python');
  await page.unroute('**/api/library?*');
  await page.getByRole('button', { name: '/ new code', exact: true }).click();
  const editor = page.locator('.monaco-editor textarea');
  await expect(editor).toBeFocused();
  await page.keyboard.insertText('print("Still editable")');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByTestId('run-loading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('Still editable');
  const response = await page.request.get(
    `/api/library?id=${encodeURIComponent(algorithms[0].id)}&language=ruby`,
  );
  expect(response.status()).toBe(400);
});

test('a delayed library response cannot overwrite a new editor draft', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).toHaveCount(0);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/library?*', async (route) => {
    await gate;
    await route.continue();
  });
  await page.getByRole('button', { name: '/ browse all' }).click();
  const dialog = page.getByRole('dialog', { name: /FIND YOUR/ });
  await dialog.getByRole('searchbox').fill('Dijkstra');
  await dialog.getByRole('button', { name: /^Dijkstra/ }).click();
  await dialog.getByRole('button', { name: '/ load reference code' }).click();
  await expect(dialog.getByRole('button', { name: '/ load reference code' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close algorithm library' }).click();
  const editor = page.locator('.monaco-editor textarea');
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('print("My draft survived")');
  release();
  await expect(page.getByRole('status').filter({ hasText: 'Your code changed' })).toBeVisible();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByTestId('run-loading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('My draft survived');
});
