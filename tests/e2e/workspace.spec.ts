import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { examples } from "../../src/lib/examples";
async function paste(page: Page, code: string) {
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  const editor = page.locator('.monaco-editor textarea');
  await expect(editor).toBeAttached();
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(code);
  await expect(page.locator('.filebar')).toContainText(`${code.split('\n').length} LINES`);
}
async function run(page: Page) {
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
}
test('paste → real Python → synchronized stepping, playback, breakpoints, and sharing', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'PASTE. RUN. UNDERSTAND.' })).toBeVisible();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await page.screenshot({ path: 'artifacts/landing.png', fullPage: true });
  await paste(
    page,
    'numbers = [3, 1, 2]\ni = 1\nnumbers[0], numbers[i] = numbers[i], numbers[0]\nprint(numbers)',
  );
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByTestId('step-counter')).toContainText('002');
  await expect(page.locator('.execution-line')).toHaveCount(1);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toHaveText('[1, 3, 2]\n');
  await expect(page.locator('.array-cell').first()).toHaveText('1');
  await page.getByRole('button', { name: 'Previous step' }).click();
  await expect(page.getByTestId('step-counter')).not.toContainText('001');
  await page.getByRole('button', { name: 'Jump to start' }).click();
  const line = page.locator('.monaco-editor .line-numbers').filter({ hasText: /^3$/ });
  await line.click();
  await expect(page.locator('.breakpoint-marker')).toHaveCount(1);
  await page.getByRole('button', { name: 'Play trace' }).click();
  await expect(page.getByRole('button', { name: 'Play trace' })).toBeVisible();
  await expect(page.getByTestId('step-counter')).toContainText('004');
  await page.screenshot({ path: 'artifacts/execution.png', fullPage: true });
  await page.getByRole('button', { name: '/ share', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Link copied', exact: true })).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto(url);
  await run(page);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('[1, 3, 2]');
  expect(errors).toEqual([]);
});
test('all seven index examples run in the real browser worker', async ({ page }) => {
  await page.goto('/');
  const outputs = [
    'Sorted: [1, 2, 3, 5, 8]',
    'Found at index: 4',
    'Fibonacci: 5',
    "Visit order: ['A', 'B', 'C', 'D', 'E']",
    'New head: 3',
    'Best value: 18',
    'Pair: [4, 11]',
  ];
  for (let i = 0; i < outputs.length; i++) {
    await page.getByRole('button', { name: '/ examples' }).click();
    await page.getByRole('button', { name: new RegExp(`EX.${examples[i].id}`) }).click();
    await run(page);
    await page.getByRole('button', { name: 'Jump to end' }).click();
    await expect(page.getByTestId('stdout')).toContainText(outputs[i]);
    if (i === 5) {
      await expect(page.getByRole('table', { name: 'dp matrix' })).toBeVisible();
      await page.screenshot({ path: 'artifacts/matrix.png', fullPage: true });
    }
  }
});
test('stdin, runtime errors, infinite loops, and termination are recoverable', async ({ page }) => {
  await page.goto('/');
  await paste(page, 'name = input()\nprint("Hello", name)');
  await page.getByRole('button', { name: '+ stdin' }).click();
  await page.getByLabel('STANDARD INPUT').fill('Ada\n');
  await run(page);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('Hello Ada');
  await paste(page, 'x = 1\ny = 1 / 0');
  await run(page);
  await expect(page.locator('.notice[role="alert"]')).toContainText('ZeroDivisionError');
  await page.getByRole('button', { name: 'Jump to exception' }).click();
  await expect(page.locator('.exception-line')).toHaveCount(1);
  await paste(page, 'while True:\n    pass');
  await page.getByRole('spinbutton', { name: 'Maximum trace steps' }).fill('100');
  await run(page);
  await expect(page.getByText('Trace truncated at the safety limit.')).toBeVisible();
  await expect(page.getByTestId('step-counter')).toContainText('/ 100');
  await paste(page, 'import sys\nsys.settrace(None)\nwhile True:\n    pass');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText(
    'Execution stopped after 12 seconds',
  );
  await paste(page, 'print("Recovered")');
  await run(page);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('Recovered');
});
test('themes, menu, phase boundaries, design page and mobile layout are accessible', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await expect(page.locator('.site-shell')).toHaveCSS('opacity', '1');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Reduce motion' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await page.getByRole('button', { name: 'MENU' }).click();
  await expect(page.getByRole('dialog', { name: '/ codelens.' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: '02 insights' }).click();
  await expect(page.locator('.insights-pane[data-notes-source="ai"], .insights-pane[data-notes-source="local"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What matters in your code.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hot spots' })).toBeVisible();
  await page.getByRole('tab', { name: '01 visualizer' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto('/design');
  await expect(page.getByRole('heading', { name: 'DESIGNED TO BE CLEAR.' })).toBeVisible();
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/design.png', fullPage: true });
});
test('worker network APIs are blocked after bootstrap and traces remain offline', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(
    () =>
      new Promise<{ error: string | null }>((resolve, reject) => {
        const worker = new Worker('/tracer.worker.js');
        const nonce = crypto.randomUUID();
        worker.onerror = () => {
          worker.terminate();
          reject(new Error('Worker failed'));
        };
        worker.onmessage = (e) => {
          if (e.data.nonce !== nonce) return;
          if (e.data.type === 'ready') {
            worker.postMessage({
              nonce,
              mode: 'run',
              code: 'import sys\nbridge = sys.modules["js"]\nbridge.fetch("/api/library")',
              stdin: '',
              maxSteps: 100,
            });
          }
          if (e.data.type === 'result') {
            worker.terminate();
            resolve(e.data.result);
          }
          if (e.data.type === 'error') {
            worker.terminate();
            reject(new Error(e.data.message));
          }
        };
        worker.postMessage({
          nonce,
          mode: 'bootstrap',
        });
      }),
  );
  expect(result.error).toMatch(/Network access is disabled|KeyError/);
  await page.route('https://**/*', (route) => route.abort());
  await paste(page, 'print("Offline works")');
  await run(page);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('Offline works');
});
