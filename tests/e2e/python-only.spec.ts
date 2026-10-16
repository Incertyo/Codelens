import { test, expect, type Page } from '@playwright/test';
import { encodeShare, encodeShortShare } from "../../src/features/share/public/codec";

async function paste(page: Page, code: string) {
  const editor = page.locator('.monaco-editor textarea');
  await expect(editor).toBeAttached();
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(code);
}

test('editor offers only Python and runs pasted code in real Pyodide', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await expect(page.getByLabel('Programming language')).toHaveCount(0);
  await expect(page.locator('.file-mark')).toHaveText('PYTHON');
  await paste(page, 'values = [1, 2, 3]\nprint(sum(values))');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toHaveText('6\n');
});

test('pasted JavaScript is unsupported and shortcuts cannot execute it', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await paste(page, 'const values = [1, 2, 3];\nconsole.log(values.length);');
  await expect(page.getByText('Only Python can run in this editor.', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '/ run code', exact: true })).toBeDisabled();
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.getByRole('button', { name: 'Jump to end' })).toHaveCount(0);
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('const values');
});

test('featured library examples offer only Python implementations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('button', { name: '/ browse all' }).click();
  const dialog = page.getByRole('dialog', { name: /FIND YOUR/ });
  await dialog.getByRole('searchbox').fill('Palindrome check');
  await dialog.getByRole('button', { name: /^Palindrome check/ }).click();
  await expect(dialog.getByLabel('Implementation language')).toHaveCount(0);
  await dialog.getByRole('button', { name: /^\/ load example EX/ }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.file-mark')).toHaveText('PYTHON');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('True');
});

for (const compact of [false, true])
  test(`old ${compact ? 'compact' : 'legacy'} JavaScript shares remain source-only`, async ({ page }) => {
    const code = 'console.log("KEEP SOURCE");';
    await page.goto('/' + (compact ? encodeShortShare : encodeShare)(code, 'keep stdin', 'javascript'));
    await expect(page.getByTestId('site-loading')).not.toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Unsupported language: JavaScript' })).toBeVisible();
    await expect(page.locator('.monaco-editor .view-lines')).toContainText(code);
    await expect(page.getByRole('button', { name: '/ run code', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Jump to end' })).toHaveCount(0);
    await page.getByRole('button', { name: '/ new code', exact: true }).click();
    await paste(page, 'print(9)');
    await page.getByRole('button', { name: '/ run code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
    await page.getByRole('button', { name: 'Jump to end' }).click();
    await expect(page.getByTestId('stdout')).toHaveText('9\n');
  });
