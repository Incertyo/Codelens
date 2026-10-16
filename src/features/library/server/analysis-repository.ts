import { limits } from '@/shared/limits';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { Enrichment } from "../../../shared/breakdown";
import { presetAnalyses, type PresetAnalysis } from "../preset-analyses";
import { getEnrichedAlgorithm } from "../authored-notes";
import { examples } from "../../../lib/examples";

let presetHashMap: Map<string, PresetAnalysis> | null = null;

export function findPresetBySourceHash(sourceHash: string, language: string = 'python'): PresetAnalysis | null {
  if (language !== 'python') return null;
  if (!presetHashMap) {
    presetHashMap = new Map();
    for (const example of examples) {
      const preset = presetAnalyses[example.id];
      if (!preset) continue;
      try {
        const hash = createHash('sha256').update(example.code).digest('hex');
        presetHashMap.set(`${hash}:python`, preset);
      } catch {}
    }
  }
  return presetHashMap.get(`${sourceHash}:python`) ?? null;
}

export type StoredAnalysis = {
  timeComplexity?: string;
  spaceComplexity?: string;
  suggestions?: Enrichment['suggestions'];
  visualMapping?: Enrichment['visualMapping'];
  bigOFit?: {
    id: string;
    label: string;
    scale?: number;
    intercept?: number;
    anchor?: number;
    error?: number;
    alternatives?: string;
    maxN?: number;
    validPoints?: number;
    inconclusive?: boolean;
  } | null;
  enrichment?: Enrichment;
};

export type AnalysisRecord = {
  id: string;
  implementationId?: string;
  sourceHash: string;
  language: string;
  data: StoredAnalysis;
  createdAt: number;
};

function getDbLocation(): string {
  return resolve(process.env.CODELENS_LIBRARY_DB ?? 'data/codelens.sqlite');
}

