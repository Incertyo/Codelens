'use client';
import type { ReactNode } from 'react';
import type { BreakdownData } from '@/shared/breakdown';
import { insightsPreviewRows, type InsightsReport } from './model/insights-report';

type Props = { report: InsightsReport; outline: BreakdownData; select: (line: number) => void };
export function InsightSection({ id, number, title, children }: { id: string; number: string; title: string; children: ReactNode }) {
  return <section data-insights-section={id} aria-labelledby={`insights-${id}`}><div className="insights-section-title"><h3 id={`insights-${id}`}><span className="mono dim" aria-hidden="true">{number} / </span>{title}</h3></div>{children}</section>;
}
export function InsightOverview({ report }: Pick<Props, 'report'>) {
  return <InsightSection id="overview" number="01" title="Overview">
    <p className="insights-attribution mono">{report.summarySource} explanation · verify against source and runs</p><p>{report.summary}</p>
    <dl className="insights-facts">
      <div><dt>Algorithm / approach <span className="insights-source">{report.approach?.source || 'AI'}</span></dt><dd>{report.approach?.text || 'Not described by AI'}</dd></div>
      {!report.isAI && <div><dt>Program layout <span className="insights-source">Static</span></dt><dd>{report.layout}</dd></div>}
      <div><dt>Primary structure <span className="insights-source">{report.primaryStructure.source}</span></dt><dd>{report.primaryStructure.text}</dd></div>
      {!report.isAI && <div><dt>Concepts <span className="insights-source">Static</span></dt><dd>{report.concepts.join(' · ') || 'No specific concept identified'}</dd></div>}
    </dl>
  </InsightSection>;
}
export function InsightStructure({ report, outline, select }: Props) {
  const steps = report.flow.filter(row => row.structural);
  const visible = (steps.length ? steps : report.flow).slice(0, insightsPreviewRows);
  const rows = (flow: typeof report.flow) => <ol className="insights-flow">{flow.map(row => <li key={row.line}>
    <button className="text-button mono" onClick={() => select(row.line)}>Line {row.line}{row.endLine !== row.line ? `–${row.endLine}` : ''} · {row.type}</button>
    <p><span className="insights-source mono">{row.source}</span> {row.text}</p>
  </li>)}</ol>;
  return <InsightSection id="structure" number="02" title="Structure and flow">
    <p className="insights-attribution">{report.isAI ? 'AI explanations with source references checked locally.' : 'Local AST fallback: source structure and parser descriptions.'}</p>
    <h4>Functions</h4>
    {!report.functions.length && <p>{outline.functions.length ? 'AI did not provide function explanations. Source structure is available below.' : 'This script defines no named functions.'}</p>}
    <div className="insights-functions">{report.functions.map(fn => <div className="insights-function-card" key={`${fn.name}:${fn.line}`}>
      <button className="insights-function" onClick={() => select(fn.line)}><code>{fn.name}({fn.parameters.join(', ')})</code><span className="dim">Line {fn.line}–{fn.endLine} · Static{fn.recursive ? ' · recursive' : ''}</span></button>
      <p><span className="insights-source mono">{fn.descriptionSource} purpose</span> {fn.description}</p>
      <p><span className="insights-source mono">{fn.returnSource} returns</span> {fn.returnDescription}</p>
    </div>)}</div>
    <h4>Main flow</h4>{visible.length ? rows(visible) : <p>{report.isAI ? 'AI did not provide a line walkthrough.' : 'No executable statements to describe.'}</p>}
    <details><summary>Code structure <span className="insights-source mono">Static</span></summary>
      <div className="insights-lines">{outline.outline.map(node => <button className="text-button mono" key={node.id} onClick={() => select(node.line)} style={{ paddingInlineStart: `${node.depth * 12}px` }}>Line {node.line}–{node.endLine} · {node.label}</button>)}</div>
      {!outline.outline.length && <p>No nested blocks.</p>}
    </details>
    <details><summary>Line notes</summary>{rows(report.flow)}</details>
  </InsightSection>;
}
export function InsightEvidence({ report, select }: Pick<Props, 'report' | 'select'>) {
  const counts = (hotspots: typeof report.hotspots) => <div className="hotspot-list">{hotspots.map(row => <button className="text-button mono" key={row.line} onClick={() => select(row.line)}>Line {row.line} · {row.count} {row.count === 1 ? 'execution' : 'executions'}</button>)}</div>;
  return <InsightSection id="evidence" number="03" title="Run evidence">
    <h4>Hot spots</h4>
    {!report.run ? <p>Run your code to see what happens for this input.</p> : <>
      <p className="insights-attribution mono">Real trace · {report.run.captured} captured events · {report.run.truncated ? 'partial run' : report.run.error ? 'ended with an error' : 'run completed'}</p>
      {report.run.error && <p>{report.run.error}</p>}
      {counts(report.hotspots.slice(0, insightsPreviewRows))}
      {report.hotspots.length > insightsPreviewRows && <details><summary>All line counts ({report.hotspots.length})</summary>{counts(report.hotspots.slice(insightsPreviewRows))}</details>}
      <p>{report.run.truncated ? 'Counts cover the captured part of this run only.' : 'Line counts describe this input only; they do not prove complexity or correctness.'}</p>
    </>}
  </InsightSection>;
}
export function InsightFindings({ report, select }: Pick<Props, 'report' | 'select'>) {
  return <>{!report.findings.length ? <p>No actionable concerns were supplied. This does not establish correctness.</p> : <ul className="insights-findings">{report.findings.map((finding, index) => <li key={index}>
    <div className="insights-section-title"><strong>{finding.kind}</strong><span className="insights-source mono">AI · unverified</span></div>
    {finding.line && <button className="text-button mono" onClick={() => select(finding.line!)}>Line {finding.line}</button>}<p>{finding.message}</p>
  </li>)}</ul>}</>;
}
