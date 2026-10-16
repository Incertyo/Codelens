import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { algorithms, algorithmTopics } from '../src/lib/algorithm-catalog';
import { examples } from '../src/lib/examples';
import { exampleCode } from '../src/lib/javascript-examples';
import { getEnrichedAlgorithm } from '../src/lib/enriched-catalog';

const compiled = spawnSync(process.env.PYTHON ?? 'python', ['scripts/compile-library.py'], {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});
if (compiled.status !== 0) throw new Error(compiled.stderr || 'Python library compilation failed');
type Program = {
  slug: string;
  code: string;
  expected: string;
  sourceFile: string;
  entryPoint: string;
  notes: string[];
};
const programs = JSON.parse(compiled.stdout) as Program[];
const bySlug = new Map(programs.map((p) => [p.slug, p]));
if (bySlug.size !== programs.length) throw new Error('Duplicate source slugs');
const slugs = algorithms.map((a) => a.id.split('/').at(-1)!);
if (slugs.some((s) => !bySlug.has(s)) || programs.some((p) => !slugs.includes(p.slug)))
  throw new Error('Every catalog entry must have exactly one reference implementation');
const firstExpected = [
  ['Sorted: [1, 2, 3, 5, 8]', 'Sorted: [1,2,3,5,8]'],
  ['Found at index: 4', 'Found at index: 4'],
  ['Fibonacci: 5', 'Fibonacci: 5'],
  ["Visit order: ['A', 'B', 'C', 'D', 'E']", 'Visit order: ["A","B","C","D","E"]'],
  ['New head: 3', 'New head: 3'],
  ['Best value: 18', 'Best value: 18'],
  ['Pair: [4, 11]', 'Pair: [4,11]'],
];
const location = resolve(process.env.CODELENS_LIBRARY_DB ?? 'data/codelens.sqlite');
mkdirSync(resolve(location, '..'), { recursive: true });
const db = new DatabaseSync(location);
db.exec('PRAGMA busy_timeout = 5000;');
db.exec(readFileSync('library/schema.sql', 'utf8'));
db.exec('BEGIN IMMEDIATE');
try {
  const topicStatement = db.prepare(
    'INSERT INTO topics VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, position=excluded.position',
  );
  const subtopicStatement = db.prepare(
    'INSERT INTO subtopics VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, position=excluded.position',
  );
  const algorithmStatement = db.prepare(
    'INSERT INTO algorithms VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, featured_example_id=excluded.featured_example_id, position=excluded.position',
  );
  algorithmTopics.forEach((topic, ti) => {
    topicStatement.run(topic.id, topic.name, ti);
    topic.subtopics.forEach((sub, si) => {
      const subId = `${topic.id}/${sub.id}`;
      subtopicStatement.run(subId, topic.id, sub.name, sub.description, si);
      sub.algorithms.forEach((a, ai) =>
        algorithmStatement.run(a.id, subId, a.name, a.description, a.exampleId ?? null, ai),
      );
    });
  });
  const insert = db.prepare('INSERT INTO implementations VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  const fixture = db.prepare('INSERT INTO fixtures VALUES (?,?,?,?,?,?)');
  const analysisStmt = db.prepare(`
    INSERT INTO analysis_results (id, implementation_id, source_hash, language, data_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      implementation_id = coalesce(excluded.implementation_id, analysis_results.implementation_id),
      data_json = excluded.data_json,
      created_at = excluded.created_at
  `);
  const latest = db.prepare(
    'SELECT revision, revision_hash FROM implementations WHERE algorithm_id=? AND language=? AND variant=? ORDER BY revision DESC LIMIT 1',
  );
  let inserted = 0;
  const save = (
    algorithmId: string,
    language: string,
    variant: string,
    code: string,
    sourceFile: string,
    entryPoint: string,
    notes: string[],
    expected: string,
    mode: string,
  ) => {
    // Include fixture and documentation changes in a revision, not just the code text.
    const hash = createHash('sha256')
      .update(JSON.stringify({ code, expected, notes, entryPoint, sourceFile, mode }))
      .digest('hex');
    const previous = latest.get(algorithmId, language, variant) as
      { revision: number; revision_hash: string } | undefined;
    if (previous?.revision_hash === hash) return;
    const revision = (previous?.revision ?? 0) + 1;
    const id = `${algorithmId}:${language}:${variant}:v${revision}`;
    insert.run(
      id,
      algorithmId,
      language,
      variant,
      revision,
      code,
      createHash('sha256').update(code).digest('hex'),
      hash,
      sourceFile,
      entryPoint,
      JSON.stringify(notes),
    );
    fixture.run(`${id}:demo`, id, 'Demonstration', '', expected, mode);
    inserted++;
  };
  for (const a of algorithms) {
    const p = bySlug.get(a.id.split('/').at(-1)!)!;
    save(
      a.id,
      'python',
      'reference',
      p.code,
      p.sourceFile,
      p.entryPoint,
      p.notes,
      p.expected,
      'exact',
    );
    const enriched = getEnrichedAlgorithm(a.id);
    const pCodeHash = createHash('sha256').update(p.code).digest('hex');
    const pAnalysisId = `${pCodeHash}:python`;
    const pSyntheticEnrichment = {
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
    analysisStmt.run(
      pAnalysisId,
      `${a.id}:python:reference:v1`,
      pCodeHash,
      'python',
      JSON.stringify({
        timeComplexity: enriched.timeComplexity,
        spaceComplexity: enriched.spaceComplexity,
        suggestions: enriched.suggestions,
        visualMapping: enriched.visualMapping,
        enrichment: pSyntheticEnrichment,
      }),
      Date.now(),
    );

    const example = examples.find((e) => e.id === a.exampleId);
    if (example) {
      for (const language of ['python', 'javascript'] as const) {
        const expected =
          example.expected?.[language] ??
          firstExpected[Number(example.id) - 1][language === 'python' ? 0 : 1];
        save(
          a.id,
          language,
          'featured',
          exampleCode(example, language),
          Number(example.id) > 7
            ? 'src/lib/additional-examples.ts'
            : language === 'python'
              ? 'src/lib/examples.ts'
              : 'src/lib/javascript-examples.ts',
          'Featured demonstration',
          [],
          expected,
          'contains',
        );
        const sourceCode = exampleCode(example, language);
        const sHash = createHash('sha256').update(sourceCode).digest('hex');
        const analysisId = `${sHash}:${language}`;
        const syntheticEnrichment = {
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
        analysisStmt.run(
          analysisId,
          `${a.id}:${language}:featured:v1`,
          sHash,
          language,
          JSON.stringify({
            timeComplexity: enriched.timeComplexity,
            spaceComplexity: enriched.spaceComplexity,
            suggestions: enriched.suggestions,
            visualMapping: enriched.visualMapping,
            enrichment: syntheticEnrichment,
          }),
          Date.now(),
        );
      }
    }
  }
  db.exec('COMMIT');
  console.log(
    `Library database: ${algorithms.length} algorithms, ${programs.length} Python references, ${examples.length} bilingual featured examples. ${inserted} new revisions.`,
  );
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
