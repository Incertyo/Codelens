import { limits } from "../src/shared/limits";
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { readFileSync, copyFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { algorithms } from "../src/lib/algorithm-catalog";
import { getLibraryImplementation, getLibraryIndex } from "../src/features/library/public/server/repository";
import { GET } from "../src/app/api/library/route";
import { instrumentJavaScript } from "../src/features/runner/public/javascript/instrument";
import { JavaScriptTrace } from "../src/features/runner/public/javascript/runtime";
import { traceSchema } from "../src/shared/trace";
const index = getLibraryIndex();
const records = index.implementations.map((row) =>
  getLibraryImplementation(
    String(row.algorithm_id),
    row.language as 'python' | 'javascript',
    row.variant as 'reference' | 'featured',
  )!,
);
let py: PyodideInterface;
beforeAll(async () => {
  py = await loadPyodide();
  py.globals.set('_codelens_limits_json', JSON.stringify(limits));
  py.runPython('import json as _limits_json; _codelens_limits = _limits_json.loads(_codelens_limits_json)');
  py.globals.delete('_codelens_limits_json');
  py.runPython(readFileSync('public/tracer.py', 'utf8'));
});
describe('maintained SQLite library', () => {
  it('passes independent oracle and structural edge checks', () => {
    const check = spawnSync(
      process.env.PYTHON ?? 'python',
      ['scripts/check-library-algorithms.py'],
      { encoding: 'utf8' },
    );
    expect(check.stderr).toBe('');
    expect(check.status).toBe(0);
    expect(check.stdout).toContain('5429 deterministic oracle and edge checks passed');
  });
  it('seeding is idempotent, adds new revisions, and retains previous code', () => {
    const directory = mkdtempSync(join(tmpdir(), 'codelens-library-'));
    const location = join(directory, 'library.sqlite');
    copyFileSync('data/codelens.sqlite', location);
    const seed = () =>
      spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/seed-library.ts'], {
        encoding: 'utf8',
        env: { ...process.env, CODELENS_LIBRARY_DB: location },
      });
    try {
      const first = seed();
      expect(first.status, first.stderr).toBe(0);
      expect(first.stdout).toContain('0 new revisions');
      const db = new DatabaseSync(location);
      const algorithm = algorithms.find((a) => a.name === 'Dijkstra’s algorithm')!;
      const old = db
        .prepare(
          "SELECT * FROM implementations WHERE algorithm_id=? AND variant='reference' ORDER BY revision DESC LIMIT 1",
        )
        .get(algorithm.id)!;
      db.prepare('UPDATE implementations SET revision_hash=? WHERE id=?').run(
        'historical fixture fingerprint',
        old.id,
      );
      db.close();
      const second = seed();
      expect(second.status, second.stderr).toBe(0);
      expect(second.stdout).toContain('1 new revisions');
      const reopened = new DatabaseSync(location, { readOnly: true });
      const rows = reopened
        .prepare(
          "SELECT revision,code FROM implementations WHERE algorithm_id=? AND variant='reference' ORDER BY revision DESC",
        )
        .all(algorithm.id);
      expect(rows[0].revision).toBe(Number(old.revision) + 1);
      expect(rows[0].code).toBe(old.code);
      expect(rows.some((row) => row.revision === old.revision && row.code === old.code)).toBe(true);
      reopened.close();
    } finally {
      unlinkSync(location);
      rmdirSync(directory);
    }
  });
  it('a missing database returns a recoverable error', async () => {
    const previous = process.env.CODELENS_LIBRARY_DB;
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.CODELENS_LIBRARY_DB = 'artifacts/does-not-exist/library.sqlite';
    try {
      const response = GET(new Request('http://localhost/api/library'));
      expect(response.status).toBe(503);
      expect((await response.json()).error).toContain('Please retry');
    } finally {
      if (previous === undefined) delete process.env.CODELENS_LIBRARY_DB;
      else process.env.CODELENS_LIBRARY_DB = previous;
      logger.mockRestore();
    }
  });
  it('covers the entire catalog and keeps highlighted examples as variants', () => {
    expect(index.algorithms).toHaveLength(309);
    expect(index.topics).toHaveLength(16);
    expect(index.subtopics).toHaveLength(44);
    expect(records).toHaveLength(343);
    for (const algorithm of algorithms) {
      const source = getLibraryImplementation(algorithm.id, 'python', 'reference')!;
      expect(source).not.toBeNull();
      expect(source.sourceHash).toBe(createHash('sha256').update(source.code).digest('hex'));
      expect(source.fixture.matchMode).toBe('exact');
      expect(getLibraryImplementation(algorithm.id, 'javascript', 'featured') !== null).toBe(
        Boolean(algorithm.exampleId),
      );
    }
  });
  it('serves code and version identities; rejects invalid or absent selections', async () => {
    const algorithm = algorithms.find((a) => a.name === 'Dijkstra’s algorithm')!;
    const query = new URLSearchParams({ id: algorithm.id });
    const response = GET(new Request(`http://localhost/api/library?${query}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.code).toContain('def dijkstra');
    expect(body.revision).toBeGreaterThan(0);
    expect(GET(new Request('http://localhost/api/library?id=missing')).status).toBe(404);
    expect(
      GET(new Request(`http://localhost/api/library?${query}&language=javascript`)).status,
    ).toBe(404);
    expect(GET(new Request(`http://localhost/api/library?${query}&revision=0`)).status).toBe(400);
    expect(GET(new Request('http://localhost/api/library?id=%27%20OR%201=1')).status).toBe(404);
    expect(GET(new Request(`http://localhost/api/library?${query}&revision=99999`)).status).toBe(
      404,
    );
  });
  it.each(records)('executes $id through the real traced runtime', (source) => {
    let trace;
    if (source.language === 'python') {
      py.globals.set(
        '_request_json',
        JSON.stringify({ code: source.code, stdin: source.fixture.stdin, maxSteps: 5000 }),
      );
      trace = traceSchema.parse(JSON.parse(py.runPython('run_trace(_request_json)')));
    } else {
      const engine = new JavaScriptTrace(5000);
      const instrumented = instrumentJavaScript(source.code);
      try {
        new Function(instrumented.hookName, 'console', `"use strict";${instrumented.code}`)(
          engine,
          { log: engine.output },
        );
        trace = traceSchema.parse(engine.result());
      } catch (error) {
        trace = traceSchema.parse(engine.result(error));
      }
    }
    expect(trace.error).toBeNull();
    expect(trace.truncated).toBe(false);
    expect(trace.steps.length).toBeGreaterThan(0);
    const output = trace.steps.at(-1)!.stdout;
    if (source.fixture.matchMode === 'exact') expect(output).toBe(source.fixture.expectedStdout);
    else expect(output).toContain(source.fixture.expectedStdout);
  });
});
