import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { encodeShare } from "../../src/features/share/public/codec";

for (const language of ['python'] as const) {
  test(`Big-O comparison uses real ${language} measurements in both themes and on mobile`, async ({
    page,
  }) => {
    const errors: string[] = [];
    const uploads: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.method() === 'POST') uploads.push(request.url());
    });
    const source = 'def total(n: int):\n    value = 0\n    for i in range(n):\n        value += i\n    return value';
    await page.goto('/' + encodeShare(source, '', language));
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await expect(page.getByTestId('site-loading')).not.toBeVisible();
    await page.getByRole('tab', { name: '03 complexity' }).click();
    await expect(page.getByLabel('Entry function')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Big-O growth ladder' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Room to work', exact: true })).toBeVisible();
    await expect(page.getByText('EXTRA MEMORY', { exact: true })).toBeVisible();
    await page.getByLabel('Input generator').selectOption('int');
    await page.getByRole('button', { name: 'Measure code', exact: true }).click();
    await expect(page.getByText('Estimated O(n)', { exact: true })).toBeVisible();
    const chart = page.getByRole('img', { name: 'Real function steps versus input size' });
    await expect(chart.locator('[data-reference]')).toHaveCount(7);
    await expect(chart.locator('[data-best-fit="linear"]')).toHaveCount(1);
    await expect(chart.locator('circle.measured-point')).toHaveCount(10);
    await page.getByText('View measurement numbers', { exact: true }).click();
    const counters = page.getByRole('table', {
      name: 'Snapshot-free measurement counters',
      exact: true,
    });
    await expect(counters.locator('tbody tr')).toHaveCount(10);
    await expect(counters.getByRole('columnheader', { name: 'Total peak units' })).toBeVisible();
    await expect(
      counters.getByRole('columnheader', { name: 'Auxiliary peak units' }),
    ).toBeVisible();
    for (const row of await counters.locator('tbody tr').all()) {
      const values = await row.locator('td').allTextContents();
      expect(values[0]).toBe('complete');
      expect(Number(values[4])).toBe(Number(values[2]) - Number(values[3]));
    }
    await page.getByText('How we count', { exact: true }).click();
    await expect(page.getByText(/This is an object-count model, not bytes/)).toBeVisible();
    const measuredRows = page
      .getByRole('table', { name: 'Real captured steps by input size', exact: true })
      .locator('tbody tr');
    const equivalent = page.getByRole('table', {
      name: 'Chart data: measured steps and scaled curves',
    });
    for (const row of await measuredRows.all()) {
      const cells = await row.locator('td').allTextContents();
      const dataRow = equivalent
        .locator('tbody tr')
        .filter({ has: page.getByRole('rowheader', { name: cells[0], exact: true }) });
      await expect(dataRow.locator('td').first()).toHaveText(cells[1]);
    }
    expect(
      await chart
        .locator('[data-reference]')
        .evaluateAll(
          (lines) => new Set(lines.map((line) => line.getAttribute('stroke-dasharray'))).size,
        ),
    ).toBe(7);
    await page.getByText('Compare larger inputs', { exact: true }).click();
    await expect(
      page.getByRole('table', { name: 'Big-O scale comparison' }).locator('tbody tr'),
    ).toHaveCount(9);
    await expect(page.getByRole('table', { name: 'Big-O scale comparison' })).toContainText(
      '1,000,000',
    );
    await expect(
      page
        .getByRole('table', { name: 'Chart data: measured steps and scaled curves' })
        .locator('..'),
    ).toHaveClass(/sr-only/);
    await expect(page.getByText(/Both suggest O\(n\)/)).toBeVisible();
    const toggle = page.getByLabel('Logarithmic y-axis');
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toBeChecked();
    await expect(chart).toHaveAttribute('data-y-scale', 'log');
    expect(
      await chart
        .locator('polyline')
        .evaluateAll((lines) =>
          lines.every((line) => !/NaN|Infinity/.test(line.getAttribute('points') || '')),
        ),
    ).toBe(true);
    for (const theme of ['light', 'dark']) {
      if (theme === 'light')
        await page.getByRole('button', { name: 'Switch to light theme' }).click();
      else await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      await expect(chart).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(toggle).toBeChecked();
    await expect(page.getByRole('table', { name: 'Big-O scale comparison' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `artifacts/v2-step1-${language}-mobile.png`, fullPage: true });
    expect(uploads).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('static and measured disagreement stays neutral after a real bounded-loop run', async ({
  page,
}) => {
  const source =
    'def bounded(n):\n    value = 0\n    for i in range(n):\n        if i > 1:\n            break\n        value += i\n    return value\n';
  await page.goto('/' + encodeShare(source, '', 'python'));
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('tab', { name: '03 complexity' }).click();
  await expect(page.getByLabel('Entry function')).toBeVisible();
  await page.getByLabel('Input generator').selectOption('int');
  await page.getByRole('button', { name: 'Measure code', exact: true }).click();
  await expect(page.getByText('Estimated O(1)', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'Static analysis suggests O(n); measured data fits O(1) best at the tested sizes.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByText('Compare larger inputs', { exact: true }).click();
  await expect(
    page.getByRole('table', { name: 'Big-O scale comparison' }).locator('tbody tr'),
  ).toHaveCount(6);
  await expect(
    page
      .getByRole('img', { name: 'Real function steps versus input size' })
      .locator('[data-best-fit="constant"]'),
  ).toHaveCount(1);
});

test('manual measurement cancellation is keyboard accessible and leaves no fitted result', async ({
  page,
}) => {
  await page.goto(
    '/' +
      encodeShare(
        'def endless(n):\n    while True:\n        pass\n    return n\n',
        '',
        'python',
      ),
  );
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('tab', { name: '03 complexity' }).click();
  await expect(page.getByLabel('Entry function')).toBeVisible();
  await page.getByLabel('Input generator').selectOption('int');
  await page.getByRole('button', { name: 'Measure code', exact: true }).click();
  const cancel = page.getByRole('button', { name: 'Cancel measurement', exact: true });
  await cancel.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.analysis-status')).toContainText('Measurement cancelled.');
  await expect(page.getByRole('button', { name: 'Measure code', exact: true })).toBeEnabled();
  await expect(page.locator('.estimate-card')).toHaveCount(0);
});
