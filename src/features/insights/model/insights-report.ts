import type { BreakdownData, Enrichment } from '@/shared/breakdown';
import { isApproachLabel } from '@/shared/insight-text';
import type { TraceResult } from '@/shared/trace';
import { executionCounts, type Advice, type Inspection } from './analysis';

type Finding = { kind: string; line?: number; message: string };
type ReportInput = { code: string; outline: BreakdownData; inspection: Inspection; enrichment: Enrichment | null; advice: Advice | null; trace: TraceResult | null };
export const insightsPreviewRows = 5;
const compact = (text: string) => text.replace(/\s+/g, ' ').trim();
const labels: Record<string, string> = {
  function: 'Function', loop: 'Loop', branch: 'Decision', class: 'Class', try: 'Error handling',
  Assign: 'Assignment', AnnAssign: 'Assignment', AugAssign: 'Update', Return: 'Return',
  Import: 'Import', ImportFrom: 'Import', Expr: 'Expression',
};

export function buildInsightsReport({ code, outline, enrichment, advice, trace }: ReportInput) {
  const lines = code.split('\n').length;
  const validLine = (line: number) => Number.isInteger(line) && line > 0 && line <= lines;
  const localApproach = outline.functions.some(fn => fn.recursive) ? 'Recursive calls' :
    outline.outline.some(node => node.kind === 'loop') ? 'Loop-based processing' :
    outline.outline.some(node => node.kind === 'branch') ? 'Conditional processing' : 'Sequential statements';
  const approach = enrichment && isApproachLabel(enrichment.pattern)
    ? { text: compact(enrichment.pattern), source: 'AI' }
    : enrichment ? null : { text: localApproach, source: 'Static' };
  const functions = outline.functions.flatMap(fn => {
    const note = enrichment?.functions.find(item => item.name === fn.name && item.line === fn.line);
    if (enrichment && !note) return [];
    return [{ ...fn, description: note?.purpose || (enrichment ? 'Not described by AI.' : fn.purpose), descriptionSource: enrichment ? 'AI' : 'Static', returnDescription: note?.returns || (enrichment ? 'Not described by AI.' : fn.returns.join(' / ') || 'No explicit return'), returnSource: enrichment ? 'AI' : 'Static' }];
  });
  const flow = outline.annotations.filter(row => validLine(row.line)).map(row => {
    const node = outline.outline.find(item => item.line === row.line);
    const note = enrichment?.annotations.find(item => item.line === row.line);
    const operation = enrichment?.visualMapping?.keyOperations?.find(item => item.line === row.line);
    const kind = node?.kind || (/^Return(?:\s|\.)/.test(row.text) ? 'Return' : row.text.split(':')[0]);
    return { line: row.line, endLine: node?.endLine || row.line, type: labels[kind] || 'Statement', code: row.code.trim(), text: operation?.description || note?.text || row.text, source: operation || note ? 'AI' : 'Static', structural: !!node || kind === 'Return' };
  });
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const candidates = [
    ...(advice?.issues.map(issue => ({ kind: issue.severity, line: issue.line, message: issue.message })) || []),
    ...(enrichment?.suggestions?.map(item => ({ kind: item.type, line: item.line, message: item.message })) || []),
  ];
  for (const item of candidates) {
    const message = compact(item.message);
    if (!message || item.line !== undefined && !validLine(item.line)) continue;
    if (item.kind === 'bug' && /^(?:none\b|no\s+(?:bugs?|issues?|errors?)\b|nothing\b)/i.test(message)) continue;
    if (item.kind === 'style' && item.line === undefined) continue;
    const key = message.toLowerCase().replace(/[.!]+$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ ...item, message, kind: ({ bug: 'Possible bug', 'edge-case': 'Edge case', optimization: 'Optimization', suggestion: 'Suggestion', style: 'Style' } as Record<string, string>)[item.kind] || 'Suggestion' });
  }
  const primary = enrichment?.visualMapping?.primaryStructure;
  return {
    summary: enrichment?.summary || outline.summary, summarySource: enrichment ? 'AI' : 'Static', approach,
    layout: outline.functions.length ? `${outline.functions.length} named function${outline.functions.length === 1 ? '' : 's'}` : 'Top-level script · no named functions',
    primaryStructure: primary && isApproachLabel(primary) ? { text: /^(?:arrays?|lists?|list of integers)$/i.test(primary.trim()) ? 'List / indexed sequence' : compact(primary), source: 'AI' } : enrichment ? { text: 'Not described by AI', source: 'AI' } : { text: outline.concepts.includes('Arrays') ? 'Indexed sequence' : outline.concepts.includes('Hashing') ? 'Keyed collection' : 'Not identified', source: 'Static' },
    concepts: outline.concepts, functions, flow: enrichment ? flow.filter(row => row.source === 'AI') : flow, findings, isAI: !!enrichment,
    hotspots: Object.entries(executionCounts(trace)).map(([line, count]) => ({ line: Number(line), count })).sort((a, b) => b.count - a.count || a.line - b.line),
    run: trace ? { captured: trace.steps.length, truncated: trace.truncated, error: trace.error } : null,
  };
}
export type InsightsReport = ReturnType<typeof buildInsightsReport>;
