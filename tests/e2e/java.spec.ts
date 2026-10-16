import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { encodeShare } from '../../src/lib/share';
import { javaExample } from '../../src/lib/java/example';

async function open(page: Page, source = javaExample, stdin = '') {
  await page.goto('/' + encodeShare(source, stdin, 'java'));
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await expect(page.locator('.monaco-editor textarea')).toBeAttached();
  await expect(page.getByRole('note')).toContainText('Java subset → JavaScript');
}
async function run(page: Page) {
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
}
test('Java runs in the real worker without AI, preserves playback, and never uploads source or stdin', async ({
  page,
}) => {
  const posts: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request.url());
  });
  await open(page);
  await run(page);
  await expect(page.getByTestId('stdout')).toHaveText('20\n');
  await expect(page.locator('.visualizer .notice')).toContainText('Java subset → JavaScript');
  await expect(page.locator('.simulation-notice')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jump to start' }).click();
  await expect(page.getByTestId('stdout')).not.toContainText('20');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.getByRole('tab', { name: '02 breakdown' }).click();
  await expect(page.locator('.breakdown-view')).toContainText('sum');
  await page.getByRole('tab', { name: '03 analysis' }).click();
  await expect(page.getByLabel('Entry function')).toHaveValue('sum');
  await expect(page.locator('.hotspot-list')).toBeVisible();
  expect(posts).toEqual([]);
});
test('Java complexity uses real typed measurement entries and counters', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request.url());
  });
  await open(page);
  await page.getByRole('tab', { name: '04 complexity' }).click();
  await expect(page.getByRole('button', { name: 'Measure code', exact: true })).toBeEnabled();
  await expect(page.locator('.spotlight-val').first()).toHaveText('Unknown');
  await page.getByRole('button', { name: 'Measure code', exact: true }).click();
  await expect(page.getByText(/Local estimate from 10 complete measured runs/)).toBeVisible();
  await page.getByText('View measurement numbers', { exact: true }).click();
  const table = page.getByRole('table', { name: 'Snapshot-free measurement counters' });
  await expect(table.getByRole('row')).toHaveCount(11);
  await expect(table).toContainText('complete');
  await page.getByRole('checkbox', { name: 'Logarithmic y-axis' }).check();
  await expect(page.locator('.step-chart').first()).toHaveAttribute('data-y-scale', 'log');
  expect(posts).toEqual([]);
});
test('Java errors use original lines and unsupported Java never falls back to simulation', async ({
  page,
}) => {
  await open(
    page,
    `public class Main {
public static void main(String[] args) {
int[] values = {1};
System.out.println(values[2]);
}
}`,
  );
  await run(page);
  await expect(page.locator('.notice[role="alert"]')).toContainText(
    'ArrayIndexOutOfBoundsException',
  );
  await expect(page.locator('.data-panel').first()).toContainText('L.04');
  await open(
    page,
    'public class Main { public static void main(String[] args) { double value = 1.5; } }',
  );
  await run(page);
  await expect(page.locator('.notice[role="alert"]')).toContainText('Java subset');
  await expect(page.locator('.simulation-optin')).toHaveCount(0);
});
test('Java stdin and bounded loops run in the browser worker', async ({ page }) => {
  await open(
    page,
    'import java.util.Scanner; public class Main { public static void main(String[] args) { Scanner scanner=new Scanner(System.in); int n=scanner.nextInt(); System.out.print("n=");System.out.println(n); } }',
    '42\n',
  );
  await run(page);
  await expect(page.getByTestId('stdout')).toHaveText('n=42\n');
  await open(
    page,
    'public class Main { public static void main(String[] args) { while(true){} } }',
  );
  await run(page);
  await expect(
    page.getByText('Trace truncated at the safety limit. You can inspect the captured steps.'),
  ).toBeVisible();
});
test('Java subset notice and real playback remain usable on mobile and in both themes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await run(page);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('note')).toBeVisible();
  await expect(page.getByTestId('stdout')).toHaveText('20\n');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.getByRole('note')).toBeVisible();
});
