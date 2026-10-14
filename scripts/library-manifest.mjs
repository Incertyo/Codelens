import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export async function libraryManifest() {
  async function walk(path) {
    return (
      await Promise.all(
        (await readdir(path, { withFileTypes: true }))
          .filter((d) => d.name !== '__pycache__')
          .map((d) => (d.isDirectory() ? walk(`${path}/${d.name}`) : `${path}/${d.name}`)),
      )
    ).flat();
  }
  const files = [
    ...(await walk('library')),
    'src/lib/algorithm-catalog.ts',
    'src/lib/examples.ts',
    'src/lib/javascript-examples.ts',
    'src/lib/additional-examples.ts',
    'scripts/compile-library.py',
    'scripts/seed-library.ts',
  ].sort();
  return Object.fromEntries(
    await Promise.all(
      files.map(async (f) => [
        f,
        createHash('sha256')
          .update(await readFile(f))
          .digest('hex'),
      ]),
    ),
  );
}
