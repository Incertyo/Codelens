'use client';

import { empiricalProfiles, type InputKind } from "@/features/insights/model/analysis";
import { ComplexityChart, ComplexityComparison } from "./complexity-comparison";

import { MeasurementDefinition, MeasurementResults } from "./measurement-results";

import { useComplexityController } from "./use-complexity-controller";
export function ComplexityView({ implementationId }: { implementationId: string }) {
  const { enrichment, data, error, entryName, setEntryName, kind, setKind, busy, notice, timeSamples, setTimeSamples, spaceSamples, setSpaceSamples, profile, setProfile, timeFit, setTimeFit, spaceFit, setSpaceFit, measurementResult, setMeasurementResult, measuring, measurementWorker, entry, enriched, mainTimeComplexity, mainSpaceComplexity, measure } = useComplexityController(implementationId);
  return (
    <div
      className="analysis-pane complexity-tab-pane"
      data-source-hash={data?.identity.sourceHash}
      data-implementation-id={data?.identity.implementationId}
    >
      <div className="analysis-heading">
        <span className="mono eyebrow">04 / COMPLEXITY</span>
        <h2>More input. How much work?</h2>
        <p>Compare steps and extra memory as the input grows.</p>
      </div>

      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Reading your code…</p>}

      {data && (
        <>
          <p className="mono dim analysis-identity sr-only">
            {data.identity.implementationId} · source {data.identity.sourceHash.slice(0, 12)}
          </p>

          {/* Problem Complexity Spotlight Card */}
          <section
            className="problem-complexity-spotlight"
            aria-labelledby="problem-complexity-title"
          >
            <h3 id="problem-complexity-title" className="sr-only">
              Problem Complexity Spotlight
            </h3>
            <div className="spotlight-cards-grid">
              <div className="spotlight-card time-spotlight">
                <div className="spotlight-header">
                  <span className="mono dim">WORK / STEPS</span>
                  <span className="spotlight-badge tc-badge">
                    {enrichment?.timeComplexity
                      ? 'AI estimate'
                      : enriched
                        ? 'Reference'
                        : 'Static estimate'}
                  </span>
                </div>
                <strong className="spotlight-val mono">{mainTimeComplexity}</strong>
                <p className="spotlight-desc">How quickly the amount of work grows.</p>
              </div>

              <div className="spotlight-card space-spotlight">
                <div className="spotlight-header">
                  <span className="mono dim">EXTRA MEMORY</span>
                  <span className="spotlight-badge sc-badge">
                    {enrichment?.spaceComplexity
                      ? 'AI estimate'
                      : enriched
                        ? 'Reference'
                        : 'Static estimate'}
                  </span>
                </div>
                <strong className="spotlight-val mono">{mainSpaceComplexity}</strong>
                <p className="spotlight-desc">The working room the algorithm needs.</p>
              </div>
            </div>
          </section>

          {/* Measurement Controls Section */}
          <section aria-labelledby="complexity-measurement-controls">
            <h3 id="complexity-measurement-controls">Try it with real inputs.</h3>
            <p>Choose a function. We run it locally at a few sizes.</p>

            {data.inspection.entries.length > 0 && (
              <div className="measurement-controls-bar">
                <label className="analysis-field">
                  Function
                  <select
                    aria-label="Entry function"
                    value={entryName}
                    disabled={busy}
                    onChange={(e) => {
                      setEntryName(e.target.value);
                      setTimeFit(null);
                      setSpaceFit(null);
                      setTimeSamples([]);
                      setSpaceSamples([]);
                      setMeasurementResult(null);
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

                <label className="analysis-field">
                  Input
                  <select
                    aria-label="Input generator"
                    disabled={busy || !entry || !entry.kinds.length}
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value as InputKind);
                      setTimeFit(null);
                      setSpaceFit(null);
                      setTimeSamples([]);
                      setSpaceSamples([]);
                      setMeasurementResult(null);
                    }}
                  >
                    {(entry?.kinds.length ? entry.kinds : ['list']).map((k) => (
                      <option key={k} value={k}>
                        {k === 'int' ? 'int n' : k === 'list' ? 'list of integers' : 'string'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="analysis-field">
                  Sizes
                  <select
                    aria-label="Measurement sizes"
                    disabled={busy}
                    value={profile}
                    onChange={(e) => {
                      setProfile(e.target.value as keyof typeof empiricalProfiles);
                      setTimeFit(null);
                      setSpaceFit(null);
                      setTimeSamples([]);
                      setSpaceSamples([]);
                      setMeasurementResult(null);
                    }}
                  >
                    <option value="standard">Standard · 4 to 128</option>
                    <option value="small">Small · 2 to 16</option>
                    <option value="tiny">Tiny · 1 to 5</option>
                  </select>
                </label>
              </div>
            )}

            <div className="measurement-actions-row">
              <button
                className="analysis-button run-measurement-btn"
                disabled={busy || !entry || !!entry.reason || !!data.inspection.preparationReason}
                onClick={() => void measure()}
              >
                {measuring ? 'Measuring…' : 'Measure code'}
              </button>
              {measuring && (
                <button
                  className="analysis-button cancel-btn"
                  onClick={() => measurementWorker.current?.dispose()}
                >
                  Cancel measurement
                </button>
              )}
            </div>

            {notice && (
              <p className="analysis-status mono" role="status">
                {notice}
              </p>
            )}

            <MeasurementDefinition />
          </section>

          {/* Time Complexity Section */}
          <section className="complexity-chart-section" aria-labelledby="time-complexity-title">
            <div className="section-title-row">
              <div>
                <span className="mono dim">01 / WORK</span>
                <h3 id="time-complexity-title">Steps as input grows</h3>
              </div>
              <div className="main-tc-indicator">
                <span className="indicator-dot" />
                <span className="mono">
                  Guide <strong>{mainTimeComplexity}</strong>
                </span>
              </div>
            </div>
            <p>Steps count work, not seconds. Point at a line to look closer.</p>

            <ComplexityChart
              samples={timeSamples}
              fit={timeFit}
              candidateTime={mainTimeComplexity}
              mainComplexity={mainTimeComplexity}
              type="time"
              unitLabel="function line events"
            />

            {timeSamples.length > 0 && (
              <div
                className="scale-table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Captured steps"
              >
                <table>
                  <caption>Real captured steps by input size</caption>
                  <thead>
                    <tr>
                      <th scope="col">Input size n</th>
                      <th scope="col">Function line events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSamples.map((s) => (
                      <tr key={s.n}>
                        <td>{s.n}</td>
                        <td>{s.steps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {timeFit && (
              <div className="estimate-card">
                <strong>Estimated {timeFit.label}</strong>
                <p>
                  Based on runs up to input size {timeFit.maxN}. This is an estimate, not proof.
                </p>
                <p>
                  {timeFit.inconclusive
                    ? 'More measurements are needed to tell these patterns apart.'
                    : `Fit error ${(timeFit.error * 100).toFixed(1)}%.`}
                </p>
                <details className="chart-details">
                  <summary>Fit details</summary>
                  <p>{timeFit.alternatives}</p>
                </details>
              </div>
            )}
            <ComplexityComparison fit={timeFit} staticTime={entry?.time ?? 'Unknown'} />
          </section>

          {/* Space Complexity Section */}
          <section className="complexity-chart-section" aria-labelledby="space-complexity-title">
            <div className="section-title-row">
              <div>
                <span className="mono dim">02 / MEMORY</span>
                <h3 id="space-complexity-title">Room to work</h3>
              </div>
              <div className="main-sc-indicator">
                <span className="indicator-dot space-dot" />
                <span className="mono">
                  Guide <strong>{mainSpaceComplexity}</strong>
                </span>
              </div>
            </div>

            <p>
              Extra memory used while the code runs. Sample units, not bytes; brief allocations can
              be missed.
            </p>

            <ComplexityChart
              samples={spaceSamples}
              fit={spaceFit}
              candidateTime={mainSpaceComplexity}
              mainComplexity={mainSpaceComplexity}
              type="space"
              unitLabel="auxiliary memory units"
            />

            {measurementResult && <MeasurementResults result={measurementResult} />}
          </section>
        </>
      )}
    </div>
  );
}
