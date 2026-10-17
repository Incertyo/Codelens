import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import snapshot from '../../src/generated/library.json' with { type: 'json' };
import { examples } from '../../src/lib/examples';
import { encodeShare } from '../../src/features/share/public/codec';

const samples = [
  { name: 'Bubble sort', code: examples.find(item => item.title === 'Bubble sort')!.code, pattern: 'for.*range\\(len\\(numbers\\)', copy: false },
  { name: 'Dutch national flag', code: snapshot.implementations.find(item => item.id.includes('/dutch-national-flag:'))!.code, pattern: 'python', copy: true },
];
test('AI is the primary report while local AST is held as a fallback', async ({ page }) => {
  let release = () => {};
  let requested = false;
  await page.route('**/api/analyze*', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: route.request().url().includes('?') ? { cached: false } : { configured: true } });
    const body = route.request().postDataJSON();
    if (body.mode === 'analysis') return route.fulfill({ json: { source: 'ai', identity: body.identity, advice: { summary: 'AI review.', issues: [], optimization: null, tests: [] } } });
    requested = true;
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { source: 'ai', enrichment: { summary: 'AI explains this function.', pattern: 'Direct return', functions: [{ name: 'size', line: 1, purpose: 'AI function explanation.', returns: 'The input.' }], annotations: [{ line: 2, text: 'AI return explanation.' }], stepNotes: [] } } });
  });
  try {
    await page.goto('/' + encodeShare('def size(n):\n    return n\n', '', 'python'));
    await expect(page.getByTestId('site-loading')).toBeHidden();
    await page.getByRole('tab', { name: '02 insights' }).click();
    await expect.poll(() => requested).toBe(true);
    await expect(page.locator('.insights-pane')).toHaveAttribute('data-notes-source', 'loading', { timeout: 2000 });
    await expect(page.getByText('Computes and returns n.')).toHaveCount(0);
    release();
    await expect(page.getByText('AI explains this function.')).toBeVisible();
    await expect(page.getByText('AI function explanation.')).toBeVisible();
    await expect(page.getByText('AI return explanation.').first()).toBeVisible();
    await expect(page.locator('.insights-pane')).toHaveAttribute('data-notes-source', 'ai');
    await expect(page.locator('.insights-pane')).not.toContainText(/estimate/i);
  } finally { release(); }
});

test('invalid AI notes show the real local AST fallback without any cost guesses', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/analyze*', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: route.request().url().includes('?') ? { cached: false } : { configured: true } });
    posts++;
    return route.fulfill({ json: { source: 'static', reason: 'AI notes returned an invalid response after one validation retry. Local analysis and traces remain available.' } });
  });
  await page.goto('/' + encodeShare('def size(n):\n    return n\n', '', 'python'));
  await expect(page.getByTestId('site-loading')).toBeHidden();
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.locator('.insights-pane')).toHaveAttribute('data-notes-source', 'local');
  await expect(page.getByText('Local code notes · fallback')).toBeVisible();
  await expect(page.getByRole('button', { name: /size\(n\)/ })).toBeVisible();
  await expect(page.getByText('Computes and returns n.')).toBeVisible();
  await expect(page.locator('.insights-pane')).not.toContainText(/estimate|O\(/i);
  expect(posts).toBe(1);
});
for (const sample of samples) test(`${sample.name} uses the same structured, source-labelled report from a real run`, async ({ page }) => {
  const posts: Record<string, unknown>[] = [];
  await page.route('**/api/analyze*', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: route.request().url().includes('?') ? { cached: false } : { configured: true } });
    const body = route.request().postDataJSON();
    posts.push(body);
    return route.fulfill({ json: body.mode === 'analysis'
      ? { source: 'ai', identity: body.identity, advice: { summary: 'Review requires a real run.', issues: [], optimization: null, tests: [] } }
      : { source: 'ai', enrichment: { summary: 'Fixture source explanation.', pattern: sample.pattern, functions: [], annotations: [], stepNotes: [], timeComplexity: sample.copy ? 'O(n)' : 'O(n^2)', spaceComplexity: 'O(1)', suggestions: [{ type: 'bug', message: 'None detected; the algorithm is correct.' }, { type: 'style', message: 'Add a comment.' }] } } });
  });
  await page.goto('/' + encodeShare(sample.code, 'PRIVATE_INPUT', 'python'));
  await expect(page.getByTestId('site-loading')).toBeHidden();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.getByText('Fixture source explanation.')).toBeVisible();
  await expect(page.locator('[data-insights-section]')).toHaveCount(4, { timeout: 2000 });
  expect(await page.locator('[data-insights-section]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-insights-section')))).toEqual(['overview', 'structure', 'evidence', 'review']);
  await expect(page.locator('.insights-pane')).toHaveAttribute('data-notes-source', 'ai');
  await expect(page.locator('.insights-pane')).not.toContainText(/estimate|O\(/i);
  await expect(page.getByRole('table', { name: 'Complexity estimates by source and scope' })).toHaveCount(0);
  await expect(page.getByText('Loop-based processing', { exact: true })).toHaveCount(0);
  await expect(page.getByText('None detected; the algorithm is correct.')).toHaveCount(0);
  await expect(page.getByText('Add a comment.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Review requires a real run.')).toBeVisible();
  await expect(page.locator('.hotspot-list:visible button')).toHaveCount(5);
  await page.getByText(/All line counts/).focus();
  await page.keyboard.press('Enter');
  expect(await page.locator('.hotspot-list:visible button').count()).toBeGreaterThan(5);
  await expect(page.locator('.insights-warning')).toHaveCount(0);
  await expect.poll(() => posts.length).toBe(2);
  expect(posts.every(body => body.format === 'structured')).toBe(true);
  expect(JSON.stringify(posts)).not.toContain('PRIVATE_INPUT');
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `artifacts/automatic-insights/structured-${sample.name.replaceAll(' ', '-').toLowerCase()}-${theme}.png`, fullPage: true });
  }
});

