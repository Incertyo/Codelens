import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { libraryManifest } from './library-manifest.mjs';
if (process.env.VERCEL === '1' || process.env.CODELENS_STATIC_LIBRARY === '1') {
  const snapshot = JSON.parse(await readFile('src/generated/library.json', 'utf8'));
  if (JSON.stringify(snapshot.manifest) !== JSON.stringify(await libraryManifest()))
    throw new Error(
      'Static catalog is stale. Run npm run library:export locally and include src/generated/library.json before deployment.',
    );
  console.log('Verified static catalog source manifest; no Python or runtime SQLite required.');
} else {
  for (const script of ['scripts/seed-library.ts', 'scripts/export-library.ts']) {
    const child = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', script], {
      stdio: 'inherit',
    });
    if (child.status !== 0) process.exit(child.status || 1);
  }
}
