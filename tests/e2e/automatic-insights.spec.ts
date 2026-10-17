import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { encodeShare } from '../../src/features/share/public/codec';

const code = 'def size(n):\n    return n\nprint(size(3))\n';

test('merges Insights and adds AI notes automatically after real local inspection', async ({ page }) => {
  const posts: Record<string, unknown>[] = [];
  await page.route('**/api/analyze*', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: route.request().url().includes('?') ? { cached: false } : { configured: true } });
    }
    const body = route.request().postDataJSON();
    posts.push(body);
    return route.fulfill({ json: body.mode === 'analysis'
      ? { source: 'ai', identity: body.identity, advice: {
        summary: 'This function returns the supplied size.', issues: [], optimization: null,
        tests: [{ name: 'zero', entry: 'size', line: 1, argument: 0, expectedOutput: '0' }],
      } }
      : { source: 'ai', enrichment: {
        summary: 'Returns the supplied number without a loop.', pattern: 'Direct return',
        functions: [{ name: 'size', line: 1, purpose: 'Returns the supplied number.', returns: 'The input.' }],
        annotations: [{ line: 2, text: 'Return n unchanged.' }], stepNotes: [],
      } } });
  });
  await page.goto('/' + encodeShare(code, 'private-input', 'python'));
  await expect(page.getByTestId('site-loading')).toBeHidden();
  await expect(page.getByRole('tab', { name: /insights/i })).toBeVisible({ timeout: 2000 });
  await expect(page.getByRole('tab')).toHaveCount(3);
  await page.getByRole('tab', { name: /insights/i }).click();
  await expect(page.getByText('Returns the supplied number without a loop.')).toBeVisible();
  await expect(page.getByText('This function returns the supplied size.')).toBeVisible();
  await expect.poll(() => posts.length).toBe(2);
  for (const body of posts) {
    expect(body).not.toHaveProperty('stdin');
    expect(body).not.toHaveProperty('stdout');
    expect(body).not.toHaveProperty('variables');
    expect(JSON.stringify(body)).not.toContain('private-input');
  }
  await expect(page.getByRole('button', { name: /enrich with AI|request AI suggestions/i })).toHaveCount(0);
  await page.getByText('Suggested tests', { exact: true }).click();
  await expect(page.getByText('Not checked yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Check suggested tests' }).click();
  await expect(page.getByText(/Real worker completed/)).toBeVisible();
  await page.getByRole('tab', { name: /visualizer/i }).click();
  await page.getByRole('tab', { name: /insights/i }).click();
  await expect.poll(() => posts.length).toBe(2);
});

test('uses a real offline AST without any AI upload', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/analyze*', (route) => {
    if (route.request().method() === 'POST') posts++;
    return route.fulfill({ json: { configured: false, reason: 'AI is disabled.' } });
  });
  await page.goto('/' + encodeShare(code, '', 'python'));
  await expect(page.getByTestId('site-loading')).toBeHidden();
  await page.getByRole('tab', { name: /insights/i }).click();
  await expect(page.locator('.insights-pane[data-notes-source="local"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /size\(n\)/ })).toBeVisible();
  await expect(page.getByText(/AI is disabled/)).toBeVisible();
  expect(posts).toBe(0);
});

test('Insights supports both themes, mobile, reduced motion and keyboard navigation', async ({ page }) => {
  await page.route('**/api/analyze*', (route) => route.fulfill({ json: { configured: false, reason: 'AI is disabled.' } }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/' + encodeShare(code, '', 'python'));
  await expect(page.getByTestId('site-loading')).toBeHidden();
  await page.getByRole('tab', { name: '01 visualizer' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '02 insights' })).toBeFocused();
  await expect(page.getByRole('tab', { name: '02 insights' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: /size\(n\)/ })).toBeVisible();
  const structure = page.locator('summary').filter({ hasText: 'Code structure' });
  await structure.focus();
  await page.keyboard.press('Enter');
  await expect(structure.locator('..').getByRole('button', { name: /Line 1–2/ })).toBeVisible();
  await page.getByRole('tab', { name: '02 insights' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '03 complexity' })).toBeFocused();
  await page.getByRole('button', { name: 'MENU', exact: true }).click();
  await page.getByRole('dialog', { name: '/ codelens.' }).getByRole('button', { name: /02 Insights/ }).click();
  await expect(page.getByRole('tab', { name: '02 insights' })).toHaveAttribute('aria-selected', 'true');
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `artifacts/automatic-insights/${theme}-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
  }

});
