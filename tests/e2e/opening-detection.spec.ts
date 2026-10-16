import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { encodeShare } from "../../src/features/share/public/codec";
import { examples } from "../../src/lib/examples";
declare global {
  interface Window {
    introTestTimes: { exit?: number; done?: number };
  }
}

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await expect(page.locator('.monaco-editor textarea')).toBeAttached();
}
async function paste(page: Page, code: string) {
  const editor = page.locator('.monaco-editor textarea');
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(code);
}

test('SSR intro covers an inert app, observes real readiness and enforces its minimum', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('class="page-intro"');
  expect(html.match(/<div[^>]*data-intro-background[^>]*>/)?.[0]).toContain(
    'inert="" aria-busy="true"',
  );
  expect(html).toContain('000');
  await page.addInitScript(() => {
    const times: { exit?: number; done?: number } = {};
    window.introTestTimes = times;
    new MutationObserver(() => {
      const intro = document.querySelector('[data-testid="site-loading"]');
      if (intro?.getAttribute('data-exiting') === 'true') times.exit ??= performance.now();
      if (!intro && times.exit) times.done ??= performance.now();
    }).observe(document, { subtree: true, attributes: true, childList: true });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const intro = page.getByTestId('site-loading');
  await expect(intro).toBeVisible();
  await expect(page.locator('[data-intro-background]')).toHaveAttribute('inert', '');
  await expect(intro).not.toBeVisible();
  const timing = await page.evaluate(() => ({
    start: window.__codelensIntroStarted,
    times: window.introTestTimes,
  }));
  expect(timing.times.exit! - timing.start!).toBeGreaterThanOrEqual(1380);
  expect(timing.times.done! - timing.start!).toBeLessThan(10480);
  await expect(page.getByLabel('Programming language')).toBeFocused();
  await expect(page.locator('[data-intro-background]')).toHaveAttribute('aria-busy', 'false');
});

test('refresh and new tabs each show the intro again', async ({ page, context }) => {
  await ready(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('site-loading')).toBeVisible();
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  const second = await context.newPage();
  await second.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(second.getByTestId('site-loading')).toBeVisible();
  await expect(second.getByTestId('site-loading')).not.toBeVisible();
  await second.close();
});

for (const method of ['click', 'Enter', 'Escape'])
  test(`intro supports ${method} skip after the delay while assets are stalled`, async ({
    page,
  }) => {
    await page.route('**/runtime-assets.json', (route) => route.abort());
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const intro = page.getByTestId('site-loading');
    const skip = intro.getByRole('button', { name: /Skip intro/ });
    await expect(intro).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(intro).toHaveAttribute('data-exiting', 'false');
    await expect(skip).toBeEnabled();
    if (method === 'click') await intro.locator('.intro-definition').click();
    else await page.keyboard.press(method);
    await expect(intro).not.toBeVisible();
    await expect(page.getByLabel('Programming language')).toBeFocused();
  });

test('intro is accessible on mobile, traps focus and honors reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/runtime-assets.json', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const intro = page.getByTestId('site-loading');
  await expect(intro.locator('.intro-reduced')).toBeVisible();
  expect(await intro.evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0.12s');
  expect(
    await intro.locator('.intro-stripe > div').evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
  await expect(intro.getByRole('button', { name: /Skip intro/ })).toBeEnabled();
  await page.keyboard.press('Tab');
  await expect(intro.getByRole('button', { name: /Skip intro/ })).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/page-intro-reduced-mobile.png' });
  await expect(intro).not.toBeVisible();
});

test('stalled Monaco never reports full readiness and cannot trap the intro', async ({ page }) => {
  await page.route('**/monaco/**', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('site-loading')).toBeVisible();
  await expect
    .poll(async () =>
      Number(
        await page.getByRole('progressbar', { name: 'Workspace readiness' }).getAttribute('value'),
      ),
    )
    .toBeGreaterThan(0);
  expect(
    Number(
      await page.getByRole('progressbar', { name: 'Workspace readiness' }).getAttribute('value'),
    ),
  ).toBeLessThanOrEqual(60);
  await expect(page.getByTestId('site-loading')).not.toBeVisible({ timeout: 11000 });
  await expect(page.getByRole('button', { name: '/ new code', exact: true })).toBeEnabled();
});

test('inline watchdog releases the SSR intro if hydration chunks fail', async ({ page }) => {
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('site-loading')).toBeVisible();
  await expect(page.getByTestId('site-loading')).not.toBeVisible({ timeout: 11000 });
  await expect(page.locator('[data-intro-background]')).not.toHaveAttribute('inert', '');
  await expect(page.locator('[data-intro-background]')).toHaveAttribute('aria-busy', 'false');
});

for (const [language, label, code] of [
  ['python', 'Python', 'def total(values):\n    return sum(values)\nprint(total([1,2,3]))'],
  [
    'javascript',
    'JavaScript',
    'function total(values) { return values.length; }\nconsole.log(total([1,2,3]));',
  ],
])
  test(`Auto detects a ${label} draft and preserves source`, async ({ page }) => {
    await ready(page);
    await expect(page.getByLabel('Programming language')).toHaveValue('auto');
    await page.getByRole('button', { name: '/ new code', exact: true }).click();
    await paste(page, code);
    await expect(page.locator('.detection-chip')).toContainText(`Detected: ${label}`);
    const selector = page.getByLabel('Programming language');
    await expect(selector).toHaveValue('auto');

    await expect(page.locator('.filebar')).toContainText(
      language === 'javascript' ? '.js' : '.py',
    );
    await expect(page.locator('.monaco-editor .view-lines')).toContainText(code.split('\n')[0]);
  });

test('manual choice remains authoritative and Auto offers an explicit Switch without discarding code', async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel('Programming language').selectOption('javascript');
  const code = 'def total(values):\n    return sum(values)\nprint(total([1,2,3]))';
  await paste(page, code);
  await expect(page.getByLabel('Programming language')).toHaveValue('javascript');
  await expect(page.locator('.detection-chip')).toHaveCount(0);
  await page.getByLabel('Programming language').selectOption('auto');
  const chip = page.getByRole('button', { name: 'Detected: Python · Switch' });
  await expect(chip).toBeVisible();
  await expect(page.locator('.filebar')).toContainText('.js');
  await chip.click();
  await expect(page.getByLabel('Programming language')).toHaveValue('python');
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('return sum(values)');
});

