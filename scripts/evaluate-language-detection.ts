import { createRequire } from 'node:module';
import type { ModelResult } from '@vscode/vscode-languagedetection';
import { stat } from 'node:fs/promises';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { detectionCorpus } from '../tests/fixtures/language-detection-corpus';
import { heuristicDetection, modelDetection, type Detection } from '../src/lib/language-detection';

const { ModelOperations } = createRequire(import.meta.url)(
  '@vscode/vscode-languagedetection',
) as typeof import('@vscode/vscode-languagedetection');
const model = new ModelOperations({
  modelJsonLoaderFunc: async () =>
    JSON.parse(
      await readFile('node_modules/@vscode/vscode-languagedetection/model/model.json', 'utf8'),
    ),
  weightsLoaderFunc: async () =>
    new Uint8Array(
      await readFile('node_modules/@vscode/vscode-languagedetection/model/group1-shard1of1.bin'),
    ).buffer,
  minContentSize: 32,
  maxContentSize: 30000,
});
const originalFetch = globalThis.fetch;
globalThis.fetch = () => {
  throw new Error('Detection evaluation permits local files only.');
};
const predicted = (result: Detection) =>
  result.kind === 'supported'
    ? result.language
    : result.kind === 'unsupported'
      ? result.languageId
      : 'ambiguous';
try {
  const rows: {
    id: string;
    label: string;
    heuristic: string;
    model: string;
    top: ModelResult[];
  }[] = [];
  for (const row of detectionCorpus) {
    const raw = await model.runModel(row.code);
    rows.push({
      id: row.id,
      label: row.label,
      heuristic: predicted(heuristicDetection(row.code)),
      model: predicted(modelDetection(raw)),
      top: raw.slice(0, 2),
    });
  }
  const summaries = ['python', 'javascript', 'ts', 'cpp', 'java'].map((label) => {
    const selected = rows.filter((row) => row.label === label);
    const heuristic =
      (selected.filter((row) => row.heuristic === label).length / selected.length) * 100;
    const ml = (selected.filter((row) => row.model === label).length / selected.length) * 100;
    const unsupported = !['python', 'javascript'].includes(label);
    const supportsCorrectly = (value: string) =>
      value !== 'ambiguous' && ['python', 'javascript'].includes(value) !== unsupported;
    return {
      label,
      cases: selected.length,
      heuristic,
      model: ml,
      delta: heuristic - ml,
      heuristicSupport:
        (selected.filter((row) => supportsCorrectly(row.heuristic)).length / selected.length) * 100,
      modelSupport:
        (selected.filter((row) => supportsCorrectly(row.model)).length / selected.length) * 100,
    };
  });
  const eligible = summaries.every(
    (row) =>
      Math.abs(row.heuristic - row.model) <= 1 &&
      Math.abs(row.heuristicSupport - row.modelSupport) <= 1,
  );
  const assets = JSON.parse(await readFile('public/runtime-assets.json', 'utf8'));
  const assetBytes = (
    await Promise.all(
      ['model.json', 'group1-shard1of1.bin'].map(
        async (file) => (await stat(`public${assets.languageDetection}/${file}`)).size,
      ),
    )
  ).reduce((sum, bytes) => sum + bytes, 0);
  const installed = JSON.parse(
    await readFile('node_modules/@vscode/vscode-languagedetection/package.json', 'utf8'),
  );
  const report = {
    version: installed.version,
    runtime:
      'Installed real ModelOperations CPU runtime in Node, file loaders; same model and thresholds as browser worker. No hosted calls.',
    criterion:
      'Within one point means an absolute difference of at most one percentage point in every class, for exact identification and supported/unsupported routing; ambiguous is incorrect. No heuristic tuning after evaluation.',
    eligibleToProposeRemoval: eligible,
    summaries,
    rows,
    assetBytes,
  };
  await mkdir('artifacts/refactor/phase1', { recursive: true });
  await writeFile('artifacts/refactor/phase1/detection-eval.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ summaries, eligibleToProposeRemoval: eligible }));
} finally {
  model.dispose();
  globalThis.fetch = originalFetch;
}
