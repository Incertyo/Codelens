import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getStoredAnalysis,
  saveStoredAnalysis,
  ensureAnalysisTable,
} from '../src/lib/analysis-repository';
import { GET, POST } from '../src/app/api/analyze/route';
import { findPresetAnalysis } from '../src/lib/preset-analyses';
import type { GrowthFit } from '../src/lib/complexity';

describe('SQLite analysis persistence and Big-O caching', () => {
  let tempDir: string;
  let dbPath: string;
  const originalDb = process.env.CODELENS_LIBRARY_DB;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codelens-analysis-test-'));
    dbPath = join(tempDir, 'test.sqlite');
    process.env.CODELENS_LIBRARY_DB = dbPath;
    const db = new DatabaseSync(dbPath);
    ensureAnalysisTable(db);
    db.close();
  });

  afterEach(() => {
    if (originalDb !== undefined) process.env.CODELENS_LIBRARY_DB = originalDb;
    else delete process.env.CODELENS_LIBRARY_DB;
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('retrieves pre-seeded preset analysis when not yet in database', () => {
    const preset = findPresetAnalysis('01');
    expect(preset).not.toBeNull();
    expect(preset!.timeComplexity).toBe('O(n²)');
    expect(preset!.visualMapping.primaryStructure).toBe('numbers');

    const result = getStoredAnalysis({ implementationId: '01:python:featured:v1' });
    expect(result).not.toBeNull();
    expect(result?.data.timeComplexity).toBe('O(n²)');
    expect(result?.data.spaceComplexity).toBe('O(1)');
    expect(result?.data.visualMapping?.primaryStructure).toBe('numbers');
    expect(result?.data.suggestions?.length).toBeGreaterThan(0);
  });

  it('saves and retrieves custom analysis for newly pasted code hash', () => {
    const sourceHash = 'abc123def456';
    const language = 'python';
    const saved = saveStoredAnalysis({
      implementationId: 'draft:python',
      sourceHash,
      language,
      data: {
        timeComplexity: 'O(n log n)',
        spaceComplexity: 'O(n)',
        suggestions: [{ type: 'optimization', message: 'Use TimSort' }],
        visualMapping: { primaryStructure: 'arr' },
      },
    });
    expect(saved).toBe(true);

    const loaded = getStoredAnalysis({ sourceHash, language });
    expect(loaded).not.toBeNull();
    expect(loaded?.data.timeComplexity).toBe('O(n log n)');
    expect(loaded?.data.spaceComplexity).toBe('O(n)');
    expect(loaded?.data.visualMapping?.primaryStructure).toBe('arr');
    expect(loaded?.data.suggestions?.[0].message).toBe('Use TimSort');
  });

  it('persists and updates empirical Big-O fit in SQLite', () => {
    const sourceHash = 'hash-with-fit';
    const language = 'javascript';
    saveStoredAnalysis({
      sourceHash,
      language,
      data: {
        timeComplexity: 'O(n²)',
        bigOFit: {
          id: 'quadratic',
          label: 'O(n²)',
          error: 0.05,
          maxN: 64,
        },
      },
    });

    const loaded = getStoredAnalysis({ sourceHash, language });
    expect(loaded?.data.bigOFit?.id).toBe('quadratic');
    expect(loaded?.data.bigOFit?.error).toBe(0.05);
  });

  it('serves cached analysis through GET /api/analyze with search query', async () => {
    const sourceHash = 'api-cached-hash';
    saveStoredAnalysis({
      sourceHash,
      language: 'python',
      data: {
        timeComplexity: 'O(1)',
        spaceComplexity: 'O(1)',
      },
    });

    const req = new Request(`http://localhost/api/analyze?sourceHash=${sourceHash}&language=python`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(true);
    expect(body.analysis.timeComplexity).toBe('O(1)');
  });

  it('persists empirical fit via POST /api/analyze with mode save_complexity', async () => {
    const sourceHash = 'post-fit-hash';
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'save_complexity',
        sourceHash,
        language: 'python',
        implementationId: 'sorting/bubble-sort:python:reference:v1',
        bigOFit: {
          id: 'quadratic',
          label: 'O(n²)',
          error: 0.02,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.saved).toBe(true);

    const loaded = getStoredAnalysis({ sourceHash, language: 'python' });
    expect(loaded?.data.bigOFit?.id).toBe('quadratic');
  });

  it('incorporates visualMapping into sourceHints for custom visual mapping', async () => {
    const { sourceHints } = await import('../src/lib/visualizer/detectors');
    const hints = sourceHints('data = [1, 2, 3]', 'python', {
      primaryStructure: 'data',
      keyOperations: [{ line: 1, type: 'heap_push', description: 'push element' }],
    });
    expect(hints.primaryStructure).toBe('data');
    expect(hints.heaps.has('data')).toBe(true);
  });

  it('retrieves preset analysis by sourceHash even without implementationId', async () => {
    const { examples } = await import('../src/lib/examples');
    const { createHash } = await import('node:crypto');
    const bubbleHash = createHash('sha256').update(examples[0].code).digest('hex');

    const result = getStoredAnalysis({ sourceHash: bubbleHash, language: 'python' });
    expect(result).not.toBeNull();
    expect(result?.data.timeComplexity).toBe('O(n²)');
    expect(result?.data.visualMapping?.primaryStructure).toBe('numbers');
    expect(result?.data.visualMapping?.keyOperations?.length).toBeGreaterThan(0);
  });

  it('persists and restores full bigOFit mathematical parameters and predicts without error', async () => {
    const { predictGrowth } = await import('../src/lib/complexity');
    const sourceHash = 'full-math-fit-hash';
    const req = new Request('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'save_complexity',
        sourceHash,
        language: 'python',
        bigOFit: {
          id: 'quadratic',
          label: 'O(n²)',
          scale: 85,
          intercept: 5,
          anchor: 64,
          error: 0.015,
          alternatives: 'None',
          maxN: 64,
          validPoints: 10,
          inconclusive: false,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const loaded = getStoredAnalysis({ sourceHash, language: 'python' });
    expect(loaded?.data.bigOFit?.scale).toBe(85);
    expect(loaded?.data.bigOFit?.anchor).toBe(64);

    // predictGrowth must run smoothly on this loaded fit
    const pred = predictGrowth(loaded!.data.bigOFit as unknown as GrowthFit, 32);
    expect(Number.isFinite(pred)).toBe(true);
    expect(pred).toBeGreaterThan(0);
  });
});
