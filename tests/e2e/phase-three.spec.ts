import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { encodeShare } from '../../src/lib/share';
const linearJS =
  'function total(n) {\n let value=0;\n for(let i=0;i<n;i++){value+=i;}\n return value;\n}\nconsole.log(total(8));';
async function openSource(page: Page, code = linearJS, language = 'javascript') {
  await page.goto('/' + encodeShare(code, 'private-stdin', language));
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
}
async function paste(page: Page, code: string) {
  const ed = page.locator('.monaco-editor textarea');
  await ed.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(code);
}
async function analysis(page: Page) {
  await page.getByRole('tab', { name: '03 analysis' }).click();
  await expect(page.getByLabel('Entry function')).toBeVisible();
}
test('real estimates, source hashes, heatmaps, mobile and keyboard accessibility', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openSource(page);
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeDisabled();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await analysis(page);
  const hash = await page.locator('.analysis-pane').getAttribute('data-source-hash');
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  await expect(page.locator('.hotspot-list')).toContainText('executions');
  await expect(page.locator('.heat-line')).not.toHaveCount(0);
  await page.getByLabel('Input generator').selectOption('int');
  await page.getByRole('button', { name: 'Empirically measure', exact: true }).click();
  await expect(page.getByText('Estimated O(n)', { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('table', { name: 'Real captured steps by input size', exact: true })
      .locator('tbody tr'),
  ).toHaveCount(10);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/phase-three-mobile.png', fullPage: true });
  await paste(page, 'function total(a,b) { return a+b; }');
  await expect(page.getByText('Estimated O(n)', { exact: true })).not.toBeVisible();
  await expect(page.locator('.analysis-pane')).not.toHaveAttribute('data-source-hash', hash!);
  await expect(page.getByText(/Cannot use this entry driver/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Empirically measure', exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
test('Python annotated list and string entry generators use real workers', async ({ page }) => {
  await openSource(
    page,
    'def total(items: list[int]):\n    value = 0\n    for item in items:\n        value += item\n    return value\n\ndef size(text: str):\n    return len(text)',
    'python',
  );
  await analysis(page);
  await expect(page.getByLabel('Input generator')).toHaveValue('list');
  await page.getByRole('button', { name: 'Empirically measure', exact: true }).click();
  await expect(page.getByText('Estimated O(n)', { exact: true })).toBeVisible();
  await page.getByLabel('Entry function').selectOption('size');
  await expect(page.getByLabel('Input generator')).toHaveValue('string');
  await page.getByRole('button', { name: 'Empirically measure', exact: true }).click();
  await expect(page.getByText('Estimated O(1)', { exact: true })).toBeVisible();
});
test('AI suggestions are checked by real workers; expected values stay unverified', async ({
  page,
}) => {
  let payload: Record<string, unknown> = {};
  await page.route('**/api/analyze', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { configured: true, reason: null } });
      return;
    }
    payload = route.request().postDataJSON();
    await route.fulfill({
      json: {
        source: 'ai',
        identity: payload.identity,
        advice: {
          summary: 'Fixture suggestions, not proof.',
          issues: [{ line: 4, severity: 'edge-case', message: 'Check zero.' }],
          optimization: {
            code: linearJS.replace('value+=i', 'value = value+i'),
            explanation: 'Equivalent-looking proposal; correctness unverified.',
            lines: [3],
          },
          tests: [
            {
              name: 'zero fixture',
              entry: 'total',
              line: 1,
              argument: 0,
              expectedOutput: '999 (deliberately unverified)',
            },
            {
              name: 'negative fixture',
              entry: 'total',
              line: 1,
              argument: -1,
              expectedOutput: 'unknown',
            },
          ],
        },
      },
    });
  });
  await openSource(page);
  await analysis(page);
  await page.getByRole('button', { name: 'Request AI suggestions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run this test' })).toHaveCount(2);
  await expect(page.locator('.suggested-test').first()).toContainText('Observed output:');
  await expect(page.locator('.suggested-test').first().locator('pre')).toHaveText('0\n');
  await expect(page.locator('.suggested-test').first()).toContainText(
    'AI expected output · unverified',
  );
  expect(payload).not.toHaveProperty('stdin');
  expect(payload).not.toHaveProperty('stdout');
  expect(payload).not.toHaveProperty('steps');
  await page.getByText('Proposed optimization · correctness unverified', { exact: true }).click();
  await expect(page.getByLabel('Optimization diff')).toContainText('+');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Run this test' }).first().click();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toHaveText('0\n');
});
test('stale AI responses never display after source edits; failed tests are not runnable', async ({
  page,
}) => {
  let release: () => void = () => {};
  let requested = false;
  await page.route('**/api/analyze', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { configured: true, reason: null } });
      return;
    }
    const payload = route.request().postDataJSON();
    requested = true;
    await new Promise<void>((r) => (release = r));
    await route
      .fulfill({
        json: {
          source: 'ai',
          identity: payload.identity,
          advice: {
            summary: 'STALE RESULT MUST NEVER SHOW',
            issues: [],
            optimization: null,
            tests: [],
          },
        },
      })
      .catch(() => {});
  });
  await openSource(page);
  await analysis(page);
  await page.getByRole('button', { name: 'Request AI suggestions', exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await paste(page, 'function other(n) { return n; }');
  release();
  await expect(page.getByLabel('Entry function')).toHaveValue('other');
  await expect(page.getByText('STALE RESULT MUST NEVER SHOW')).not.toBeVisible();
  await page.unroute('**/api/analyze');
  await page.route('**/api/analyze', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { configured: true, reason: null } });
      return;
    }
    const p = route.request().postDataJSON();
    await route.fulfill({
      json: {
        source: 'ai',
        identity: p.identity,
        advice: {
          summary: 'Throws on an edge input.',
          issues: [],
          optimization: null,
          tests: [
            { name: 'failing fixture', entry: 'other', line: 1, argument: 0, expectedOutput: '0' },
          ],
        },
      },
    });
  });
  await paste(page, 'function other(n) { throw new Error("fixture failure"); }');
  await expect(page.getByLabel('Entry function')).toHaveValue('other');
  await page.getByRole('button', { name: 'Request AI suggestions', exact: true }).click();
  await expect(page.getByText(/Not runnable:.*fixture failure/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run this test' })).toHaveCount(0);
});
test('simulation needs per-run opt-in, carries a persistent label, and shares never execute', async ({
  page,
}) => {
  let posts = 0;
  await page.route('**/api/analyze', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { configured: true, reason: null } });
      return;
    }
    posts++;
    const p = route.request().postDataJSON();
    expect(p.consent).toBe(true);
    expect(p.language).toBe('cpp');
    expect(p).not.toHaveProperty('stdin');
    await route.fulfill({
      json: {
        source: 'ai-simulated',
        identity: p.identity,
        trace: {
          origin: 'ai-simulated',
          steps: [
            {
              index: 0,
              line: 1,
              event: 'call',
              func: '<module>',
              callStack: [{ id: 'root', func: '<module>', line: 1, locals: {} }],
              globals: {},
              heap: {},
              stdout: '',
            },
            {
              index: 1,
              line: 1,
              event: 'return',
              func: '<module>',
              callStack: [{ id: 'root', func: '<module>', line: 1, locals: {} }],
              globals: {},
              heap: {},
              stdout: '',
            },
          ],
          truncated: false,
          error: null,
          elapsed: 0,
        },
      },
    });
  });
  await openSource(page, 'int main() { return 0; }', 'cpp');
  const request = page.getByRole('button', { name: '/ request AI simulation', exact: true });
  await expect(request).toBeDisabled();
  expect(posts).toBe(0);
  const consent = page.getByRole('checkbox', { name: /For this run, send my source code/ });
  await consent.check();
  await request.click();
  await expect(page.locator('.simulation-notice')).toContainText('AI-simulated, may be inaccurate');
  await expect(consent).not.toBeChecked();
  await expect(request).toBeDisabled();
  expect(posts).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/phase-three-simulation.png', fullPage: true });
  await consent.check();
  await paste(page, 'int main() { return 1; }');
  await expect(consent).not.toBeChecked();
  await expect(request).toBeDisabled();
  await page.getByLabel('Programming language').selectOption('python');
  await expect(page.locator('.simulation-optin')).toHaveCount(0);
});
test('small profile measures a quadratic entry and measurement budget failures never fit', async ({
  page,
}) => {
  await openSource(
    page,
    'function square(n) {\n let value=0;\n for(let i=0;i<n;i++){for(let j=0;j<n;j++){value++;}}\n return value;\n}',
  );
  await analysis(page);
  await page.getByLabel('Input generator').selectOption('int');
  await page.getByLabel('Measurement sizes').selectOption('small');
  await page.getByRole('button', { name: 'Empirically measure', exact: true }).click();
  await expect(page.getByText('Estimated O(n²)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open Complexity Tab →', exact: true }).click();
  await page.getByLabel('Measurement sizes').selectOption('small');
  await page.getByRole('button', { name: 'Measure code', exact: true }).click();
  await expect(page.getByText(/Local estimate from 5 complete measured runs/)).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Real function steps versus input size' }),
  ).toBeVisible();
  await analysis(page);
  await paste(page, 'function endless(n) { while(true) {} }');
  await expect(page.getByLabel('Entry function')).toHaveValue('endless');
  await page.getByRole('button', { name: 'Empirically measure', exact: true }).click();
  await expect(page.locator('.analysis-status')).toContainText(
    'No estimate is fitted: fewer than four complete positive sizes',
  );
  await expect(page.locator('.estimate-card')).toHaveCount(0);
});
test('invalid simulated traces do not reach playback', async ({ page }) => {
  await page.route('**/api/analyze', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { configured: true, reason: null } });
      return;
    }
    const p = route.request().postDataJSON();
    await route.fulfill({
      json: {
        source: 'ai-simulated',
        identity: p.identity,
        trace: {
          origin: 'ai-simulated',
          steps: [
            {
              index: 0,
              line: 999,
              event: 'call',
              func: '<module>',
              callStack: [],
              globals: {},
              heap: {},
              stdout: '',
            },
          ],
          truncated: false,
          error: null,
          elapsed: 0,
        },
      },
    });
  });
  await openSource(page, 'int main() { return 0; }', 'cpp');
  await page.getByRole('checkbox', { name: /For this run, send my source code/ }).check();
  await page.getByRole('button', { name: '/ request AI simulation', exact: true }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText('could not be validated');
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeDisabled();
  await expect(page.locator('.simulation-notice')).toHaveCount(0);
});
test('library Analysis uses the loaded implementation id and exact source hash', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('button', { name: '/ examples', exact: true }).click();
  await page.getByRole('button', { name: /EX.03/ }).click();
  await analysis(page);
  const index = await (await request.get('/api/library')).json();
  const current = index.implementations.find(
    (i: { language: string; variant: string; algorithm_id: string }) =>
      i.language === 'python' &&
      i.variant === 'featured' &&
      i.algorithm_id.endsWith('/fibonacci-recursion'),
  );
  expect(current).toBeTruthy();
  await expect(page.locator('.analysis-pane')).toHaveAttribute(
    'data-implementation-id',
    current.id,
  );
  await expect(page.locator('.analysis-pane')).toHaveAttribute(
    'data-source-hash',
    current.source_hash,
  );
});
test('production security headers, content-addressed assets and static fallback', async ({
  page,
  request,
}) => {
  const response = await request.get('/');
  expect(response.headers()['content-security-policy']).toContain("worker-src 'self' blob:");
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  const manifest = await (await request.get('/runtime-assets.json')).json();
  for (const path of [`${manifest.pyodide}/pyodide.js`, `${manifest.monaco}/loader.js`]) {
    const asset = await request.get(path);
    expect(asset.status()).toBe(200);
    expect(asset.headers()['cache-control']).toContain('immutable');
  }
  await openSource(page);
  await analysis(page);
  await expect(
    page.getByRole('button', { name: 'Request AI suggestions', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText('AI is disabled. Static analysis and traces remain available.', { exact: true }),
  ).toBeVisible();
});
