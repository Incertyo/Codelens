import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { implementationSchema } from "../contract";
import type { Language } from "../../../shared/breakdown";
import snapshot from '../generated/library.json';
const staticCatalogEnabled = () =>
  process.env.VERCEL === '1' || process.env.CODELENS_STATIC_LIBRARY === '1';

function read<T>(action: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(resolve(process.env.CODELENS_LIBRARY_DB ?? 'data/codelens.sqlite'), {
    readOnly: true,
  });
  try {
    db.exec('PRAGMA busy_timeout = 5000;');
    return action(db);
  } finally {
    db.close();
  }
}
export function getLibraryIndex() {
  if (staticCatalogEnabled()) return snapshot.index;
  return read((db) => ({
    schemaVersion: (
      db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as {
        version: number;
      }
    ).version,
    topics: db.prepare('SELECT * FROM topics ORDER BY position').all(),
    subtopics: db.prepare('SELECT * FROM subtopics ORDER BY topic_id,position').all(),
    algorithms: db
      .prepare(
        `SELECT a.*, s.topic_id FROM algorithms a JOIN subtopics s ON s.id=a.subtopic_id ORDER BY s.topic_id,s.position,a.position`,
      )
      .all(),
    implementations: db
      .prepare(
        `SELECT id,algorithm_id,language,variant,revision,source_hash FROM implementations i WHERE revision=(SELECT MAX(revision) FROM implementations WHERE algorithm_id=i.algorithm_id AND language=i.language AND variant=i.variant) ORDER BY algorithm_id,language,variant`,
      )
      .all(),
  }));
}
export function getLibraryImplementation(
  algorithmId: string,
  language: Language,
  variant: 'reference' | 'featured',
  revision?: number,
) {
  if (staticCatalogEnabled()) {
    const candidates = snapshot.implementations.filter(
      (i) =>
        i?.algorithmId === algorithmId &&
        i.language === language &&
        i.variant === variant &&
        (revision === undefined || i.revision === revision),
    );
    const found = candidates.sort((a, b) => b!.revision - a!.revision)[0];
    return found ? implementationSchema.parse(found) : null;
  }
  return read((db) => {
    const row = db
      .prepare(
        `SELECT i.*, a.name, f.stdin, f.expected_stdout, f.match_mode FROM implementations i JOIN algorithms a ON a.id=i.algorithm_id JOIN fixtures f ON f.implementation_id=i.id WHERE i.algorithm_id=? AND i.language=? AND i.variant=? AND (? IS NULL OR i.revision=?) ORDER BY i.revision DESC LIMIT 1`,
      )
      .get(algorithmId, language, variant, revision ?? null, revision ?? null);
    if (!row) return null;
    return implementationSchema.parse({
      id: row.id,
      algorithmId: row.algorithm_id,
      name: row.name,
      language: row.language,
      variant: row.variant,
      revision: row.revision,
      code: row.code,
      sourceHash: row.source_hash,
      sourceFile: row.source_file,
      entryPoint: row.entry_point,
      notes: JSON.parse(String(row.notes_json)),
      fixture: { stdin: row.stdin, expectedStdout: row.expected_stdout, matchMode: row.match_mode },
    });
  });
}
