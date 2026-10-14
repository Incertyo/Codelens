import { test, expect } from '@playwright/test';
import { encodeShare } from '../../src/lib/share';
const code = 'function size(n) { return n; }\nconsole.log(size(3));';

test('provider quota pauses AI without retry, discloses free-tier use and keeps local work', async ({
  page,
}) => {
  let posts = 0;
  await page.route('**/api/analyze', (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({ json: { configured: true, reason: null } });
    posts++;
    return route.fulfill({
      status: 429,
      json: {
        source: 'static',
        code: 'provider_quota',
        error:
          'AI notes are paused: provider quota reached. Local analysis and traces remain available.',
      },
    });
  });
  await page.goto('/' + encodeShare(code, '', 'javascript'));
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('tab', { name: '02 breakdown' }).click();
  await expect(page.getByText(/Source code is sent to the configured provider/)).toContainText(
    'On free tiers, the provider may use it to improve its products.',
  );
  expect(posts).toBe(0);
  await page.getByRole('button', { name: '/ enrich with AI' }).click();
  await expect(page.getByRole('tabpanel', { name: 'breakdown' }).getByRole('status')).toContainText(
    'AI notes are paused: provider quota reached',
  );
  await expect(page.locator('.function-heading h3')).toContainText('size(n)');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('3');
  expect(posts).toBe(1);
});

test('missing limiter readiness explains why AI is unavailable while real traces still work', async ({
  page,
}) => {
  await page.route('**/api/analyze', (route) =>
    route.fulfill({
      json: {
        configured: false,
        reason: 'AI rate limiter not configured.',
        code: 'limiter_not_configured',
      },
    }),
  );
  await page.goto('/' + encodeShare(code, '', 'javascript'));
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('3');
  await page.getByRole('tab', { name: '02 breakdown' }).click();
  await expect(page.getByRole('button', { name: '/ enrich with AI' })).toBeDisabled();
  await expect(page.getByText(/AI rate limiter not configured/)).toBeVisible();
  await expect(page.locator('.function-heading h3')).toContainText('size(n)');
  await page.getByRole('tab', { name: '03 analysis' }).click();
  await expect(
    page.getByRole('button', { name: 'Request AI suggestions', exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/AI rate limiter not configured/)).toBeVisible();
});

test('daily budget response is shown and AI availability can be checked again', async ({
  page,
}) => {
  let paused = false;
  let posts = 0;
  await page.route('**/api/analyze', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          configured: !paused,
          reason: paused
            ? 'AI notes are paused for today. Static analysis and traces remain available.'
            : null,
        },
      });
      return;
    }
    posts++;
    paused = true;
    await route.fulfill({
      status: 429,
      json: {
        source: 'static',
        code: 'daily_limit',
        error: 'AI notes are paused for today. Static analysis and traces remain available.',
      },
    });
  });
  await page.goto('/' + encodeShare(code, '', 'javascript'));
  await page.getByRole('tab', { name: '03 analysis' }).click();
  const button = page.getByRole('button', { name: 'Request AI suggestions', exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.locator('.analysis-status')).toContainText('AI notes are paused for today');
  await expect(button).toBeDisabled();
  paused = false;
  await page.getByRole('button', { name: 'Check AI availability', exact: true }).click();
  await expect(button).toBeEnabled();
  expect(posts).toBe(1);
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
});
