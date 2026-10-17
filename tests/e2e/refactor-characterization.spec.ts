import { fulfillNotes } from './fixtures/ai-notes';
import { test, expect } from '@playwright/test';
import { encodeShare } from "../../src/features/share/public/codec";

test('preferences survive reload and playback speed stays adjustable', async ({ page }) => {
  await page.goto(
    '/' +
      encodeShare('values = [3, 1, 2]\nvalues.sort()\nprint(values)\n', '', 'python'),
  );
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.getByRole('button', { name: 'Reduce motion' }).click();
  await page.reload();
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await expect(page.getByRole('button', { name: 'Reduce motion' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByLabel('Playback speed').fill('7');
  await expect(page.getByLabel('Playback speed')).toHaveValue('7');
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toHaveText('[1, 2, 3]\n');
});

test('AI proposal applies only explicitly, clears stale execution, and supports editor undo', async ({
  page,
}) => {
  const source =
    'def total(n):\n    value = 0\n    for i in range(n):\n        value += i\n    return value\nprint(total(4))\n';
  const proposed = source.replace('value += i', 'value += 2 * i');
  await page.route('**/api/analyze', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: { configured: true, reason: null } });
    if (await fulfillNotes(route)) return;
    const request = route.request().postDataJSON();
    expect(request.mode).toBe('analysis');
    expect(request).not.toHaveProperty('stdin');
    expect(request).not.toHaveProperty('stdout');
    expect(request).not.toHaveProperty('steps');
    return route.fulfill({
      json: {
        source: 'ai',
        identity: request.identity,
        advice: {
          summary: 'Fixture advice.',
          issues: [],
          optimization: { code: proposed, explanation: 'Unverified proposal.', lines: [3] },
          tests: [],
        },
      },
    });
  });
  await page.goto('/' + encodeShare(source, 'private-input', 'python'));
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toHaveText('6\n');
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.getByRole('button', { name: /total\(n\)/ })).toBeVisible();
  await page.getByText('Proposed changes · unverified', { exact: true }).click();
  await expect(page.getByLabel('Optimization diff')).toContainText('+');
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('value += i');
  await page.getByRole('button', { name: 'Apply proposed code to editor' }).click();
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('value += 2 * i');
  await expect(page.getByRole('button', { name: 'Apply proposed code to editor' })).toHaveCount(0);
  await page.getByRole('tab', { name: '01 visualizer' }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeDisabled();
  await page.locator('.monaco-editor textarea').focus();
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('value += i');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toHaveText('6\n');
});
