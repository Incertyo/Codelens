'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { CodeRunner } from '../runner/public/code-runner';
import { useStore } from '../workspace/public/store';
import { useAIReadiness } from '../ai/public/client/use-readiness';
import { enrichmentSchema, type BreakdownData } from '@/shared/breakdown';
import { limits } from '@/shared/limits';
import { sameIdentity, sourceIdentity, type SourceIdentity } from '@/shared/identity';
import { adviceSchema, executionCounts, identitySchema, testHarness, type Advice, type Inspection } from './model/analysis';
import type { TraceResult } from '@/shared/trace';

type LocalInsights = { identity: SourceIdentity; outline: BreakdownData; inspection: Inspection };
type CheckedTest = { name: string; code: string; expected: string; trace: TraceResult | null; reason: string };
const adviceResponse = z.object({ source: z.literal('ai'), identity: identitySchema, advice: adviceSchema }).strict();

export function useInsights(implementationId: string, enabled: boolean) {
  const code = useStore((s) => s.code);
  const epoch = useStore((s) => s.runEpoch);
  const trace = useStore((s) => s.result);
  const enrichment = useStore((s) => s.enrichment);
  const [data, setData] = useState<LocalInsights | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notesState, setNotesState] = useState<'waiting' | 'loading' | 'ready' | 'fallback'>('waiting');
  const [reviewNotice, setReviewNotice] = useState('AI review has not loaded.');
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [tests, setTests] = useState<CheckedTest[]>([]);
  const [checking, setChecking] = useState(false);
  const loaded = useRef('');
  const attempted = useRef('');
  const completed = useRef('');
  const testWorker = useRef<CodeRunner | null>(null);
  const { check } = useAIReadiness(enabled);
  const sourceKey = `${implementationId}:${code}`;

  useEffect(() => {
    if (!enabled || !code.trim() || loaded.current === sourceKey) return;
    let active = true;
    const outlineWorker = new CodeRunner();
    const inspectionWorker = new CodeRunner();
    const timer = setTimeout(() => {
      Promise.all([
        sourceIdentity(implementationId, code),
        outlineWorker.analyze(code, 'python'),
        inspectionWorker.inspect(code, 'python'),
      ]).then(([identity, outline, inspection]) => {
        if (!active || useStore.getState().code !== code) return;
        loaded.current = sourceKey;
        setData({ identity, outline, inspection });
        if (outline.diagnostic || inspection.diagnostic) setNotesState('fallback');
        useStore.getState().setBreakdown(outline);
      }).catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Local analysis could not load.');
      });
    }, limits.analysisDebounceMs);
    return () => {
      active = false;
      clearTimeout(timer);
      outlineWorker.dispose();
      inspectionWorker.dispose();
    };
  }, [code, enabled, implementationId, sourceKey]);

  useEffect(() => {
    if (!enabled || !data || data.outline.diagnostic || data.inspection.diagnostic) return;
    const key = `${sourceKey}:${epoch}`;
    if (attempted.current === key) {
      if (completed.current === key) return;
      const timer = setTimeout(() => {
        setNotice('The AI update was paused.');
        setNotesState('fallback');
        setReviewNotice('AI review was paused. Local facts remain available.');
      }, 0);
      return () => clearTimeout(timer);
    }
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && useStore.getState().runEpoch === epoch && useStore.getState().code === code;
    const update = async () => {
      attempted.current = key;
      setAdvice(null);
      setTests([]);
      setNotice('Adding AI notes…');
      setNotesState('loading');
      setReviewNotice('AI review is pending.');
      const request = async (body: unknown) => {
        const availability = await check(controller.signal);
        if (!current()) return null;
        if (!availability.configured) throw new Error(availability.reason || 'AI is unavailable.');
        const response = await fetch('/api/analyze', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(24000)]),
          body: JSON.stringify(body),
        });
        const value = await response.json();
        if (!current()) return null;
        if (!response.ok || value.source !== 'ai')
          throw new Error(value.reason || value.error || 'AI is unavailable.');
        return value;
      };
      try {
        const matchingTrace = trace?.identity && sameIdentity(trace.identity, data.identity) ? trace : null;
        const steps = (matchingTrace?.steps ?? [])
          .filter((step, index, all) => index === 0 || step.event !== 'line' || all[index - 1]?.line !== step.line)
          .slice(0, limits.aiSampleSteps)
          .map(({ index, line, event, func }) => ({ index, line, event, func }));
        const notes = await request({
          code, language: 'python', format: 'structured', runEpoch: epoch, implementationId,
          functions: data.outline.functions.slice(0, limits.aiFunctions).map(({ name, line, endLine, parameters }) => ({ name, line, endLine, parameters })),
          steps,
        });
        if (!notes || !current()) return;
        useStore.getState().setEnrichment(enrichmentSchema.parse(notes.enrichment));
        setNotesState('ready');
        setNotice('Adding AI advice…');
        try {
          const response = await request({
            mode: 'analysis', code, language: 'python', format: 'structured', identity: data.identity, entries: data.inspection.entries,
          });
          if (response && current()) {
            const result = adviceResponse.parse(response);
            if (!sameIdentity(result.identity, data.identity)) throw new Error('AI review belongs to a different source.');
            setAdvice(result.advice);
            setReviewNotice('AI review added. Findings and proposals are unverified.');
          }
        } catch (reason) {
          if (current()) setReviewNotice(`AI review is unavailable. ${reason instanceof z.ZodError ? 'The response could not be validated.' : reason instanceof Error ? reason.message : 'Local analysis remains available.'}`);
        }
        if (current()) setNotice('AI notes ready.');
      } catch (reason) {
        if (current()) {
          setNotesState('fallback');
          setNotice(reason instanceof z.ZodError ? 'AI notes could not be validated.' : reason instanceof Error ? reason.message : 'AI is unavailable.');
          setReviewNotice('AI review was not requested because notes were unavailable. Local analysis remains available.');
        }
      } finally {
        if (current()) completed.current = key;
      }
    };
    const timer = setTimeout(() => { void update(); }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [check, code, data, enabled, epoch, implementationId, sourceKey, trace]);

  useEffect(() => () => { testWorker.current?.dispose(); testWorker.current = null; }, [code, epoch, enabled]);

  const select = (line: number) => {
    const state = useStore.getState();
    state.selectLine(line, true);
    const index = state.result?.steps.findIndex((step) => step.line === line && step.event === 'line');
    if (index !== undefined && index >= 0) state.seek(index);
  };
  const verifyTests = async () => {
    if (!data || !advice || checking) return;
    setChecking(true);
    const current = () => useStore.getState().code === code && useStore.getState().runEpoch === epoch;
    const checked: CheckedTest[] = [];
    testWorker.current ??= new CodeRunner();
    try {
      for (const test of advice.tests) {
        if (!current()) return;
        let testedCode = '', result: TraceResult | null = null, reason = '';
        try {
          const entry = data.inspection.entries.find((item) => item.name === test.entry && item.line === test.line);
          if (!entry) throw new Error('The suggested entry is absent from the AST.');
          testedCode = testHarness(data.inspection, entry, test.argument, 'python', true);
          result = await testWorker.current.run(testedCode, '', limits.steps, () => {}, 'python');
          if (result.error || result.truncated) {
            reason = result.error || 'The trace reached the step cap.';
            result = null;
          }
        } catch (error) { reason = error instanceof Error ? error.message : 'This test could not execute.'; }
        checked.push({ name: test.name, code: testedCode, expected: test.expectedOutput, trace: result, reason });
        if (current()) setTests([...checked]);
      }
    } finally { if (current()) setChecking(false); }
  };
  const rerunTest = async (test: CheckedTest) => {
    if (checking || !test.trace) return;
    setChecking(true);
    testWorker.current ??= new CodeRunner();
    try {
      const result = await testWorker.current.run(test.code, '', limits.steps, () => {}, 'python');
      const identity = await sourceIdentity('draft:python', test.code);
      if (useStore.getState().code !== code || useStore.getState().runEpoch !== epoch) return;
      if (result.error || result.truncated) throw new Error(result.error || 'This re-run reached the step cap.');
      const state = useStore.getState();
      state.setCode(test.code);
      state.setStdin('');
      state.setResult({ ...result, identity });
      state.selectTab('visualizer');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Test could not be run.'); }
    finally { setChecking(false); }
  };
  const matching = data && trace?.identity && sameIdentity(data.identity, trace.identity) ? trace : null;
  const hot = Object.entries(executionCounts(matching)).sort((a, b) => b[1] - a[1]);
  return { code, data, error, notice, notesState, reviewNotice, enrichment, advice, tests, checking, hot, trace: matching, truncated: matching?.truncated, select, verifyTests, rerunTest };
}
