'use client';
import type { SourceIdentity } from "@/shared/identity";
import { useSourceInspection } from "./use-source-inspection";
import { limits } from "@/shared/limits";
import { useRef, useState } from 'react';
import { z } from 'zod';
import { useStore } from "@/features/workspace/public/store";
import { adviceSchema, executionCounts, empiricalProfiles, generatedInput, identitySchema, sameIdentity, sourceIdentity, testHarness, type Advice, type Sample } from "@/features/insights/model/analysis";
import type { TraceResult } from "@/shared/trace";
import { useAIReadiness } from "../ai/public/client/use-readiness";

import { MeasurementRunner } from "@/features/runner/public/measurement-runner";
import { measurementSizes, type MeasurementFit } from "@/features/runner/public/measurement";

type CheckedTest = {
  identity: SourceIdentity;
  name: string;
  code: string;
  expected: string;
  trace: TraceResult | null;
  reason: string;
};
const responseSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('ai'), identity: identitySchema, advice: adviceSchema }).strict(),
  z.object({ source: z.literal('static'), identity: identitySchema, reason: z.string() }).strict(),
]);

export function useAnalysisController(implementationId: string) {
  const code = useStore((s) => s.code),
    language = useStore((s) => s.language),
    trace = useStore((s) => s.result);
  const readiness = useAIReadiness();

  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [samples, setSamples] = useState<Sample[]>([]);
  const [profile, setProfile] = useState<keyof typeof empiricalProfiles>('standard');
  const [fit, setFit] = useState<MeasurementFit | null>(null),
    [advice, setAdvice] = useState<Advice | null>(null),
    [tests, setTests] = useState<CheckedTest[]>([]);
  const [measuring, setMeasuring] = useState(false);
  const measurementWorker = useRef<MeasurementRunner | null>(null);
  const abort = useRef<AbortController | null>(null);

  const { data, error, entryName, setEntryName, kind, setKind, worker, active } = useSourceInspection(code, language, implementationId, {
    delay: limits.analysisDebounceMs,
    failure: 'AST analysis could not load.',
    cache: (analysis) => { if (analysis.bigOFit) setFit(analysis.bigOFit); },
    cancel: () => { abort.current?.abort(); },
    cleanup: () => { measurementWorker.current?.dispose(); },
  });
  const entry = data?.inspection.entries.find((e) => e.name === entryName);
  const counts = executionCounts(
      data && trace?.identity && sameIdentity(data.identity, trace.identity) ? trace : null,
    ),
    hot = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  const select = (line: number) =>
    useStore.getState().selectLine(line, true);
  const measure = async () => {
    if (!data || !entry || busy) return;
    setBusy(true);
    setSamples([]);
    setFit(null);
    setMeasuring(true);
    setNotice('Preparing snapshot-free measurements…');
    try {
      const collected: Sample[] = [];
      measurementWorker.current = new MeasurementRunner();
      const result = await measurementWorker.current.measure(
        {
          code,
          entry: entry.name,
          language,
          sizes: profile === 'standard' ? measurementSizes : empiricalProfiles[profile],
          argumentsForSize: (n) => [generatedInput(kind, n)],
        },
        (progress) => {
          if (!active.current) return;
          if (progress.n !== null)
            setNotice(
              `Measuring ${entry.name}: size ${progress.n} (${progress.index}/${progress.total})…`,
            );
          if (progress.result?.status === 'complete' && progress.result.lineEvents! > 0) {
            collected.push({ n: progress.result.n, steps: progress.result.lineEvents! });
            setSamples([...collected]);
          }
        },
      );
      if (!active.current) return;
      setFit(result.time);

      setNotice(
        result.time
          ? `Local estimate from ${result.time.validPoints} complete measured runs at sizes up to ${result.time.maxN}.${result.reduced ? ' Larger sizes were stopped at a resource or execution bound.' : ''}`
          : 'No estimate is fitted: fewer than four complete positive sizes. Budget-exceeded, partial and failed sizes are excluded.',
      );
    } catch (e) {
      if (active.current)
        setNotice(
          `Cannot measure this entry: ${e instanceof Error ? e.message : 'Unsupported signature or runtime failure.'}`,
        );
    } finally {
      if (active.current) {
        setBusy(false);
        setMeasuring(false);
      }
    }
  };
  const rerunTest = async (test: CheckedTest) => {
    if (busy || !data || !test.trace || !sameIdentity(test.identity, data.identity)) return;
    setBusy(true);
    setNotice(`Re-running ${test.name} in a real worker…`);
    try {
      const result = await worker.current!.run(test.code, '', limits.steps, () => {}, language);
      if (!active.current) return;
      if (result.error || result.truncated)
        throw new Error(result.error || 'This re-run reached the step cap.');
      const identity = await sourceIdentity(`draft:${language}`, test.code);
      if (!active.current) return;
      const state = useStore.getState();
      state.setCode(test.code);
      state.setStdin('');
      state.setResult({ ...result, identity });
      state.selectTab('visualizer');
    } catch (e) {
      if (active.current)
        setNotice(
          `Test could not be re-run: ${e instanceof Error ? e.message : 'Worker failure.'}`,
        );
    } finally {
      if (active.current) setBusy(false);
    }
  };
  const suggest = async () => {
    if (!data || busy) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setNotice('Requesting AI suggestions…');
    setAdvice(null);
    setTests([]);
    try {
      const availability = await readiness.check(controller.signal);
      if (!availability.configured) throw new Error(availability.reason);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(24000)]),
        body: JSON.stringify({
          mode: 'analysis',
          code,
          language,
          identity: data.identity,
          entries: data.inspection.entries,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        const reason = body.error || 'AI suggestions are unavailable.';
        if (active.current && !controller.signal.aborted) readiness.unavailable(reason);
        throw new Error(reason);
      }
      const parsed = responseSchema.parse(await response.json());
      if (!active.current || !sameIdentity(parsed.identity, data.identity)) return;
      if (parsed.source === 'static') {
        setNotice(parsed.reason);
        return;
      }
      setAdvice(parsed.advice);
      const checked: CheckedTest[] = [];

      for (const test of parsed.advice.tests) {
        if (!active.current) return;
        setNotice(
          `Checking suggested test ${checked.length + 1}/${parsed.advice.tests.length} in a real worker…`,
        );
        let testedCode = '',
          result: TraceResult | null = null,
          reason = '';
        try {
          const fn = data.inspection.entries.find(
            (e) => e.name === test.entry && e.line === test.line,
          );
          if (!fn) throw new Error('The suggested entry is absent from the AST.');
          testedCode = testHarness(data.inspection, fn, test.argument, language, true);
          result = await worker.current!.run(testedCode, '', limits.steps, () => {}, language);
          result = { ...result, identity: await sourceIdentity(`draft:${language}`, testedCode) };
          if (result.error || result.truncated) {
            reason = result.error || 'The trace reached the step cap.';
            result = null;
          }
        } catch (e) {
          reason = e instanceof Error ? e.message : 'This test could not execute.';
        }
        checked.push({
          identity: data.identity,
          name: test.name,
          code: testedCode,
          expected: test.expectedOutput,
          trace: result,
          reason,
        });
        if (active.current) setTests([...checked]);
      }
      if (active.current)
        setNotice(
          'AI suggestions are proposals. Completed tests have real traces; their AI expected outputs remain unverified.',
        );
    } catch (e) {
      if (active.current)
        setNotice(
          `${e instanceof z.ZodError ? 'AI suggestions could not be validated.' : e instanceof Error ? e.message : 'AI suggestions were unavailable.'} AST analysis and real traces remain available.`,
        );
    } finally {
      if (active.current) setBusy(false);
    }
  };

  return { code, trace, readiness, data, error, entryName, setEntryName, kind, setKind, busy, notice, setNotice, samples, setSamples, profile, setProfile, fit, setFit, advice, tests, measuring, measurementWorker, worker, abort, entry, counts, hot, select, measure, rerunTest, suggest };
}
