import { test, expect, type Page } from '@playwright/test';

async function paste(page: Page, code: string) {
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  const editor = page.locator('.monaco-editor textarea');
  await expect(editor).toBeAttached();
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(code);
  await expect(page.locator('.filebar')).toContainText(`${code.split('\n').length} LINES`);
}

test('dense real graph respects DOM budgets and mounts heap contents on expansion only', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  const graph = Object.fromEntries(
    Array.from({ length: 80 }, (_, i) => [String(i), Array.from({ length: 80 }, (_, j) => j)]),
  );
  await paste(page, `graph = ${JSON.stringify(graph)}\nprint("ready")\n`);
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  const view = page.getByTestId('structure-graph');
  await expect(view).toBeVisible();
  expect(await view.locator('svg line, svg path[marker-end]').count()).toBeLessThanOrEqual(300);
  expect(await view.locator('*').count()).toBeLessThan(1600);
  await expect(view).toContainText('Showing 300 of 6400 edges');
  await expect(page.locator('.heap-detail')).toHaveCount(0);
  await page.locator('.heap-object summary').first().click();
  await expect(page.locator('.heap-detail')).toHaveCount(1);
  await page.locator('.heap-object summary').first().click();
  await expect(page.locator('.heap-detail')).toHaveCount(0);
});

test('closed heap disclosures contain no mounted inspector rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await paste(page, 'values = [1, 2, 3]\nprint(values)\n');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.locator('.heap-object')).not.toHaveCount(0);
  await expect(page.locator('.heap-detail')).toHaveCount(0, { timeout: 2000 });
});

for (const race of ['rerun', 'source A to B to A', 'step cap', 'stdin']) {
  test(`execution-bound notes reject a delayed response after ${race}`, async ({ page }) => {
    let release: (() => void) | undefined;
    let payload: { code: string; runEpoch?: number; steps: { index: number }[] } | undefined;
    await page.addInitScript(() => {
      const nativeFetch = window.fetch;
      window.fetch = (input, init) =>
        nativeFetch(
          input,
          String(input).endsWith('/api/analyze') && init?.method === 'POST'
            ? { ...init, signal: undefined }
            : init,
        );
    });
    await page.route('**/api/analyze', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { configured: true } });
        return;
      }
      payload = route.request().postDataJSON();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({
        json: {
          source: 'ai',
          enrichment: {
            summary: 'Delayed execution notes',
            pattern: 'STALE EXECUTION',
            functions: [],
            annotations: [],
            stepNotes: payload!.steps
              .slice(0, 1)
              .map(({ index }) => ({ index, text: 'STALE EXECUTION' })),
          },
        },
      });
    });
    await page.goto('/');
    await expect(page.getByTestId('site-loading')).not.toBeVisible();
    const code = 'value = 1\nprint(value)\n';
    await paste(page, code);
    await page.getByRole('button', { name: '/ run code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
    await page.getByRole('tab', { name: '02 breakdown' }).click();
    await expect(page.getByText('FROM THE AST', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '/ enrich with AI' }).click();
    await expect.poll(() => !!release).toBe(true);
    if (race === 'rerun') {
      await page.getByRole('button', { name: '/ run code', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
    } else if (race === 'source A to B to A') {
      await paste(page, 'other = 2\nprint(other)\n');
      await paste(page, code);
    } else if (race === 'step cap') {
      await page.getByLabel('Maximum trace steps').fill('100');
    } else {
      await page.getByRole('button', { name: /stdin/i }).click();
      await page.getByLabel('Standard input').fill('changed');
    }
    release!();
    await page.waitForTimeout(700);
    await expect(page.getByText('STALE EXECUTION', { exact: false })).toHaveCount(0, {
      timeout: 2000,
    });
    await page.getByRole('tab', { name: '01 visualizer' }).click();
    await expect(page.locator('.step-explanation')).not.toContainText('STALE EXECUTION');
    expect(payload?.runEpoch).toEqual(expect.any(Number));
  });
}

test('Analysis coalesces rapid edits before starting real inspection workers', async ({ page }) => {
  await page.addInitScript(() => {
    const nativePost = Worker.prototype.postMessage;
    const inspections: number[] = [];
    Object.defineProperty(window, 'inspectionStarts', { value: inspections });
    Worker.prototype.postMessage = function (message, ...rest) {
      if (message?.mode === 'inspect') inspections.push(performance.now());
      return Reflect.apply(nativePost, this, [message, ...rest]);
    };
  });
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await paste(page, 'def total(n):\n    return n + 1\n');
  await page.getByRole('tab', { name: '03 analysis' }).click();
  await expect(page.getByRole('heading', { name: 'Static complexity · AST' })).toBeVisible();
  const initial = await page.evaluate(
    () => (window as unknown as { inspectionStarts: number[] }).inspectionStarts.length,
  );
  for (const offset of [2, 3, 4]) {
    await paste(page, `def total(n):\n    return n + ${offset}\n`);
    await page.waitForTimeout(100);
  }
  await expect(page.getByRole('heading', { name: 'Static complexity · AST' })).toBeVisible();
  const final = await page.evaluate(
    () => (window as unknown as { inspectionStarts: number[] }).inspectionStarts.length,
  );
  expect(final - initial).toBe(1);
});

test('forged result cannot replace a real trace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await paste(
    page,
    'print("ACTUAL")\n',
  );
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
  await page.getByRole('button', { name: 'Jump to end' }).click();
  await expect(page.getByTestId('stdout')).toHaveText('ACTUAL\n');
});

