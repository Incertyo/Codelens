import { chromium } from '@playwright/test';
import lz from 'lz-string';
import { mkdir, writeFile } from 'node:fs/promises';

const fixtures = [
  ['string_buffer', 'let s="racecar",left=0,right=6;'],
  ['sequence', 'let values=Array.from({length:80},(_,i)=>i),left=0,right=79;'],
  ['stack', 'let stack=Array.from({length:60},(_,i)=>i);'],
  ['queue', 'let queue=Array.from({length:80},(_,i)=>i);'],
  ['deque', 'let deque=Array.from({length:80},(_,i)=>i); deque.unshift(0);'],
  ['interval_set', 'let intervals=Array.from({length:40},(_,i)=>[i,i+3]);'],
  [
    'hash_table',
    'let buckets=Array.from({length:8},(_,i)=>Array.from({length:8},(_,j)=>[j,i+j]));',
  ],
  ['set_pool', 'let seen=new Set(Array.from({length:80},(_,i)=>i));'],
  ['binary_heap', 'let heap=Array.from({length:80},(_,i)=>i);'],
  ['trie', 'let root={},node=root; for(let k=0;k<60;k++){ node.a={is_end:k===59}; node=node.a; }'],
  ['dsu', 'let parent=Array.from({length:80},(_,i)=>Math.floor(i/10)*10),rank=Array(80).fill(0);'],
  ['segment_tree', 'let n=16,tree=Array(4*n).fill(0);'],
  ['segment_tree', 'let tree=Array(80).fill(0); let i=1; i += i & -i;'],
  ['bitmask', 'let mask=123456789; mask ^= 7;'],
  [
    'dp_matrix',
    'let dp=Array.from({length:8},()=>Array(10).fill(1)); let i=1,j=1; for(i=1;i<8;i++){for(j=1;j<10;j++){dp[i][j]=dp[i-1][j]+dp[i][j-1];}} i=3;j=3;',
  ],
  ['scalar', 'let counter=0,total=7,valid=true;'],
];
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [kind, setup] of fixtures) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const code = setup + '\nlet tick=0;\nwhile(true){ tick++; }';
    await page.goto(
      'http://127.0.0.1:3001/#code=' +
        lz.compressToEncodedURIComponent(
          JSON.stringify({ code, language: 'javascript', stdin: '' }),
        ),
    );
    await page.locator('.monaco-editor').waitFor();
    await page.getByRole('button', { name: '/ run code', exact: true }).click();
    await page.getByRole('button', { name: 'Jump to end' }).waitFor();
    await page.waitForFunction(
      () => !document.querySelector('button.run-button')?.textContent.includes('/ stop'),
    );
    await page.getByRole('button', { name: 'Jump to end' }).click();
    await page.locator(`[data-view="${kind}"]`).first().waitFor();
    const max = await page.getByRole('slider', { name: 'Execution timeline' }).getAttribute('max');
    if (max !== '4999') throw new Error(`${kind}: expected 5,000 steps, got ${max}`);
    const sample = await page.evaluate(
      (expectedKind) =>
        new Promise((resolve) => {
          const timeline = document.querySelector('input[aria-label="Execution timeline"]');
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          const commits = [],
            frames = [],
            events = [];
          let prior = 0,
            tick = 0,
            last = 0;
          const run = (timestamp) => {
            if (prior && tick > 10) frames.push(timestamp - prior);
            prior = timestamp;
            last = 1500 + ((tick * 73) % 3500);
            const start = performance.now();
            setter.call(timeline, String(last));
            timeline.dispatchEvent(new Event('input', { bubbles: true }));
            const committed =
              Number(
                document.querySelector('[data-testid="step-counter"]').textContent.match(/\d+/)[0],
              ) ===
                last + 1 && !!document.querySelector(`[data-view="${expectedKind}"]`);
            if (tick > 10) {
              events.push(performance.now() - start);
              commits.push(committed);
            }
            tick++;
            if (tick < 191) requestAnimationFrame(run);
            else
              requestAnimationFrame(() =>
                resolve({
                  frames,
                  events,
                  commits,
                  last,
                  counter: document.querySelector('[data-testid="step-counter"]').textContent,
                }),
              );
          };
          requestAnimationFrame(run);
        }),
      kind,
    );
    const sorted = [...sample.frames].sort((a, b) => a - b),
      mean = sample.frames.reduce((a, b) => a + b, 0) / sample.frames.length;
    const row = {
      kind,
      steps: 5000,
      frames: sample.frames.length,
      meanFrameMs: mean,
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      maxFrameMs: sorted.at(-1),
      averageFps: 1000 / mean,
      maxDispatchMs: Math.max(...sample.events),
      deferredCommits: sample.commits.filter((value) => !value).length,
      counter: sample.counter,
      expectedCounter: sample.last + 1,
      pageErrors: errors,
    };
    if (!sample.counter.includes(String(sample.last + 1)))
      throw new Error(`${kind}: timeline did not render the requested step`);
    if (errors.length) throw new Error(`${kind}: ${errors.join(', ')}`);
    if (row.deferredCommits)
      throw new Error(
        `${kind}: ${row.deferredCommits} steps did not commit inside the timed native event`,
      );
    if (row.maxDispatchMs > 16.7)
      throw new Error(`${kind}: committed update exceeded the 16.7 ms work budget`);
    results.push(row);
    console.log(
      `${kind}: ${row.averageFps.toFixed(2)} fps / p95 ${row.p95FrameMs.toFixed(2)} ms / event max ${row.maxDispatchMs.toFixed(2)} ms`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(
    'artifacts/visualizer-performance.json',
    JSON.stringify(
      {
        environment:
          'Chromium headless, 1440×1000, production build, full motion, real JS workers and 5,000-step traces; 11-frame warmup then 180 native timeline changes. Timed event includes a verified DOM counter and renderer commit; refresh intervals include browser timestamp quantization.',
        results,
      },
      null,
      2,
    ),
  );
}
