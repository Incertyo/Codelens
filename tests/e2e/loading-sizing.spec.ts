import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import lz from 'lz-string';

test('graph and tree diagrams fit resized panes, support zoom, and keep highlights themed', async ({
  page,
}) => {
  const code =
    'graph = {"A": ["B", "C"], "B": ["D"], "C": [], "D": []}\nclass Node:\n    def __init__(self, value, left=None, right=None):\n        self.value = value\n        self.left = left\n        self.right = right\nroot = Node(4, Node(2, Node(1), Node(3)), Node(6, Node(5), Node(7)))\nprint("ready")';
  await page.goto(
    '/#code=' +
      lz.compressToEncodedURIComponent(JSON.stringify({ code, stdin: '', language: 'python' })),
  );
  await expect(page.getByTestId('site-loading')).toHaveCount(0);
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByTestId('run-loading')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jump to end' }).click();
  const graph = page.getByRole('region', { name: 'graph diagram scroll area' });
  const tree = page.getByRole('region', { name: 'binary-tree diagram scroll area' });
  await expect(graph).toBeVisible();
  await expect(tree).toBeVisible();
  const initialWidth = await tree.locator('svg').evaluate((e) => e.getBoundingClientRect().width);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => tree.locator('svg').evaluate((e) => e.getBoundingClientRect().width))
    .toBeLessThan(initialWidth);
  const scale = Number(await tree.getAttribute('data-scale'));
  await page.getByRole('button', { name: 'Zoom in binary-tree diagram', exact: true }).click();
  await expect
    .poll(async () => Number(await tree.getAttribute('data-scale')))
    .toBeGreaterThan(scale);
  await page.getByRole('button', { name: 'Fit binary-tree diagram', exact: true }).click();
  await expect(tree).toHaveAttribute('data-fit', 'true');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  const editor = page.locator('.monaco-editor textarea');
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+f');
  await page.keyboard.insertText('Node');
  const match = page.locator('.monaco-editor .findMatch').first();
  await expect(match).toBeVisible();
  expect(await match.evaluate((e) => getComputedStyle(e).borderColor)).toBe('rgb(255, 214, 10)');
  await page.keyboard.press('Escape');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/responsive-diagrams-mobile.png', fullPage: true });
});

test('large recursion trees keep active calls visible while zooming and resizing', async ({
  page,
}) => {
  const code = 'def fib(n):\n    return n if n <= 1 else fib(n - 1) + fib(n - 2)\nprint(fib(11))';
  await page.goto(
    '/#code=' +
      lz.compressToEncodedURIComponent(JSON.stringify({ code, stdin: '', language: 'python' })),
  );
  await expect(page.getByTestId('site-loading')).toHaveCount(0);
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByTestId('run-loading')).toHaveCount(0);
  const timeline = page.getByRole('slider', { name: 'Execution timeline' });
  await timeline.evaluate((element) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, '450');
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const area = page.getByRole('region', { name: 'Recursion tree scroll area' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Zoom in Recursion tree', exact: true }).click();
  await expect(area.locator('g[data-current="true"]')).toHaveCount(1);
  await expect
    .poll(async () =>
      area.locator('g[data-current="true"]').evaluate((node) => {
        const rectangle = node.getBoundingClientRect(),
          container = node.closest('.diagram-scroll')!.getBoundingClientRect();
        return (
          rectangle.right > container.left &&
          rectangle.left < container.right &&
          rectangle.bottom > container.top &&
          rectangle.top < container.bottom
        );
      }),
    )
    .toBe(true);
  expect(await area.locator('g[data-call-id]').count()).toBeLessThan(100);
  await page.getByRole('button', { name: 'Fit Recursion tree', exact: true }).click();
  await expect(area).toHaveAttribute('data-fit', 'true');
  expect((await new AxeBuilder({ page }).include('.recursion-panel').analyze()).violations).toEqual(
    [],
  );
});
