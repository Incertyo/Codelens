import { readFile } from 'node:fs/promises';
import { libraryManifest } from "./library-manifest.mjs";

const snapshot = JSON.parse(await readFile('src/generated/library.json', 'utf8'));
if (JSON.stringify(snapshot.manifest) !== JSON.stringify(await libraryManifest()))
  throw new Error(
    'Static catalog is stale. Run npm run library:export locally and include src/generated/library.json before deployment.',
  );
console.log('Verified static catalog source manifest; no Python or runtime SQLite required.');