export function ensureAnalysisTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      implementation_id TEXT,
      source_hash TEXT NOT NULL,
      language TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS analysis_results_lookup ON analysis_results(source_hash, language);
    CREATE INDEX IF NOT EXISTS analysis_results_impl ON analysis_results(implementation_id);
  `);
}

function withDb<T>(readOnly: boolean, action: (db: DatabaseSync) => T): T | null {
  try {
    const db = new DatabaseSync(getDbLocation(), { readOnly });
    try {
      db.exec(`PRAGMA busy_timeout = ${limits.sqliteBusyMs};`);
      if (!readOnly) {
        ensureAnalysisTable(db);
      }
      return action(db);
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export function getStoredAnalysis({
  implementationId,
  sourceHash,
  language = 'python',
}: {
  implementationId?: string;
  sourceHash?: string;
  language?: string;
}): AnalysisRecord | null {
  // 1. Try querying SQLite database
  const fromDb = withDb(true, (db) => {
    try {
      if (sourceHash && language) {
        const stmt = db.prepare(
          'SELECT * FROM analysis_results WHERE source_hash = ? AND language = ? ORDER BY created_at DESC LIMIT 1',
        );
        const row = stmt.get(sourceHash, language) as
          | {
              id: string;
              implementation_id: string | null;
              source_hash: string;
              language: string;
              data_json: string;
              created_at: number;
            }
          | undefined;
        if (row) {
          return {
            id: row.id,
            implementationId: row.implementation_id ?? undefined,
            sourceHash: row.source_hash,
            language: row.language,
            data: JSON.parse(String(row.data_json)) as StoredAnalysis,
            createdAt: Number(row.created_at),
          };
        }
      }

      if (implementationId && !sourceHash && !implementationId.startsWith('draft:')) {
        const stmt = db.prepare(
          'SELECT * FROM analysis_results WHERE implementation_id = ? AND language = ? ORDER BY created_at DESC LIMIT 1',
        );
        const row = stmt.get(implementationId, language) as
          | {
              id: string;
              implementation_id: string | null;
              source_hash: string;
              language: string;
              data_json: string;
              created_at: number;
            }
          | undefined;
        if (row) {
          return {
            id: row.id,
            implementationId: row.implementation_id ?? undefined,
            sourceHash: row.source_hash,
            language: row.language,
            data: JSON.parse(String(row.data_json)) as StoredAnalysis,
            createdAt: Number(row.created_at),
          };
        }
      }
    } catch {
      // Table may not exist yet in read-only mode
    }
    return null;
  });

  if (fromDb) return fromDb;

  // 2. Check preset algorithm definitions if not found in DB
  if (sourceHash) {
    const presetByHash = findPresetBySourceHash(sourceHash, language);
    if (presetByHash) {
      const syntheticEnrichment: Enrichment = {
        summary: presetByHash.summary,
        pattern: presetByHash.pattern,
        functions: [],
        annotations: [],
        stepNotes: [],
        timeComplexity: presetByHash.timeComplexity,
        spaceComplexity: presetByHash.spaceComplexity,
        suggestions: presetByHash.suggestions,
        visualMapping: presetByHash.visualMapping,
      };
      return {
        id: `preset:${presetByHash.algorithmId}:${language}`,
        implementationId: implementationId ?? `${presetByHash.algorithmId}:${language}:featured:v1`,
        sourceHash,
        language,
        data: {
          timeComplexity: presetByHash.timeComplexity,
          spaceComplexity: presetByHash.spaceComplexity,
          suggestions: presetByHash.suggestions,
          visualMapping: presetByHash.visualMapping,
          enrichment: syntheticEnrichment,
        },
        createdAt: 0,
      };
    }
  }

  if (implementationId && !sourceHash) {
    const parts = implementationId.split(':');
    const algoId = parts[0];
    const enriched = getEnrichedAlgorithm(algoId);
    if (enriched) {
      const syntheticEnrichment: Enrichment = {
        summary: enriched.summary,
        pattern: enriched.pattern,
        functions: [],
        annotations: [],
        stepNotes: [],
        timeComplexity: enriched.timeComplexity,
        spaceComplexity: enriched.spaceComplexity,
        suggestions: enriched.suggestions,
        visualMapping: enriched.visualMapping,
      };
      return {
        id: `preset:${algoId}:${language}`,
        implementationId,
        sourceHash: sourceHash ?? '',
        language,
        data: {
          timeComplexity: enriched.timeComplexity,
          spaceComplexity: enriched.spaceComplexity,
          suggestions: enriched.suggestions,
          visualMapping: enriched.visualMapping,
          enrichment: syntheticEnrichment,
        },
        createdAt: 0,
      };
    }
  }

  return null;
}

export function saveStoredAnalysis({
  implementationId,
  sourceHash,
  language = 'python',
  data,
}: {
  implementationId?: string;
  sourceHash: string;
  language?: string;
  data: StoredAnalysis;
}): boolean {
  if (!sourceHash) return false;
  const success = withDb(false, (db) => {
    const id = `${sourceHash}:${language}`;
    let mergedData = data;
    try {
      const selectStmt = db.prepare('SELECT data_json FROM analysis_results WHERE id = ?');
      const existing = selectStmt.get(id) as { data_json: string } | undefined;
      if (existing) {
        const parsed = JSON.parse(String(existing.data_json));
        mergedData = { ...parsed, ...data };
      }
    } catch {}

    const implId =
      implementationId && !implementationId.startsWith('draft:') ? implementationId : null;
    const stmt = db.prepare(`
      INSERT INTO analysis_results (id, implementation_id, source_hash, language, data_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        implementation_id = coalesce(excluded.implementation_id, analysis_results.implementation_id),
        data_json = excluded.data_json,
        created_at = excluded.created_at
    `);
    stmt.run(id, implId, sourceHash, language, JSON.stringify(mergedData), Date.now());
    return true;
  });
  return Boolean(success);
}
