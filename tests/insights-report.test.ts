import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import snapshot from '../src/generated/library.json';
import { examples } from '../src/lib/examples';
import { limits } from '../src/shared/limits';
import { normalizePythonOutline, enrichmentSchema } from '../src/shared/breakdown';
import { traceSchema } from '../src/shared/trace';
import { inspectionSchema } from '../src/features/insights/public/model/analysis';
import { buildInsightsReport } from '../src/features/insights/model/insights-report';

let py: PyodideInterface;
const bubble = examples.find(item => item.title === 'Bubble sort')!.code;
const dutch = snapshot.implementations.find(item => item.id.includes('/dutch-national-flag:'))!.code;
beforeAll(async () => {
  py = await loadPyodide();
  py.globals.set('_codelens_limits_json', JSON.stringify(limits));
  py.runPython('import json as _limits_json; _codelens_limits = _limits_json.loads(_codelens_limits_json)');
  for (const harness of ['tracer', 'outline', 'analysis']) py.runPython(readFileSync(`public/${harness}.py`, 'utf8'));
});
function report(code: string, pattern: string, extras: Record<string, unknown> = {}, withAI = true) {
  py.globals.set('_request_json', JSON.stringify({ code, stdin: '', maxSteps: limits.steps }));
  const outline = normalizePythonOutline(JSON.parse(py.runPython('outline_code(_request_json)')));
  const inspection = inspectionSchema.parse(JSON.parse(py.runPython('inspect_code(_request_json)')));
  const trace = traceSchema.parse(JSON.parse(py.runPython('run_trace(_request_json)')));
  const enrichment = enrichmentSchema.parse({ summary: 'Source-derived explanation.', pattern, functions: [], annotations: [], stepNotes: [], ...extras });
  return { result: buildInsightsReport({ code, outline, inspection, trace, enrichment: withAI ? enrichment : null, advice: null }), outline, trace };
}
describe('consistent Insights from actual Python samples', () => {
  it.each([[bubble, 'for.*range\\(len\\(numbers\\)'], [dutch, 'python']])('keeps AI primary while omitting unusable headings', (code, pattern) => {
    const { result } = report(code, pattern);
    expect(result.summarySource).toBe('AI');
    expect(result.approach).toBeNull();
    expect(result.flow).toEqual([]);
    expect(result.functions).toEqual([]);
    expect(result).not.toHaveProperty('costs');
    expect(result).not.toHaveProperty('memoryWarnings');
  });
  it('keeps a human-readable AI approach labelled as AI', () => {
    expect(report(dutch, 'Three-way partitioning').result.approach).toEqual({ text: 'Three-way partitioning', source: 'AI' });
  });
  it('accepts readable Unicode headings without substituting a local heuristic', () => {
    expect(report(dutch, 'Three‑way partitioning — Dutch national flag').result.approach).toEqual({ text: 'Three‑way partitioning — Dutch national flag', source: 'AI' });
  });
  it('keeps real return statements labelled as returns in the main flow', () => {
    const { result } = report('def size(n):\n    return n\n', 'Direct return', {}, false);
    expect(result.flow.find(row => row.line === 2)).toMatchObject({ type: 'Return', structural: true });
  });
  it('shows no speculative costs even when provider notes contain them', () => {
    const { result } = report(dutch, 'Three-way partitioning', { timeComplexity: 'O(n)', spaceComplexity: 'O(1)' });
    expect(result).not.toHaveProperty('costs');
    expect(result).not.toHaveProperty('memoryWarnings');
  });
  it('uses real local AST explanations only when AI is absent', () => {
    const { result, outline } = report(dutch, 'Local parser', {}, false);
    expect(result.summarySource).toBe('Static');
    expect(result.functions.map(fn => fn.name)).toEqual(outline.functions.map(fn => fn.name));
    expect(result.flow.length).toBeGreaterThan(0);
    expect(result.flow.every(row => row.source === 'Static')).toBe(true);
  });
  it('does not turn an AI no-bug claim into a bug card or repeat the same suggestion', () => {
    const { result } = report(bubble, 'Repeated adjacent comparisons', { suggestions: [
      { type: 'bug', message: 'None detected; the algorithm correctly sorts the list.' },
      { type: 'style', message: 'Add a comment explaining the complexity.' },
      { type: 'optimization', line: 3, message: 'Check the loop boundary.' },
      { type: 'optimization', line: 3, message: 'Check the loop boundary.' },
    ] });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ line: 3, message: 'Check the loop boundary.' });
  });
  it('keeps trace evidence exact and all line references grounded in real AST nodes', () => {
    const { result, trace, outline } = report(dutch, 'Three-way partitioning', {}, false);
    const line = result.hotspots[0].line;
    expect(result.hotspots[0].count).toBe(trace.steps.filter(step => step.event === 'line' && step.line === line).length);
    expect(result.flow.every(row => outline.annotations.some(item => item.line === row.line))).toBe(true);
    expect(result.functions.map(fn => fn.name)).toEqual(outline.functions.map(fn => fn.name));
  });
});
