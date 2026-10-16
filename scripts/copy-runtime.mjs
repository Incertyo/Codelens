import './generate-worker-core.mjs';
import { cp, mkdir, stat, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const hashFiles = async (directory) => {
  const hash = createHash('sha256');
  async function walk(path) {
    for (const d of (await readdir(path, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      hash.update(d.name);
      if (d.isDirectory()) await walk(`${path}/${d.name}`);
      else hash.update(await readFile(`${path}/${d.name}`));
    }
  }
  await walk(directory);
  return hash.digest('hex').slice(0, 16);
};
const pyodide = `/pyodide/${await hashFiles('node_modules/pyodide')}`,
  monaco = `/monaco/${await hashFiles('node_modules/monaco-editor/min/vs')}/vs`;
await mkdir(`public${pyodide}`, { recursive: true });
for (const name of [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
]) {
  await cp(`node_modules/pyodide/${name}`, `public${pyodide}/${name}`);
}
await cp('node_modules/monaco-editor/min/vs', `public${monaco}`, { recursive: true });
const assets = [];
for (const name of ['pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip']) {
  assets.push({ name, bytes: (await stat(`public${pyodide}/${name}`)).size });
}
await writeFile(`public${pyodide}/manifest.json`, JSON.stringify(assets));
await mkdir('src/generated', { recursive: true });
await writeFile(
  'public/runtime-assets.json',
  JSON.stringify({ pyodide, monaco }),
);
await writeFile(
  'src/generated/runtime-assets.json',
  JSON.stringify({ pyodide, monaco }),
);
