import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { cpus, platform, release, totalmem } from 'node:os';

const options = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const match =
      /^--(unit-report|build-report|output)=(artifacts\/refactor\/[a-zA-Z0-9_-]+\.json)$/.exec(arg);
    if (!match) throw new Error('Reports must be named JSON files under artifacts/refactor.');
    return [match[1], match[2]];
  }),
);
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const directories = {};
for (const file of files) {
  const bytes = await readFile(file);
  const text = bytes.toString('utf8');
  const loc = text.split('\n').length - Number(text.endsWith('\n'));
  const parts = file.split('/');
  const groups = ['.', parts.length === 1 ? '(root)' : parts[0]];
  if (parts.length > 2) groups.push(parts.slice(0, 2).join('/'));
  for (const key of groups) {
    const row = (directories[key] ??= { files: 0, loc: 0, bytes: 0 });
    row.files++;
    row.loc += loc;
    row.bytes += bytes.length;
  }
}
async function directoryBytes(path) {
  const info = await stat(path);
  if (!info.isDirectory()) return info.size;
  const sizes = await Promise.all(
    (await readdir(path)).map((name) => directoryBytes(join(path, name))),
  );
  return sizes.reduce((a, b) => a + b, 0);
}
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const dependencies = [];
for (const kind of ['dependencies', 'devDependencies']) {
  for (const name of Object.keys(pkg[kind]).sort()) {
    const root = join('node_modules', name);
    const installed = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    dependencies.push({
      name,
      kind,
      version: installed.version,
      bytes: await directoryBytes(root),
    });
  }
}
const routes = [];
for (const [route, path] of [
  ['/', 'index'],
  ['/design', 'design'],
  ['/_not-found', '_not-found'],
]) {
  const html = await readFile(`.next/server/app/${path}.html`, 'utf8');
  const scripts = [
    ...new Set(
      [...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)]
        .filter((m) => !/nomodule/i.test(m[0]))
        .map((m) => m[1]),
    ),
  ];
  let raw = 0,
    gzip = 0;
  for (const url of scripts) {
    const content = await readFile(join('.next', url.replace(/^\/_next\//, '')));
    raw += content.length;
    gzip += gzipSync(content, { level: 9 }).length;
  }
  routes.push({ route, scripts, raw, gzip });
}
const unit = JSON.parse(
  await readFile(options['unit-report'] ?? 'artifacts/refactor/baseline-unit.json', 'utf8'),
);
const build = JSON.parse(
  await readFile(options['build-report'] ?? 'artifacts/refactor/baseline-build.json', 'utf8'),
);
const result = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  environment: {
    node: process.version,
    platform: platform(),
    release: release(),
    cpu: cpus()[0].model,
    logicalCpus: cpus().length,
    memoryBytes: totalmem(),
  },
  directories,
  dependencies,
  routes,
  build,
  units: {
    total: unit.numTotalTests,
    passed: unit.numPassedTests,
    failed: unit.numFailedTests,
    durationMs: Math.max(...unit.testResults.map((t) => t.endTime)) - unit.startTime,
    files: unit.testResults.length,
  },
};
await writeFile(
  options.output ?? 'artifacts/refactor/metrics.json',
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    trackedFiles: files.length,
    loc: directories['.'].loc,
    dependencies: dependencies.length,
    routes,
    build,
    units: result.units,
  }),
);
