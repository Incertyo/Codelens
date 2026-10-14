import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { examples } from '../../src/lib/examples';
async function javascript(page: Page) {
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByLabel('Programming language').selectOption('javascript');
}
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
  await page.getByRole('button', { name: 'Jump to end' }).click();
}
test('all seven JavaScript examples run and expose graphs, queues, linked nodes, and recursion', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await javascript(page);
  const outputs = [
    'Sorted: [1,2,3,5,8]',
    'Found at index: 4',
    'Fibonacci: 5',
    'Visit order: ["A","B","C","D","E"]',
    'New head: 3',
    'Best value: 18',
    'Pair: [4,11]',
  ];
  for (let i = 0; i < outputs.length; i++) {
    await page.getByRole('button', { name: '/ examples' }).click();
    await page.getByRole('button', { name: new RegExp(`EX.${examples[i].id}`) }).click();
    await run(page);
    await expect(page.getByTestId('stdout')).toContainText(outputs[i]);
    if (i === 2) {
      await expect(page.getByRole('img', { name: 'Recursion call tree' })).toBeVisible();
      await page.screenshot({ path: 'artifacts/phase-two-recursion.png', fullPage: true });
    }
    if (i === 3) {
      await expect(page.getByTestId('structure-graph')).toBeVisible();
      await expect(page.getByTestId('structure-queue')).toBeVisible();
      await expect(page.getByTestId('structure-set')).toBeVisible();
      await page.screenshot({ path: 'artifacts/phase-two-graph.png', fullPage: true });
    }
    if (i === 4) {
      await expect(page.getByTestId('structure-linked-list')).toBeVisible();
      await page.screenshot({ path: 'artifacts/phase-two-linked-list.png', fullPage: true });
    }
    if (i === 5) await expect(page.getByRole('table', { name: 'dp matrix' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('JavaScript and Python breakdowns work offline and synchronize both directions', async ({
  page,
}) => {
  await page.goto('/');
  await javascript(page);
  await page.getByRole('button', { name: '/ examples' }).click();
  await page.getByRole('button', { name: /EX.03/ }).click();
  await run(page);
  await page.getByRole('tab', { name: '02 breakdown' }).click();
  await expect(page.getByRole('heading', { name: 'Recursive Fibonacci' })).toBeVisible();
  await expect(page.locator('.function-heading h3')).toContainText('fibonacci(n)');
  await expect(page.getByRole('button', { name: '/ enrich with AI' })).toBeDisabled();
  await page.locator('.line-notes summary').click();
  await page.locator('.annotation-row').filter({ hasText: 'return fibonacci(n - 1)' }).click();
  await expect(page.locator('.breakdown-line')).toHaveCount(1);
  await expect(page.locator('.annotation-selected code')).toContainText('return fibonacci');
  await page.locator('.monaco-editor .view-line').nth(1).click();
  await expect(page.locator('.annotation-selected code')).toContainText('if (n <= 1)');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/phase-two-breakdown.png', fullPage: true });
  await page.getByLabel('Programming language').selectOption('python');
  await page.getByRole('tab', { name: '02 breakdown' }).click();
  await expect(page.getByRole('heading', { name: 'Recursive Fibonacci' })).toBeVisible();
  await expect(page.locator('.function-heading h3')).toContainText('fibonacci(n)');
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/phase-two-mobile.png', fullPage: true });
});
test('JavaScript stdin, exception highlighting, safety limits, and network blocking', async ({
  page,
}) => {
  await page.goto('/');
  await javascript(page);
  await paste(page, 'const name = input();\nconsole.log("Hello", name);');
  await page.getByRole('button', { name: '+ stdin' }).click();
  await page.getByLabel('STANDARD INPUT').fill('Ada\n');
  await run(page);
  await expect(page.getByTestId('stdout')).toContainText('Hello Ada');
  await paste(page, 'const x = null;\nconsole.log(x.value);');
  await run(page);
  await expect(page.locator('.notice[role="alert"]')).toContainText('TypeError');
  await expect(page.locator('.exception-line')).toHaveCount(1);
  await paste(page, 'while (true) {}');
  await page.getByRole('spinbutton', { name: 'Maximum trace steps' }).fill('100');
  await run(page);
  await expect(page.getByTestId('step-counter')).toContainText('/ 100');
  await expect(page.getByText('Trace truncated at the safety limit.')).toBeVisible();
  await paste(page, 'fetch("https://example.com");');
  await run(page);
  await expect(page.locator('.notice[role="alert"]')).toContainText('Network access');
  await paste(page, 'new Function("while(true){}")();');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText(
    'Execution stopped after 12 seconds',
  );
  await paste(page, 'console.log("Recovered");');
  await run(page);
  await expect(page.getByTestId('stdout')).toContainText('Recovered');
  await paste(page, 'const input = [3, 4];\nconsole.log(input[0]);');
  await run(page);
  await expect(page.getByTestId('stdout')).toContainText('3');
  await paste(page, 'const a = input();\nconst b = input();');
  await run(page);
  await expect(page.locator('.notice[role="alert"]')).toContainText('No more stdin values');
});
test('maps, stacks, heaps, and binary trees render from JavaScript snapshots', async ({ page }) => {
  await page.goto('/');
  await javascript(page);
  await paste(
    page,
    'const lookup = new Map([["a", 1]]);\nconst stack = [1, 2, 3];\nconst minHeap = [1, 3, 2];\nconst root = {value: 4, left: {value: 2, left: null, right: null}, right: {value: 6, left: null, right: null}};\nconsole.log(root.value);',
  );
  await run(page);
  for (const type of ['map', 'stack', 'heap', 'binary-tree'])
    await expect(page.getByTestId(`structure-${type}`)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/phase-two-structures.png', fullPage: true });
});
test('the recursion scene retains every call and follows the current frame beyond 200 calls', async ({
  page,
}) => {
  await page.goto('/');
  await javascript(page);
  await paste(
    page,
    'function fib(n){ return n <= 1 ? n : fib(n - 1) + fib(n - 2); }\nconsole.log(fib(11));',
  );
  await run(page);
  await expect(page.getByTestId('stdout')).toContainText('89');
  await expect(page.getByText('288 / 288 CALLS')).toBeVisible();
  const tree = page.getByRole('img', { name: 'Recursion call tree' });
  expect(await tree.locator('g[data-call-id]').count()).toBeLessThan(100);
  await page.getByRole('slider', { name: 'Execution timeline' }).evaluate((element) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(element, '450');
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.getByTestId('step-counter')).toContainText('451');
  await expect(tree.locator('g[data-current="true"]')).toHaveCount(1);
  const area = page.getByRole('region', { name: 'Recursion tree scroll area' });
  await expect.poll(() => area.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await area.focus();
  const before = await area.evaluate((el) => el.scrollLeft);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => area.evaluate((el) => el.scrollLeft)).toBeLessThan(before);
  await expect(page.getByTestId('step-counter')).toContainText('451');
});
test('AI notes preserve the AST and enrich playback; invalid responses fall back', async ({
  page,
}) => {
  let payload: Record<string, unknown> = {};
  let malformed = false;
  await page.route('**/api/analyze', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { configured: true } });
      return;
    }
    payload = route.request().postDataJSON();
    await route.fulfill({
      json: {
        source: 'ai',
        enrichment: malformed
          ? { summary: 1 }
          : {
              summary: 'A fixture explanation of the program. Its function returns a value.',
              pattern: 'Fixture algorithm',
              functions: [],
              annotations: [],
              stepNotes: [{ index: 0, text: 'Fixture: begin the program.' }],
            },
      },
    });
  });
  await page.goto('/');
  await javascript(page);
  await run(page);
  await page.getByRole('tab', { name: '02 breakdown' }).click();
  await expect(page.getByText('FROM THE AST', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '/ enrich with AI' }).click();
  await expect(page.getByRole('heading', { name: 'Fixture algorithm' })).toBeVisible();
  await expect(page.getByText('FROM THE AST', { exact: true })).toBeVisible();
  expect(payload).not.toHaveProperty('stdin');
  expect(payload).not.toHaveProperty('stdout');
  await page.getByRole('tab', { name: '01 visualizer' }).click();
  await page.getByRole('button', { name: 'Jump to start' }).click();
  await expect(page.locator('.step-explanation')).toContainText('AI note · Fixture');
  await page.getByRole('tab', { name: '02 breakdown' }).click();
  await page.getByRole('button', { name: '/ use static notes' }).click();
  malformed = true;
  await page.getByRole('button', { name: '/ enrich with AI' }).click();
  await expect(page.getByRole('heading', { name: 'Bubble-sort pattern' })).toBeVisible();
  await expect(page.getByText('AST + AI NOTES')).not.toBeVisible();
});
