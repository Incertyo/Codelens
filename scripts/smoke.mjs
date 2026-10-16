import { chromium, expect } from '@playwright/test';

const args = process.argv.slice(2);
const withAI = args.includes('--with-ai');
let browser;
let active = 'arguments';
function assert(condition) {
  if (!condition) throw new Error();
}
function pass(name, state = '') {
  console.log(`PASS ${name}${state ? ` (${state})` : ''}`);
}

try {
  assert(args.length === (withAI ? 2 : 1) && args[0] && !args[0].startsWith('--'));
  const target = new URL(args[0]);
  assert(
    !target.username &&
      !target.password &&
      !target.search &&
      !target.hash &&
      target.pathname === '/' &&
      (target.protocol === 'https:' ||
        (target.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))),
  );
  const origin = target.origin;
  async function get(path) {
    return fetch(new URL(path, origin), {
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    });
  }
  for (const path of ['/', '/design']) {
    active = `${path} HTTP and Next assets`;
    const response = await get(path);
    assert(response.status === 200 && response.headers.get('content-type')?.includes('text/html'));
    const html = await response.text();
    const assets = [
      ...new Set(
        [
          ...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g),
        ].map((match) => match[1]),
      ),
    ];
    assert(assets.length > 0);
    for (const asset of assets) assert((await get(asset)).status === 200);
    pass(active);
  }
  active = 'runtime asset manifest';
  const response = await get('/runtime-assets.json');
  assert(response.status === 200);
  const manifest = await response.json();
  for (const [name, prefix, file] of [
    ['pyodide', '/pyodide/', '/pyodide.js'],
    ['monaco', '/monaco/', '/loader.js'],
    ['languageDetection', '/language-detection/', '/model.json'],
  ]) {
    const path = manifest[name];
    assert(
      typeof path === 'string' &&
        path.startsWith(prefix) &&
        new RegExp(`^${prefix}[a-f0-9]{16}${name === 'monaco' ? '/vs' : ''}$`).test(path),
    );
    const asset = await get(`${path}${file}`);
    assert(asset.status === 200 && asset.headers.get('cache-control')?.includes('immutable'));
  }
  pass(active);
  active = 'trusted execution harness assets';
  for (const [path, marker] of [
    ['/tracer.worker.js', 'measure_code'],
    ['/tracer.py', 'run_trace'],
    ['/outline.py', 'outline_code'],
    ['/analysis.py', 'inspect_code'],
    ['/measurement.py', 'measure_code'],
  ]) {
    const asset = await get(path);
    assert(asset.status === 200 && (await asset.text()).includes(marker));
  }
  pass(active);
  active = 'static library catalog metadata';
  const libraryResponse = await get('/api/library');
  assert(libraryResponse.status === 200);
  const catalog = await libraryResponse.json();
  assert(
    Number.isInteger(catalog.schemaVersion) &&
      catalog.schemaVersion > 0 &&
      Array.isArray(catalog.topics) &&
      catalog.topics.length > 0 &&
      Array.isArray(catalog.algorithms) &&
      catalog.algorithms.length === 309 &&
      Array.isArray(catalog.implementations) &&
      catalog.implementations.length === 343 &&
      catalog.implementations.every(
        (item) => typeof item.id === 'string' && /^[a-f0-9]{64}$/.test(item.source_hash),
      ),
  );
  pass(active);
  active = 'AI readiness';
  const readinessResponse = await get('/api/analyze');
  assert(readinessResponse.status === 200);
  const readiness = await readinessResponse.json();
  assert(
    withAI
      ? readiness.configured === true && readiness.code === null && readiness.reason === null
      : readiness.configured === false && readiness.code === 'ai_disabled',
  );
  pass(active, withAI ? 'ready' : 'disabled');
  active = 'headless workspace hydration and Monaco';
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let pageFailed = false;
  let automaticPost = false;
  page.on('pageerror', () => {
    pageFailed = true;
  });
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/analyze')
      automaticPost = true;
  });
  assert(
    (await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 30000 }))?.status() === 200,
  );
  await page.getByTestId('site-loading').waitFor({ state: 'hidden', timeout: 16000 });
  await page
    .locator('.monaco-editor textarea')
    .first()
    .waitFor({ state: 'attached', timeout: 30000 });
  assert(await page.getByLabel('Programming language').isVisible());
  assert(!pageFailed && !automaticPost);
  pass(active);
  active = 'browser JavaScript and Python options without provider calls';
  assert(JSON.stringify(await page.getByLabel('Programming language').locator('option').evaluateAll(options => options.map(option => option.value))) === JSON.stringify(['auto', 'python', 'javascript']));
  await page.getByLabel('Programming language').selectOption('javascript');
  await page.getByRole('button', { name: '/ run code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Jump to end' })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Jump to end' }).click();
  assert((await page.getByTestId('stdout').textContent())?.includes('Sorted: [1,2,3,5,8]'));
  assert(!pageFailed && !automaticPost);
  pass(active);
  active = 'headless design page';
  assert(
    (await page.goto(`${origin}/design`, { waitUntil: 'load', timeout: 30000 }))?.status() === 200,
  );
  assert(!pageFailed && !automaticPost);
  pass(active);
  await browser.close();
  browser = undefined;
  if (withAI) {
    active = 'single AI notes probe';
    const probe = await fetch(new URL('/api/analyze', origin), {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'function addOne(n) {\n  return n + 1;\n}\n',
        language: 'javascript',
        functions: [{ name: 'addOne', line: 1, endLine: 3, parameters: ['n'] }],
        steps: [],
      }),
    });
    const body = await probe.json();
    if (probe.status === 429 && body.code === 'provider_quota' && body.source === 'static') {
      pass(active, 'provider quota reached; local analysis remains available');
    } else {
      assert(
        probe.status === 200 &&
          body.source === 'ai' &&
          typeof body.enrichment?.summary === 'string' &&
          Array.isArray(body.enrichment.functions),
      );
      pass(active, 'AI response validated');
    }
  }
  pass('smoke suite');
} catch {
  console.log(`FAIL ${active}`);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
}