test('a failed AI review remains explicit while validated notes and real AST stay visible', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/analyze*', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: route.request().url().includes('?') ? { cached: false } : { configured: true } });
    posts++;
    const body = route.request().postDataJSON();
    if (body.mode === 'analysis') return route.fulfill({ status: 503, json: { source: 'static', error: 'Fixture review unavailable.' } });
    return route.fulfill({ json: { source: 'ai', enrichment: { summary: 'The function returns its argument.', pattern: 'Direct return', functions: [{ name: 'size', line: 1, purpose: 'Returns the supplied argument.', returns: 'The input.' }], annotations: [], stepNotes: [] } } });
  });
  await page.goto('/' + encodeShare('def size(n):\n    return n\n', '', 'python'));
  await expect(page.getByTestId('site-loading')).toBeHidden();
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.getByText('The function returns its argument.')).toBeVisible();
  await expect(page.getByRole('button', { name: /size\(n\)/ })).toBeVisible();
  await expect(page.locator('[data-insights-section="review"]')).toContainText('AI review is unavailable. Fixture review unavailable.');
  await expect(page.getByText('AI review added.', { exact: false })).toHaveCount(0);
  expect(posts).toBe(2);
});

test('leaving and returning pauses a pending review without replaying provider requests', async ({ page }) => {
  let release = () => {};
  let posts = 0;
  await page.route('**/api/analyze*', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: route.request().url().includes('?') ? { cached: false } : { configured: true } });
    posts++;
    const body = route.request().postDataJSON();
    if (body.mode === 'analysis') {
      await new Promise<void>(resolve => { release = resolve; });
      await route.fulfill({ json: { source: 'ai', identity: body.identity, advice: { summary: 'Delayed review.', issues: [], optimization: null, tests: [] } } }).catch(() => {});
      return;
    }
    return route.fulfill({ json: { source: 'ai', enrichment: { summary: 'The function returns its argument.', pattern: 'Direct return', functions: [], annotations: [], stepNotes: [] } } });
  });
  try {
    await page.goto('/' + encodeShare('def size(n):\n    return n\n', '', 'python'));
    await expect(page.getByTestId('site-loading')).toBeHidden();
    await page.getByRole('tab', { name: '02 insights' }).click();
    await expect.poll(() => posts).toBe(2);
    await page.getByRole('tab', { name: '01 visualizer' }).click();
    await page.getByRole('tab', { name: '02 insights' }).click();
    await expect(page.locator('[data-insights-section="review"]')).toContainText('AI review was paused.', { timeout: 2000 });
    await expect(page.getByText('The function returns its argument.')).toBeVisible();
    expect(posts).toBe(2);
  } finally { release(); }
});