test('manual selection preserves pasted source even when it matches a built-in sample', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('button', { name: '/ new code', exact: true }).click();
  await paste(page, examples[2].code);
  await expect(page.locator('.detection-chip')).toContainText('Detected: Python');
  await page.getByLabel('Programming language').selectOption('javascript');
  await expect(page.locator('.filebar')).toContainText(
    `${examples[2].code.split('\n').length} LINES`,
  );
  await expect(page.locator('.monaco-editor .view-lines')).toContainText('def fibonacci');
});

test('short and unsupported drafts never switch and sample/share loads suppress detection', async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator('.detection-chip')).toHaveCount(0);
  await page.getByRole('button', { name: '/ new code', exact: true }).click();
  await paste(page, 'x = 1');
  await page.waitForTimeout(500);
  await expect(page.locator('.detection-chip')).toHaveCount(0);
  await paste(page, 'fn main() { println!("A sufficiently long Rust program"); }');
  await expect(page.getByText('unsupported language detected', { exact: true })).toBeVisible();
  await expect(page.locator('.filebar')).toContainText('.py');
  await page.goto(
    '/' + encodeShare('function total(values) { return values.length; }', '', 'python'),
  );
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await expect(page.getByLabel('Programming language')).toHaveValue('python');
  await expect(page.locator('.detection-chip')).toHaveCount(0);
});

test('ambiguous drafts load the real same-origin worker model with immutable assets and no upload', async ({
  page,
  request,
}) => {
  const outgoing: { url: string; method: string }[] = [];
  const errors: string[] = [];
  page.on('request', (r) => outgoing.push({ url: r.url(), method: r.method() }));
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  expect(outgoing.some((r) => r.url.includes('/language-detection/'))).toBe(false);
  await page.getByRole('button', { name: '/ new code', exact: true }).click();
  await paste(
    page,
    'interface Thing extends Record<string, unknown> {\n readonly name: string;\n readonly value: number;\n}\nexport default class Collection {\n private items: Record<string, Thing> = {};\n add(item: Thing): void { this.items[item.name] = item; }\n get(name: string): Thing | undefined { return this.items[name]; }\n}',
  );
  await expect(page.locator('.detection-chip')).toContainText(
    'TypeScript detected — unsupported.',
    {
      timeout: 30000,
    },
  );
  const model = outgoing.find((r) => r.url.endsWith('/model.json'));
  expect(model?.url).toMatch(/\/language-detection\/[a-f0-9]{16}\/model.json$/);
  expect(outgoing.some((r) => r.url.endsWith('/group1-shard1of1.bin'))).toBe(true);
  const response = await request.get(model!.url);
  expect(response.headers()['cache-control']).toContain('immutable');
  expect(outgoing.every((r) => new URL(r.url).origin === new URL(page.url()).origin)).toBe(true);
  expect(outgoing.some((r) => r.method === 'POST')).toBe(false);
  expect(errors).toEqual([]);
});
