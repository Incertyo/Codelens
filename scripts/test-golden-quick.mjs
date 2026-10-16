import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { selectQuickGoldens } from './golden-quick-selection.mjs';

const selection = selectQuickGoldens(
  JSON.parse(readFileSync('src/generated/library.json')),
  JSON.parse(readFileSync('tests/fixtures/revamp/catalog.json')),
);
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = [
  'covers all 343',
  'retains exact legacy',
  'retains real SDK',
  ...selection.implementations.map(escape),
  ...selection.examples.map(escape),
].join('|');
console.log(
  `Quick golden: ${selection.implementations.length} implementations, ${selection.examples.length} JS examples, ${selection.topics.length} topics, ${selection.modelKinds.length} detector kinds, API and share contracts.`,
);
const child = spawn(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'run',
    'tests/refactor-parity.test.ts',
    'tests/refactor-contracts.test.ts',
    '-t',
    pattern,
  ],
  { stdio: 'inherit', env: { ...process.env, AI_ENABLED: 'false', CODELENS_UPDATE_GOLDENS: '0' } },
);
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
child.on('error', () => {
  process.exitCode = 1;
});
