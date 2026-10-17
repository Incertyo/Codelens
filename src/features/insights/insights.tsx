'use client';
import { AI_SOURCE_NOTICE } from '../ai/public/client/notice';
import { buildInsightsReport } from './model/insights-report';
import { InsightActions } from './insight-actions';
import { InsightEvidence, InsightFindings, InsightOverview, InsightSection, InsightStructure } from './insight-sections';
import { useInsights } from './use-insights';

export function Insights({ implementationId, enabled }: { implementationId: string; enabled: boolean }) {
  const controller = useInsights(implementationId, enabled);
  const { code, data, error, notice, notesState, reviewNotice, enrichment, advice, trace, select } = controller;
  const source = enrichment ? 'ai' : notesState === 'fallback' ? 'local' : 'loading';
  const report = data && source !== 'loading' ? buildInsightsReport({ code, outline: data.outline, inspection: data.inspection, trace, enrichment, advice }) : null;
  const diagnostic = data?.outline.diagnostic || data?.inspection.diagnostic;
  return <div className="insights-pane analysis-pane" data-notes-source={source} data-source-hash={data?.identity.sourceHash} data-implementation-id={data?.identity.implementationId}>
    <header className="insights-heading"><span className="mono eyebrow">02 / INSIGHTS</span><h2>What matters in your code.</h2><p className="insights-privacy">{AI_SOURCE_NOTICE}</p></header>
    {error && <p role="alert">{error}</p>}
    <p className="insights-status" role="status" aria-live="polite"><span>{source === 'ai' ? 'AI notes' : source === 'local' ? 'Local code notes · fallback' : 'Preparing AI notes…'}</span> {notice}</p>
    {data && report && <>
      {diagnostic && <p role="alert">Fix the syntax to inspect this source: {diagnostic}</p>}
      <InsightOverview report={report} />
      <InsightStructure report={report} outline={data.outline} select={select} />
      <InsightEvidence report={report} select={select} />
      <InsightSection id="review" number="04" title="Review">
        <p className="insights-attribution" role="status">{reviewNotice}</p>
        {advice && <p>{advice.summary}</p>}
        <InsightFindings report={report} select={select} />
        <InsightActions controller={controller} />
      </InsightSection>
    </>}
  </div>;
}
