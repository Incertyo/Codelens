import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import lz from 'lz-string';
const palindrome =
  's = "racecar"\nleft = 0\nright = len(s) - 1\nvalid = True\nwhile left < right:\n    if s[left] != s[right]:\n        valid = False\n        break\n    left += 1\n    right -= 1\nprint(valid)';
async function run(page: Page, code: string, language = 'python') {
  await page.goto(
    '/#code=' + lz.compressToEncodedURIComponent(JSON.stringify({ code, language, stdin: '' })),
  );
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '/ run code', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.locator('.notice[role="alert"]')).toHaveCount(0);
}
async function seek(page: Page, index: number) {
  await page.getByRole('slider', { name: 'Execution timeline' }).evaluate((element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, index);
  await expect(page.getByTestId('step-counter')).toContainText(new RegExp(`\\( 0*${index + 1} /`));
}
async function auditThemes(page: Page) {
  expect((await new AxeBuilder({ page }).include('.data-panel').analyze()).violations).toEqual([]);
  const toggle = page.getByRole('button', { name: /Switch to (light|dark) theme/ });
  await toggle.click();
  expect((await new AxeBuilder({ page }).include('.data-panel').analyze()).violations).toEqual([]);
  await toggle.click();
}
test('string palindrome renders indexed cells and moves bound pointer pins reversibly', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await run(page, palindrome);
  const view = page
    .getByTestId('structure-string_buffer')
    .filter({ has: page.locator('[data-pointer="left"]') });
  await expect(view.getByTestId('character-cell')).toHaveText(['r', 'a', 'c', 'e', 'c', 'a', 'r']);
  await expect(view.locator('[data-pointer="left"]')).toHaveAttribute('data-index', '3');
  const finalTransform = await view
    .locator('[data-pointer="left"]')
    .evaluate((el) => getComputedStyle(el).transform);
  await seek(page, 4);
  await expect(view.locator('[data-pointer="left"]')).toHaveAttribute('data-index', '0');
  await expect(view.locator('[data-pointer="right"]')).toHaveAttribute('data-index', '6');
  await expect
    .poll(() =>
      view.locator('[data-pointer="left"]').evaluate((el) => getComputedStyle(el).transform),
    )
    .not.toBe(finalTransform);
  await expect(view.getByTestId('sliding-window')).toContainText('= 7');
  await page.screenshot({ path: 'artifacts/phase-2.5-string.png', fullPage: true });
  await auditThemes(page);
  expect(errors).toEqual([]);
});
test('parentheses validator renders a vertical stack with a moving TOP marker', async ({
  page,
}) => {
  await run(
    page,
    's = "([])"\nbuffer = []\npairs = {")": "(", "]": "["}\nfor ch in s:\n    if ch in "([":\n        buffer.append(ch)\n    else:\n        assert buffer.pop() == pairs[ch]\nprint(not buffer)',
  );
  const top = page.getByTestId('stack-top');
  await expect(top).toHaveAttribute('data-index', '-1');
  await auditThemes(page);
  const max = Number(
    await page.getByRole('slider', { name: 'Execution timeline' }).getAttribute('max'),
  );
  let found = false;
  for (let i = 0; i <= max; i++) {
    await seek(page, i);
    if ((await top.count()) && (await top.getAttribute('data-index')) === '1') {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
  const cells = page.locator('.algo-stack-item');
  await expect(cells).toHaveText(['(', '[']);
  const first = await cells.nth(0).boundingBox(),
    second = await cells.nth(1).boundingBox();
  expect(first!.y).toBeGreaterThan(second!.y);
  await page.screenshot({ path: 'artifacts/phase-2.5-stack.png', fullPage: true });
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(top).toHaveAttribute('data-index', '-1');
});
test('heapq top-K renders synchronized complete tree and indexed heap array', async ({ page }) => {
  await run(
    page,
    'import heapq\nbest = []\nfor value in [5, 1, 9, 2, 7]:\n    heapq.heappush(best, value)\n    if len(best) > 3:\n        heapq.heappop(best)\nprint(best)',
  );
  const view = page.getByTestId('structure-heap');
  await expect(view.getByTestId('heap-tree')).toBeVisible();
  await expect(view.getByTestId('heap-array')).toBeVisible();
  await expect(view.getByTestId('heap-tree').locator('[data-heap-index]')).toHaveCount(3);
  await expect(view.getByTestId('heap-array').locator('[data-heap-index]')).toHaveText([
    '5',
    '7',
    '9',
  ]);
  await expect(page.getByTestId('stdout')).toContainText('[5, 7, 9]');
  await page.screenshot({ path: 'artifacts/phase-2.5-heap.png', fullPage: true });
  await auditThemes(page);
});
test('single-number XOR renders changing 32-bit register states', async ({ page }) => {
  await run(
    page,
    'numbers = [2, 1, 2, 1, 4]\nresult = 0\nfor n in numbers:\n    result ^= n\nprint(result)',
  );
  const result = page
    .getByTestId('structure-bitmask')
    .filter({ has: page.getByRole('list', { name: 'result 32-bit register' }) });
  await expect(result.locator('[data-bit]')).toHaveCount(32);
  await expect(result.locator('[data-bit="2"]')).toHaveAttribute('data-value', '1');
  await expect(result.locator('[data-value="1"]')).toHaveCount(1);
  await seek(page, 3);
  await expect(result.locator('[data-value="1"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(result.locator('[data-bit="2"]')).toHaveAttribute('data-value', '1');
  await page.screenshot({ path: 'artifacts/phase-2.5-bits.png', fullPage: true });
  await auditThemes(page);
});
test('specialized JS snapshots render intervals, buckets, set, trie, DSU and range trees', async ({
  page,
}) => {
  const snippets: [string, string][] = [
    ['queue', 'const pending=[]; pending.shift(); console.log(pending);'],
    ['set', 'const seen=new Set(); console.log(seen.size);'],
    ['heap', 'const heap=[]; console.log(heap.length);'],
    ['sequence', 'const values=[]; console.log(values.length);'],
    ['string_buffer', 'const s=""; console.log(s.length);'],
    ['queue', 'const pending=[1,2,3]; pending.shift(); console.log(pending);'],
    ['queue', 'const pending=[1,2]; pending.unshift(0); console.log(pending);'],
    ['interval_set', 'const meetings=[[0,3],[2,4],[5,8]]; let i=1; console.log(meetings.length);'],
    ['hash_table', 'const buckets=[[ ["cat",3], ["dog",5] ],[]]; console.log(buckets.length);'],
    ['set', 'const seen=new Set([1,2,3]); console.log(seen.size);'],
    [
      'trie',
      'const root={c:{a:{t:{$:true}}},d:{o:{g:{is_end:true}}}}; let node=root.c.a; console.log(1);',
    ],
    ['dsu', 'const parent=[0,0,2,2], rank=[1,0,1,0]; console.log(parent[3]);'],
    ['segment_tree', 'const n=4; const tree=Array(2*n).fill(0); tree[1]=10; console.log(tree[1]);'],
    ['segment_tree', 'const tree=[0,1,3,3,10]; let i=2; i += i & -i; console.log(tree[i]);'],
  ];
  for (const [kind, code] of snippets) {
    await run(page, code, 'javascript');
    await expect(page.getByTestId(`structure-${kind}`).first()).toBeVisible();
    await auditThemes(page);
    await page.screenshot({ path: `artifacts/phase-2.5-${kind}.png`, fullPage: true });
  }
});
test('DP prerequisites and scalar fallback are accessible in both themes and mobile', async ({
  page,
}) => {
  await run(
    page,
    'dp = [[1, 1, 1], [1, 0, 0], [1, 0, 0]]\nfor i in range(1, 3):\n    for j in range(1, 3):\n        dp[i][j] = dp[i-1][j] + dp[i][j-1]\nprint(dp[2][2])',
  );
  const grid = page.getByTestId('structure-dp_matrix');
  await expect(grid.getByRole('table', { name: 'dp matrix' })).toBeVisible();
  const max = Number(
    await page.getByRole('slider', { name: 'Execution timeline' }).getAttribute('max'),
  );
  let found = false;
  for (let i = 0; i <= max; i++) {
    await seek(page, i);
    if ((await grid.count()) && (await grid.locator('[data-source]').count()) === 2) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
  await page.screenshot({ path: 'artifacts/phase-2.5-dp.png', fullPage: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const theme of ['dark', 'light']) {
    if (theme === 'light')
      await page.getByRole('button', { name: 'Switch to light theme' }).click();
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await run(page, 'x = 7\nok = True\nprint(x)');
  await expect(page.getByRole('list', { name: 'Scalar State Monitor' })).toBeVisible();
  await expect(page.locator('.data-panel')).not.toContainText('NO COLLECTIONS');
  await auditThemes(page);
  expect(errors).toEqual([]);
});
