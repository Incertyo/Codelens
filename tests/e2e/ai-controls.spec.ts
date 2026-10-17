import { test, expect } from '@playwright/test';
import { encodeShare } from '../../src/features/share/public/codec';
const code = 'def size(n):\n    return n\nprint(size(3))\n';

test('rechecks an exhausted budget before automatically uploading source', async ({ page }) => {
  let gets = 0, posts = 0;
  await page.route('**/api/analyze', (route) => {
    if (route.request().method() !== 'GET') {
      posts++;
      return route.fulfill({ status: 500, json: {} });
    }
    gets++;
    return route.fulfill({ json: { configured: gets === 1, reason: 'AI notes are paused for today. Static analysis and traces remain available.' } });
  });
  await page.goto('/' + encodeShare(code, '', 'python'));
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.locator('.insights-status')).toContainText('AI notes are paused for today');
  await expect(page.getByRole('button', { name: /enrich with AI|Request AI suggestions/ })).toHaveCount(0);
  expect(gets).toBeGreaterThanOrEqual(2);
  expect(posts).toBe(0);
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
});

test('provider quota pauses AI without retry, discloses free-tier use and keeps local work', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/analyze', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true } });
    posts++;
    return route.fulfill({ status: 429, json: { source: 'static', code: 'provider_quota', error: 'AI notes are paused: provider quota reached. Local analysis and traces remain available.' } });
  });
  await page.goto('/' + encodeShare(code, '', 'python'));
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  expect(posts).toBe(0);
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.getByText(/Opening Insights automatically sends source code/)).toContainText('free tiers may use inputs to improve products');
  await expect(page.locator('.insights-status')).toContainText('AI notes are paused: provider quota reached');
  await expect(page.getByRole('button', { name: /size\(n\)/ })).toBeVisible();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('3');
  expect(posts).toBe(1);
});

test('missing limiter readiness explains why AI is unavailable while real traces still work', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/analyze', (route) => {
    if (route.request().method() === 'POST') posts++;
    return route.fulfill({ json: { configured: false, reason: 'AI rate limiter not configured.', code: 'limiter_not_configured' } });
  });
  await page.goto('/' + encodeShare(code, '', 'python'));
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('3');
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.getByRole('button', { name: /enrich with AI|Request AI suggestions/ })).toHaveCount(0);
  await expect(page.getByText(/AI rate limiter not configured/)).toBeVisible();
  await expect(page.getByRole('button', { name: /size\(n\)/ })).toBeVisible();
  expect(posts).toBe(0);
});

test('daily budget is shown without replaying POSTs; a new Run checks availability again', async ({ page }) => {
  let paused = false, posts = 0, gets = 0;
  await page.route('**/api/analyze', (route) => {
    if (route.request().method() === 'GET') {
      gets++;
      return route.fulfill({ json: { configured: !paused, reason: 'AI notes are paused for today. Static analysis and traces remain available.' } });
    }
    posts++;
    paused = true;
    return route.fulfill({ status: 429, json: { source: 'static', code: 'daily_limit', error: 'AI notes are paused for today. Static analysis and traces remain available.' } });
  });
  await page.goto('/' + encodeShare(code, '', 'python'));
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.locator('.insights-status')).toContainText('AI notes are paused for today');
  await page.getByRole('tab', { name: '01 visualizer' }).click();
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.getByRole('button', { name: /size\(n\)/ })).toBeVisible();
  expect(posts).toBe(1);
  const previousGets = gets;
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  paused = false;
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect.poll(() => posts).toBe(2);
  expect(gets).toBeGreaterThan(previousGets);
  await expect(page.locator('.insights-status')).toContainText('AI notes are paused for today');
});
