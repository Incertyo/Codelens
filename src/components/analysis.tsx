'use client';

import { useStore } from '@/lib/store';

import { empiricalProfiles, sourceDiff, type InputKind } from '@/lib/analysis';

import { AI_SOURCE_NOTICE } from '@/lib/ai/notice';

import { MeasurementDefinition } from './measurement-results';
import { useAnalysisController } from './use-analysis-controller';
export function Analysis({ implementationId }: { implementationId: string }) {
  const { code, readiness, data, error, entryName, setEntryName, kind, setKind, busy, notice, setNotice, samples, setSamples, profile, setProfile, fit, setFit, advice, tests, measuring, measurementWorker, worker, abort, entry, hot, select, measure, rerunTest, suggest } = useAnalysisController(implementationId);
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
                onClick={() => useStore.getState().selectTab('complexity')}
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