for (const forgedStarted of [true, false]) {
  test(`absolute deadline bounds a native body with ${forgedStarted ? 'forged' : 'only trusted'} started`, async ({
    page,
  }) => {
    if (!forgedStarted)
      await page.addInitScript(() => {
        const NativeWorker = Worker;
        window.Worker = class extends NativeWorker {
          set onmessage(handler: ((event: MessageEvent) => void) | null) {
            super.onmessage = handler
              ? (event) => {
                  if (event.data?.type === 'started')
                    setTimeout(() => handler.call(this, event), 2500);
                  else handler.call(this, event);
                }
              : null;
          }
        };
      });
    await page.goto('/');
    await expect(page.getByTestId('site-loading')).not.toBeVisible();
    await paste(page, 'import sys\nsys.settrace(None)\nwhile True:\n    pass\n');
    const started = Date.now();
    await page.getByRole('button', { name: '/ run code', exact: true }).click();
    await expect(
      page.getByText('Execution stopped after 12 seconds.', { exact: false }),
    ).toBeVisible({ timeout: 18000 });
    expect(Date.now() - started).toBeLessThan(18000);
    await expect(page.getByRole('button', { name: 'Jump to end' })).toBeDisabled();
  });
}

for (const forgedNonce of ['missing', 'wrong']) {
  test(`rejects ${forgedNonce} nonces on messages derived from real worker results`, async ({
    page,
  }) => {
    await page.addInitScript((kind) => {
      const NativeWorker = Worker;
      window.Worker = class extends NativeWorker {
        set onmessage(handler: ((event: MessageEvent) => void) | null) {
          super.onmessage = handler
            ? (event) => {
                if (event.data?.type === 'result') {
                  const data = structuredClone(event.data);
                  if (kind === 'missing') delete data.nonce;
                  else data.nonce = 'wrong-run';
                  for (const step of data.result.steps) step.stdout = 'FORGED';
                  handler.call(this, new MessageEvent('message', { data }));
                }
                handler.call(this, event);
              }
            : null;
        }
      };
    }, forgedNonce);
    await page.goto('/');
    await expect(page.getByTestId('site-loading')).not.toBeVisible();
    await paste(page, 'print("ACTUAL")\n');
    await page.getByRole('button', { name: '/ run code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
    await page.getByRole('button', { name: 'Jump to end' }).click();
    await expect(page.getByTestId('stdout')).toHaveText('ACTUAL\n');
  });
}

test('a replayed authenticated started message cannot reset the deadline', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = Worker;
    window.Worker = class extends NativeWorker {
      set onmessage(handler: ((event: MessageEvent) => void) | null) {
        super.onmessage = handler
          ? (event) => {
              handler.call(this, event);
              if (event.data?.type === 'started')
                setTimeout(() => handler.call(this, event), 10500);
            }
          : null;
      }
    };
  });
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await paste(
    page,
    'import sys\nsys.settrace(None)\nwhile True:\n    pass\n',
  );
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByText('Execution stopped after 12 seconds.', { exact: false })).toBeVisible(
    { timeout: 18000 },
  );
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeDisabled();
});

test('TypeScript detection explains unsupported syntax without switching the runtime', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('site-loading')).not.toBeVisible();
  await paste(page, 'const values: number[] = [1,2,3];\nconsole.log(values);');
  await expect(
    page.getByText('Only Python can run in this editor.', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '/ run code', exact: true })).toBeDisabled();
});

for (const operation of ['getItem', 'setItem'] as const) {
  test(`storage ${operation} SecurityError leaves editor, execution and playback usable`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((method) => {
      Storage.prototype[method] = () => {
        throw new DOMException('Storage blocked', 'SecurityError');
      };
    }, operation);
    await page.goto('/');
    await expect(page.getByTestId('site-loading')).not.toBeVisible();
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Reduce motion', exact: true }).click();
    expect(errors).toEqual([]);
    await paste(page, 'values = [3, 1, 2]\nvalues.sort()\nprint(values)\n');
    await page.getByRole('button', { name: '/ run code', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled();
    await page.getByRole('button', { name: 'Jump to end' }).click();
    await expect(page.getByTestId('stdout')).toContainText('[1, 2, 3]');
    await page.getByRole('button', { name: 'Jump to start' }).click();
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect(page.getByTestId('step-counter')).toContainText('002');
    expect(errors).toEqual([]);
  });
}
