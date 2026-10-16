import { DatabaseSync } from 'node:sqlite';
import { mkdir, writeFile } from 'node:fs/promises';
import { getLibraryIndex, getLibraryImplementation } from "../src/features/library/public/server/repository";
import { libraryManifest } from "./library-manifest.mjs";
const db = new DatabaseSync(process.env.CODELENS_LIBRARY_DB || 'data/codelens.sqlite', {
  readOnly: true,
});
const revisions = db
  .prepare('SELECT algorithm_id,language,variant,revision FROM implementations ORDER BY id')
  .all();
db.close();
const implementations = revisions.map((r) =>
  getLibraryImplementation(
    String(r.algorithm_id),
    r.language as 'python' | 'javascript',
    r.variant as 'featured' | 'reference',
    Number(r.revision),
  ),
);
await mkdir('src/generated', { recursive: true });
await writeFile(
  'src/generated/library.json',
  JSON.stringify({ index: getLibraryIndex(), implementations, manifest: await libraryManifest() }),
);
console.log(`Exported ${implementations.length} catalog revisions with source manifest.`);
