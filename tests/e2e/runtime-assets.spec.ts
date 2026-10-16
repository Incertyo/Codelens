import { test, expect } from '@playwright/test';
import { encodeShare } from "../../src/features/share/public/codec";

for (const asset of ['tracer.py', 'outline.py', 'analysis.py', 'measurement.py']) {
  test(`Python worker reports a missing ${asset} without executing HTML`, async ({ page }) => {
    await page.route(`**/${asset}`, (route) =>
      route.fulfill({
        status: 404,
        contentType: 'text/html',
        body: '<!DOCTYPE html><title>404 — missing</title>',
      }),
    );
    await page.goto('/');
    const result = await page.evaluate(
      () =>
        new Promise<{ type: string; message: string; nonce: string }>((resolve, reject) => {
          const worker = new Worker('/tracer.worker.js');
          const nonce = crypto.randomUUID();
          worker.onerror = (event) => {
            worker.terminate();
            reject(new Error(event.message));
          };
          worker.onmessage = ({ data }) => {
            if (data.type !== 'error' && data.type !== 'ready') return;
            worker.terminate();
            resolve(data);
          };
          worker.postMessage({ mode: 'bootstrap', nonce });
        }),
    );
    expect(result.type).toBe('error');
    expect(result.message).toContain(`Could not load Python runtime asset /${asset}.`);
    expect(result.message).toContain('Rebuild and restart the local preview');
    expect(result.message).not.toMatch(/<!DOCTYPE|Traceback|SyntaxError|missing<\/title>/);
    expect(result.nonce).toMatch(/^[a-f0-9-]{36}$/);
  });
}

test('Python Run rejects a successful HTML fallback and recovers with the real harness', async ({
  page,
}) => {
  await page.route('**/measurement.py', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: '\ufeff \n<!DOCTYPE html><title>Fallback — page</title>',
    }),
  );
  await page.goto('/' + encodeShare('print("runtime recovered")', '', 'python'));
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(
    page.getByText(
      'Could not load Python runtime asset /measurement.py. Rebuild and restart the local preview, then reload the page.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '/ run code', exact: true })).toBeEnabled();
  await page.unroute('**/measurement.py');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toContainText('runtime recovered');
});
