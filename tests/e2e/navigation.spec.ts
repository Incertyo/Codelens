import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { additionalExamples } from "../../src/lib/additional-examples";
import { algorithmTopics, algorithms } from "../../src/lib/algorithm-catalog";
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).toHaveCount(0);
  await expect(page.locator('.monaco-editor textarea')).toBeAttached();
}
async function run(page: Page) {
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByTestId('run-loading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jump to end' }).click();
}
test('topic → subtopic → algorithm navigation, global library search, and mobile themes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.getByLabel('Main topic', { exact: true }).selectOption('strings');
  await page.getByLabel('Subtopic', { exact: true }).selectOption('character-scanning');
  const palindrome = algorithms.find((a) => a.name === 'Palindrome check')!;
  await page.getByLabel('Algorithm', { exact: true }).selectOption(palindrome.id);
  await page
    .getByRole('complementary', { name: 'Selected algorithm' })
    .getByRole('button', { name: '/ load example EX.08' })
    .click();
  await run(page);
  await expect(page.getByTestId('stdout')).toContainText('Palindrome: True');
  await page.getByRole('button', { name: '/ browse all' }).click();
  const dialog = page.getByRole('dialog', { name: /FIND YOUR/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('searchbox', { name: 'Search algorithms' }).fill('dijkstra');
  await dialog.getByRole('button', { name: /Dijkstra’s algorithm/ }).click();
  await expect(dialog.getByRole('heading', { name: 'Dijkstra’s algorithm' })).toBeVisible();
  await expect(page.getByLabel('Main topic', { exact: true })).toHaveValue('graphs');
  expect(algorithmTopics.length).toBeGreaterThan(15);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole('searchbox').fill('no-such-algorithm-xyz');
  await expect(dialog).toContainText('No algorithms match');
  await dialog.getByRole('searchbox').fill('heap');
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole('button', { name: 'Close algorithm library' }).click();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.getByRole('button', { name: '/ browse all' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/library-mobile-light.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('new code clears and focuses the editor, rejects empty runs, and can undo', async ({
  page,
}) => {
  await ready(page);
  const editor = page.locator('.monaco-editor textarea');
  await page.getByRole('button', { name: '/ new code', exact: true }).click();
  await expect(editor).toBeFocused();
  await expect(page.locator('.filebar')).toContainText('untitled.py');
  await expect(page.getByRole('button', { name: '/ run code', exact: true })).toBeDisabled();
  await page.keyboard.insertText('value = 42\nprint(value)');
  await run(page);
  await expect(page.getByTestId('stdout')).toContainText('42');
  await page.getByRole('button', { name: '/ new code', exact: true }).click();
  await expect(page.getByTestId('stdout')).toContainText('Your program has the floor');
  await page.getByRole('button', { name: '/ undo new code' }).click();
  await run(page);
  await expect(page.getByTestId('stdout')).toContainText('42');
});
test('site loading follows real editor readiness and every repeat run has a cancellable screen', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/monaco/**', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('site-loading')).toBeVisible();
  await expect(page.locator('.site-shell')).toHaveAttribute('inert', '');
  await page.screenshot({ path: 'artifacts/site-opening-loading.png', fullPage: true });
  release();
  await expect(page.getByTestId('site-loading')).toHaveCount(0);
  await page.unroute('**/monaco/**');
  await page.getByRole('button', { name: '/ new code', exact: true }).click();
  const editor = page.locator('.monaco-editor textarea');
  await editor.focus();
  await page.keyboard.insertText('while True:\n    pass\n');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: '/ run code', exact: true }).click();
    const loading = page.getByRole('dialog', { name: 'Running code' });
    await expect(loading).toBeVisible();
    await expect(loading).toContainText('TRACING PYTHON');
    await expect(loading.getByRole('button', { name: '/ cancel run' })).toBeFocused();
    if (i === 0)
      await page.screenshot({ path: 'artifacts/repeat-run-loading.png', fullPage: true });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('run-loading')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '/ run code', exact: true })).toBeFocused();
  }
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('print("Recovered")');
  await run(page);
  await expect(page.getByTestId('stdout')).toContainText('Recovered');
  await page.getByRole('button', { name: 'Reduce motion' }).click();
});
test('ten new examples execute correctly through real browser worker', async ({ page }) => {
  test.setTimeout(240000);
  await ready(page);
  for (const example of additionalExamples) {
    await page.getByRole('button', { name: '/ examples' }).click();
    await page.getByRole('button', { name: new RegExp(`EX.${example.id}`) }).click();
    await run(page);
    await expect(page.getByTestId('stdout')).toContainText(example.expected!['python']);
    await expect(page.locator('.notice[role="alert"]')).toHaveCount(0);
  }
});
