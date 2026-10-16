import { test, expect } from '@playwright/test';
import { decodeShare, encodeShare, encodeShortShare } from '../../src/lib/share';

for (const language of ['cpp', 'java'])
  for (const compact of [false, true]) {
    test(`old ${compact ? 'compact' : 'legacy'} ${language} shares retain source without execution`, async ({
      page,
      context,
    }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const code =
        language === 'cpp'
          ? '#include <iostream>\nint main() { std::cout << 42; }'
          : 'public class Main { public static void main(String[] args) { System.out.println(42); } }';
      const uploads: string[] = [];
      page.on('request', (request) => {
        if (request.method() === 'POST') uploads.push(request.url());
      });
      await page.goto(
        '/' + (compact ? encodeShortShare : encodeShare)(code, 'private input', language),
      );
      await expect(page.getByTestId('site-loading')).not.toBeVisible();
      await expect(page.locator('.monaco-editor .view-lines')).toContainText(code.split('\n')[0]);
      await expect(
        page.getByRole('status').filter({ hasText: 'Unsupported language' }),
      ).toContainText(language === 'cpp' ? 'C++' : 'Java');
      await expect(page.getByLabel('Programming language').locator('option')).toHaveCount(3);
      await expect(page.getByRole('button', { name: '/ run code', exact: true })).toBeDisabled();
      await page.keyboard.press('ControlOrMeta+Enter');
      await expect(page.getByRole('button', { name: 'Jump to end' })).toHaveCount(0);
      await page.getByRole('button', { name: '/ share', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Link copied', exact: true })).toBeVisible();
      expect(decodeShare(await page.evaluate(() => navigator.clipboard.readText()))).toEqual({
        code,
        stdin: 'private input',
        language,
      });
      await page.getByRole('button', { name: '/ new code', exact: true }).click();
      await page.getByRole('button', { name: '/ undo new code', exact: true }).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Unsupported language' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: '/ run code', exact: true })).toBeDisabled();
      await page.getByLabel('Programming language').selectOption('javascript');
      await expect(page.locator('.monaco-editor .view-lines')).toContainText(code.split('\n')[0]);
      const editor = page.locator('.monaco-editor textarea');
      await editor.focus();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.insertText('const value = 9;\nconsole.log(value);');
      await page.getByRole('button', { name: '/ run code', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
      await page.getByRole('button', { name: 'Jump to end' }).click();
      await expect(page.getByTestId('stdout')).toHaveText('9\n');
      expect(uploads).toEqual([]);
    });
  }

test('removed simulation is rejected by the production route without AI configuration', async ({
  request,
}) => {
  const response = await request.post('/api/analyze', {
    data: { mode: 'simulate', language: 'cpp' },
  });
  expect(response.status()).toBe(410);
  expect(await response.json()).toEqual({
    error: 'AI-simulated traces have been removed. Run Python or JavaScript locally.',
  });
});

for (const [language, code] of [
  ['C++', '#include <iostream>\nint main() { std::cout << 42; }'],
  [
    'Java',
    'public class Main { public static void main(String[] args) { System.out.println(42); } }',
  ],
]) {
  test(`Auto reports ${language} as unsupported without changing source or runtime`, async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('site-loading')).not.toBeVisible();
    await page.getByRole('button', { name: '/ new code', exact: true }).click();
    await page.locator('.monaco-editor textarea').focus();
    await page.keyboard.insertText(code);
    await expect(page.locator('.detection-chip')).toContainText(
      `${language} detected — unsupported`,
    );
    await expect(page.getByLabel('Programming language')).toHaveValue('auto');
    await expect(page.locator('.filebar')).toContainText('.py');
    await expect(page.locator('.monaco-editor .view-lines')).toContainText(code.split('\n')[0]);
  });
}
