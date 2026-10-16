'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useStore } from '@/lib/store';
import { CodeRunner } from '@/lib/runner';
import {
  adviceSchema,
  executionCounts,
  empiricalProfiles,
  generatedInput,
  identitySchema,
  sameIdentity,
  sourceDiff,
  sourceIdentity,
  testHarness,
  type Advice,
  type InputKind,
  type Inspection,
  type Sample,
  type SourceIdentity,
} from '@/lib/analysis';
import type { TraceResult } from '@/lib/trace';
import { useAIReadiness } from './use-ai-readiness';
import { AI_SOURCE_NOTICE } from '@/lib/ai/notice';
import { MeasurementRunner } from '@/lib/measurement-runner';
import { measurementSizes, type MeasurementFit } from '@/lib/measurement';
import { MeasurementDefinition } from './measurement-results';
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
export function Analysis({ implementationId }: { implementationId: string }) {
  const code = useStore((s) => s.code),
    language = useStore((s) => s.language),
    trace = useStore((s) => s.result);
  const readiness = useAIReadiness(['python', 'javascript', 'java'].includes(language));
  const [data, setData] = useState<{ identity: SourceIdentity; inspection: Inspection } | null>(
    null,
  );
  const [error, setError] = useState(''),
    [entryName, setEntryName] = useState(''),
    [kind, setKind] = useState<InputKind>('list');
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [samples, setSamples] = useState<Sample[]>([]);
  const [profile, setProfile] = useState<keyof typeof empiricalProfiles>('standard');
  const [fit, setFit] = useState<MeasurementFit | null>(null),
    [advice, setAdvice] = useState<Advice | null>(null),
    [tests, setTests] = useState<CheckedTest[]>([]);
  const [measuring, setMeasuring] = useState(false);
  const measurementWorker = useRef<MeasurementRunner | null>(null);
  const worker = useRef<CodeRunner | null>(null),
    abort = useRef<AbortController | null>(null),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    if (!['python', 'javascript', 'java'].includes(language)) return;
    let current = true;
    const timer = setTimeout(() => {
      worker.current = new CodeRunner();
      Promise.all([sourceIdentity(implementationId, code), worker.current.inspect(code, language)])
        .then(([identity, inspection]) => {
          if (!current) return;
          setData({ identity, inspection });
          const first = inspection.entries.find((e) => !e.reason) || inspection.entries[0];
          if (first) {
            setEntryName(first.name);
            setKind(first.kinds[0] || 'list');
          }
          fetch(
            `/api/analyze?sourceHash=${identity.sourceHash}&language=${language}&implementationId=${encodeURIComponent(implementationId)}`,
          )
            .then((r) => (r.ok ? r.json() : null))
            .then((res) => {
              if (current && res?.analysis?.bigOFit) {
                setFit(res.analysis.bigOFit);
              }
            })
            .catch(() => {});
        })
        .catch((e) => {
          if (current) setError(e instanceof Error ? e.message : 'AST analysis could not load.');
        });
    }, 600);
    return () => {
      current = false;
      clearTimeout(timer);
      active.current = false;
      abort.current?.abort();
      worker.current?.dispose();
      measurementWorker.current?.dispose();
    };
  }, [code, language, implementationId]);
  const entry = data?.inspection.entries.find((e) => e.name === entryName);
  const counts = executionCounts(
      data && trace?.identity && sameIdentity(data.identity, trace.identity) ? trace : null,
    ),
    hot = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  const select = (line: number) =>
    useStore.getState().patch({ selectedLine: line, playing: false });
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
      const result = await worker.current!.run(test.code, '', 5000, () => {}, language);
      if (!active.current) return;
      if (result.error || result.truncated)
        throw new Error(result.error || 'This re-run reached the step cap.');
      const identity = await sourceIdentity(`draft:${language}`, test.code);
      if (!active.current) return;
      const state = useStore.getState();
      state.setCode(test.code);
      state.setStdin('');
      state.setResult({ ...result, identity });
      state.patch({ tab: 'visualizer' });
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
          result = await worker.current!.run(testedCode, '', 5000, () => {}, language);
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
  if (!['python', 'javascript', 'java'].includes(language))
    return (
      <div className="analysis-pane">
        <h2>Analysis needs a real trace.</h2>
        <p>
          AST inspection and empirical measurement support Python, JavaScript and the Java subset.
          AI-simulated traces cannot provide measured complexity or execution heatmaps.
        </p>
      </div>
    );
  return (
    <div
      className="analysis-pane"
      data-source-hash={data?.identity.sourceHash}
      data-implementation-id={data?.identity.implementationId}
    >
      <div className="analysis-heading">
        <span className="mono eyebrow">03 / ANALYSIS</span>
        <h2>Understand the cost.</h2>
        <p>AST candidates and real trace estimates, with their limits visible.</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Reading the AST in a local worker…</p>}
      {data && (
        <>
          <p className="mono dim analysis-identity">
            {data.identity.implementationId} · source {data.identity.sourceHash.slice(0, 12)}
          </p>
          {data.inspection.diagnostic && (
            <p role="alert">Fix the syntax to analyze this source: {data.inspection.diagnostic}</p>
          )}
          <section aria-labelledby="static-title">
            <h3 id="static-title">Static complexity · AST</h3>
            {!data.inspection.entries.length ? (
              <p>
                No supported top-level function was found. Add a named function with one required
                parameter to measure it.
              </p>
            ) : (
              <>
                <label className="analysis-field">
                  Entry function
                  <select
                    aria-label="Entry function"
                    value={entryName}
                    disabled={busy}
                    onChange={(e) => {
                      setEntryName(e.target.value);
                      setFit(null);
                      setSamples([]);
                      const fn = data.inspection.entries.find((f) => f.name === e.target.value);
                      setKind(fn?.kinds[0] || 'list');
                    }}
                  >
                    {data.inspection.entries.map((f) => (
                      <option key={`${f.name}:${f.line}`} value={f.name}>
                        {f.name}({f.parameter}) · line {f.line}
                      </option>
                    ))}
                  </select>
                </label>
                {entry && (
                  <>
                    <dl className="complexity-facts">
                      <div>
                        <dt>Time candidate</dt>
                        <dd>{entry.time}</dd>
                      </div>
                      <div>
                        <dt>Auxiliary space</dt>
                        <dd>{entry.space}</dd>
                      </div>
                      <div>
                        <dt>Best / average case</dt>
                        <dd>Unknown</dd>
                      </div>
                    </dl>
                    <p>{entry.evidence}</p>
                    {(entry.reason || data.inspection.preparationReason) && (
                      <p className="analysis-refusal">
                        Cannot use this entry driver:{' '}
                        {entry.reason || data.inspection.preparationReason}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </section>
          <section aria-labelledby="measured-title">
            <h3 id="measured-title">Empirically measure · real worker steps</h3>
            <label className="analysis-field">
              Declared parameter type
              <select
                aria-label="Input generator"
                disabled={busy || !entry || !entry.kinds.length}
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as InputKind);
                  setFit(null);
                  setSamples([]);
                }}
              >
                {(entry?.kinds.length ? entry.kinds : ['list']).map((k) => (
                  <option key={k} value={k}>
                    {k === 'int' ? 'int n' : k === 'list' ? 'list of integers' : 'string'}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Standard sizes: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128; small: 2, 4, 8, 12, 16; tiny:
              1, 2, 3, 4, 5. Integer n equals the size; lists contain descending integers n…1;
              strings repeat “abc” to length n. For unannotated parameters, you declare the type
              here. No average-case sampling.
            </p>
            <p>
              Time counts user-function line events only. All sizes share one disposable worker with
              fresh source bindings and arguments per size. Measurement stores counters rather than
              snapshots and uses its own event/time budget. Native and imported internals are
              untraced; every result is a local estimate, not a proof.
            </p>
            <MeasurementDefinition />
            <label className="analysis-field">
              Measurement sizes
              <select
                aria-label="Measurement sizes"
                disabled={busy}
                value={profile}
                onChange={(e) => {
                  setProfile(e.target.value as keyof typeof empiricalProfiles);
                  setFit(null);
                  setSamples([]);
                }}
              >
                <option value="standard">Standard · 4 to 128</option>
                <option value="small">Small · 2 to 16</option>
                <option value="tiny">Tiny · 1 to 5</option>
              </select>
            </label>
            <button
              className="analysis-button"
              disabled={busy || !entry || !!entry.reason || !!data.inspection.preparationReason}
              onClick={() => void measure()}
            >
              Empirically measure
            </button>
            {measuring && (
              <button
                className="analysis-button"
                onClick={() => measurementWorker.current?.dispose()}
              >
                Cancel measurement
              </button>
            )}
            {samples.length > 0 && (
              <table aria-label="Real captured steps by input size">
                <caption>Real captured steps by input size</caption>
                <thead>
                  <tr>
                    <th scope="col">Size</th>
                    <th scope="col">Function steps</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => (
                    <tr key={s.n}>
                      <td>{s.n}</td>
                      <td>{s.steps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {fit && (
              <div className="estimate-card">
                <strong>Estimated {fit.label}</strong>
                <p>
                  Normalized RMS fit error: {(fit.error * 100).toFixed(1)}%. {fit.alternatives}
                </p>
              </div>
            )}
            <div className="analysis-complexity-card" aria-labelledby="complexity-tab-promo">
              <span className="mono dim">EXPLORE IN DEPTH</span>
              <h4 id="complexity-tab-promo" style={{ margin: '8px 0', fontSize: '16px' }}>
                Interactive Time & Space Complexity Graphs
              </h4>
              <p>
                Interactive Big-O curves, Space Complexity graphs with memory bounds and
                definitions, and hover tracing are available in the dedicated{' '}
                <strong>Complexity</strong> tab.
              </p>
              <button
                className="analysis-button"
                onClick={() => useStore.getState().patch({ tab: 'complexity' })}
              >
                Open Complexity Tab →
              </button>
            </div>
          </section>
          <section aria-labelledby="heat-title">
            <h3 id="heat-title">Hot spots · actual line executions</h3>
            <p>
              Yellow intensity in the editor follows line-event counts. A truncated trace shows only
              captured executions.
            </p>
            {!hot.length ? (
              <p>Run Python, JavaScript or supported Java code to populate the heatmap.</p>
            ) : (
              <div className="hotspot-list">
                {hot.map(([line, count]) => (
                  <button
                    key={line}
                    className="text-button mono"
                    onClick={() => select(Number(line))}
                  >
                    Line {line} · {count} executions
                  </button>
                ))}
              </div>
            )}
          </section>
          <section aria-labelledby="advice-title">
            <h3 id="advice-title">Bugs, improvements and tests</h3>
            <p>{AI_SOURCE_NOTICE} Suggested tests are checked in real browser workers.</p>
            <button
              className="analysis-button"
              disabled={
                !readiness.configured || busy || !!data.inspection.diagnostic || !code.trim()
              }
              onClick={() => void suggest()}
            >
              Request AI suggestions
            </button>
            {!readiness.configured && (
              <>
                <p role="status">{readiness.reason} Static analysis and traces remain available.</p>
                <button className="text-button" onClick={readiness.refresh}>
                  Check AI availability
                </button>
              </>
            )}
            <p className="analysis-status" role="status" aria-live="polite">
              {notice}
            </p>
            {busy && (
              <button
                className="text-button"
                onClick={() => {
                  abort.current?.abort();
                  worker.current?.dispose();
                  setNotice('Stopping analysis…');
                }}
              >
                Cancel analysis
              </button>
            )}
            {advice && (
              <>
                <p>{advice.summary}</p>
                {advice.issues.map((issue, i) => (
                  <p key={i}>
                    <button className="text-button mono" onClick={() => select(issue.line)}>
                      Line {issue.line}
                    </button>{' '}
                    · {issue.severity}: {issue.message}
                  </p>
                ))}
                {advice.optimization && (
                  <details>
                    <summary>Proposed optimization · correctness unverified</summary>
                    <p>{advice.optimization.explanation}</p>
                    <pre className="source-diff" aria-label="Optimization diff">
                      {sourceDiff(code, advice.optimization.code).map((line, i) => (
                        <span key={i} className={`diff-${line.kind}`}>
                          {line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}{' '}
                          {line.text}
                          {'\n'}
                        </span>
                      ))}
                    </pre>
                    <button
                      className="analysis-button"
                      onClick={() => useStore.getState().setCode(advice.optimization!.code)}
                    >
                      Apply proposed code to editor
                    </button>
                  </details>
                )}
                {!advice.issues.length && (
                  <p>No issues were suggested. This is not a correctness guarantee.</p>
                )}
                {tests.map((test, i) => (
                  <div className="suggested-test" key={i}>
                    <h4>{test.name}</h4>
                    <p>
                      AI expected output · unverified: <code>{test.expected || '(empty)'}</code>
                    </p>
                    {test.trace ? (
                      <>
                        <p>
                          Real worker completed · {test.trace.steps.length} steps. Observed output:
                        </p>
                        <pre>{test.trace.steps.at(-1)?.stdout || '(empty)'}</pre>
                        <button
                          className="analysis-button"
                          disabled={busy}
                          onClick={() => void rerunTest(test)}
                        >
                          Run this test
                        </button>
                      </>
                    ) : (
                      <p>Not runnable: {test.reason}</p>
                    )}
                  </div>
                ))}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
