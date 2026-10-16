'use client';
import { useId, useState } from 'react';
import type { Sample } from "@/features/insights/model/analysis";
import { growthModels, fitGrowthModel, predictGrowth, neighboringModels, operationCount, staticComparison, type GrowthFit, type GrowthId } from "@/shared/complexity";
import { limits } from "@/shared/limits";

export function ComplexityChart({
  samples = [],
  fit = null,
  candidateTime,
  candidateComplexity,
  mainComplexity,
  type = 'time',
  unitLabel = 'steps',
}: {
  samples?: Sample[];
  fit?: (Partial<GrowthFit> & { id: string; label: string; maxN?: number }) | null;
  candidateTime?: string;
  candidateComplexity?: string;
  mainComplexity?: string;
  type?: 'time' | 'space';
  unitLabel?: string;
}) {
  const [logarithmic, setLogarithmic] = useState(false);
  const [hoveredState, setHoveredState] = useState<{
    id: string;
    label: string;
    name: string;
    x: number;
    y: number;
    n: number;
    val: number;
    isMain: boolean;
  } | null>(null);
  const descriptionId = useId();
  const hasSamples = samples.length > 0;
  const minN = hasSamples ? Math.min(...samples.map((sample) => sample.n)) : 1;
  const maxN = hasSamples ? Math.max(...samples.map((sample) => sample.n)) : 64;
  const ceiling = hasSamples ? Math.max(2, ...samples.map((sample) => sample.steps * 1.25)) : 100;

  const findMatchingGrowthModel = (raw: string | undefined) => {
    if (!raw) return growthModels[2];
    const s = raw
      .replace(' candidate', '')
      .replace('^2', '²')
      .replace('^3', '³')
      .replace('^n', 'ⁿ')
      .replace('2^n', '2ⁿ')
      .trim();

    const exact = growthModels.find(
      (m) =>
        m.label.toLowerCase() === s.toLowerCase() ||
        m.id === s.toLowerCase() ||
        m.name.toLowerCase() === s.toLowerCase(),
    );
    if (exact) return exact;

    const lower = s.toLowerCase();
    if (lower.includes('2ⁿ') || lower.includes('2^n') || lower.includes('exponential')) {
      return growthModels.find((m) => m.id === 'exponential')!;
    }
    if (lower.includes('³') || lower.includes('^3') || lower.includes('cubic')) {
      return growthModels.find((m) => m.id === 'cubic')!;
    }
    if (
      lower.includes('²') ||
      lower.includes('^2') ||
      lower.includes('·') ||
      lower.includes('n*m') ||
      lower.includes('m · n') ||
      lower.includes('quadratic')
    ) {
      return growthModels.find((m) => m.id === 'quadratic')!;
    }
    if (
      lower.includes('log') &&
      (lower.includes('n log') || lower.includes('e log') || lower.includes('v log'))
    ) {
      return growthModels.find((m) => m.id === 'linearithmic')!;
    }
    if (lower.includes('log')) {
      return growthModels.find((m) => m.id === 'logarithmic')!;
    }
    if (lower === 'o(1)' || lower.includes('constant')) {
      return growthModels.find((m) => m.id === 'constant')!;
    }
    return growthModels[2];
  };

  const resolvedCandidate = candidateComplexity ?? candidateTime;
  const candidateModel = findMatchingGrowthModel(resolvedCandidate);
  const targetLabel = mainComplexity ?? candidateComplexity ?? candidateTime ?? 'O(n)';
  const mainModel = findMatchingGrowthModel(targetLabel);

  const defaultScales: Record<GrowthId, number> = {
    constant: 10,
    logarithmic: 24,
    linear: 45,
    linearithmic: 65,
    quadratic: 90,
    cubic: 180,
    exponential: 350,
  };

  const references = growthModels.map((model) => ({
    ...model,
    fit: hasSamples
      ? fitGrowthModel(model.id, samples, false)
      : {
          id: model.id,
          label: model.label,
          scale: defaultScales[model.id] ?? 50,
          intercept: 0,
          anchor: maxN,
          error: 0,
        },
  }));
  const fitMaxN =
    fit && typeof fit.maxN === 'number' && Number.isFinite(fit.maxN) && fit.maxN >= 1
      ? fit.maxN
      : maxN;
  const safeFit = fit
    ? {
        ...fit,
        id: fit.id as GrowthId,
        error: fit.error ?? 0,
        scale:
          typeof fit.scale === 'number' && Number.isFinite(fit.scale)
            ? fit.scale
            : (defaultScales[fit.id as GrowthId] ?? 50),
        intercept:
          typeof fit.intercept === 'number' && Number.isFinite(fit.intercept) ? fit.intercept : 0,
        anchor:
          typeof fit.anchor === 'number' && Number.isFinite(fit.anchor) && fit.anchor >= 1
            ? fit.anchor
            : fitMaxN,
      }
    : null;

  const safePredict = (f: GrowthFit, n: number) => {
    try {
      const val = predictGrowth(f, n);
      return Number.isFinite(val) ? val : 0;
    } catch {
      return 0;
    }
  };

  const sizes = [
    ...new Set([
      ...(hasSamples ? samples.map((sample) => sample.n) : [1, 8, 16, 32, 64]),
      ...Array.from({ length: 65 }, (_, i) => minN + ((maxN - minN) * i) / 64),
    ]),
  ].sort((a, b) => a - b);
  const rows = sizes.map((n) => ({
    n,
    measured: hasSamples ? samples.find((sample) => sample.n === n)?.steps : undefined,
    best: safeFit ? safePredict(safeFit, n) : null,
    references: references.map((reference) => safePredict(reference.fit, n)),
  }));
  const clipped = rows.some(
    (row) =>
      row.references.some((value) => value > ceiling) || (row.best !== null && row.best > ceiling),
  );
  const x = (n: number) => 64 + ((n - minN) / Math.max(1, maxN - minN)) * 440;
  const y = (steps: number) =>
    224 -
    (logarithmic
      ? Math.log10(Math.max(1, Math.min(ceiling, steps))) / Math.log10(ceiling)
      : Math.min(ceiling, steps) / ceiling) *
      192;
  const points = (values: number[]) =>
    values.map((value, i) => `${x(rows[i].n).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
  const display = (value: number) =>
    value !== 0 && Math.abs(value) < 0.001
      ? value.toExponential(3)
      : value.toLocaleString('en-US', { maximumSignificantDigits: 4 });
  const ticks = logarithmic ? [1, Math.sqrt(ceiling), ceiling] : [0, ceiling / 2, ceiling];

  const mainColor = type === 'space' ? 'var(--space-signal)' : 'var(--time-signal)';

  const showReference = (id: GrowthId, n = (minN + maxN) / 2) => {
    const reference = references.find((item) => item.id === id);
    if (!reference) return;
    const size = Math.max(minN, Math.min(maxN, Math.round(n)));
    const val = safePredict(reference.fit, size);
    setHoveredState({
      id,
      label: reference.label,
      name: reference.name,
      x: x(size),
      y: y(val),
      n: size,
      val,
      isMain: id === mainModel.id,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 540;
    const svgY = ((e.clientY - rect.top) / rect.height) * 272;
    if (svgX < 64 || svgX > 504 || svgY < 20 || svgY > 240) {
      setHoveredState(null);
      return;
    }
    const exactN = minN + ((svgX - 64) / 440) * (maxN - minN);
    const currN = Math.max(minN, Math.min(maxN, Math.round(exactN)));
    let closest = null;
    let minDiff = Infinity;

    for (const ref of references) {
      const val = safePredict(ref.fit, currN);
      const lineY = y(val);
      const diff = Math.abs(lineY - svgY);
      if (diff < minDiff) {
        minDiff = diff;
        closest = {
          id: ref.id,
          label: ref.label,
          name: ref.name,
          x: x(currN),
          y: lineY,
          n: currN,
          val,
          isMain: ref.id === mainModel?.id,
        };
      }
    }
    if (safeFit) {
      const val = safePredict(safeFit, currN);
      const lineY = y(val);
      const diff = Math.abs(lineY - svgY);
      if (diff < minDiff) {
        closest = {
          id: safeFit.id,
          label: safeFit.label,
          name: 'Estimated best fit',
          x: x(currN),
          y: lineY,
          n: currN,
          val,
          isMain: safeFit.id === mainModel?.id,
        };
      }
    }
    setHoveredState(closest);
  };

  const handlePointerLeave = () => {
    setHoveredState(null);
  };

  return (
    <div
      className={`complexity-comparison ${type === 'space' ? 'space-complexity-comparison' : ''}`}
    >
      <div className="chart-topline">
        <span className="mono dim">{type === 'space' ? 'MEMORY / UNITS' : 'WORK / STEPS'}</span>
        <label className="chart-toggle">
          <input
            type="checkbox"
            aria-label={type === 'space' ? 'Logarithmic space axis' : 'Logarithmic y-axis'}
            checked={logarithmic}
            onChange={(event) => setLogarithmic(event.target.checked)}
          />
          Log scale
        </label>
      </div>
      <div className="chart-wrapper" style={{ position: 'relative' }}>
        <svg
          className="step-chart interactive-complexity-chart"
          viewBox="0 0 540 272"
          role="img"
          aria-label={
            type === 'space'
              ? 'Real function memory scaling versus input size'
              : 'Real function steps versus input size'
          }
          aria-describedby={descriptionId}
          data-y-scale={logarithmic ? 'log' : 'linear'}
          tabIndex={0}
          onFocus={() => showReference(mainModel.id)}
          onBlur={handlePointerLeave}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setHoveredState(null);
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault();
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            showReference(
              (hoveredState?.id as GrowthId) || mainModel.id,
              (hoveredState?.n ?? minN) + direction * Math.max(1, Math.round((maxN - minN) / 16)),
            );
          }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <title>
            {type === 'space'
              ? 'Big-O Space complexity curves and sampled memory units'
              : 'Big-O complexity curves and real captured function steps'}
          </title>
          <desc>
            Dots are real measurements. Patterned lines compare growth. A solid line is a guide; a
            dashed fit appears after measurement. Use left and right arrows to inspect a line.
          </desc>
          {ticks.map((tick, index) => (
            <g key={index}>
              <line x1="64" y1={y(tick)} x2="504" y2={y(tick)} />
              <text x="58" y={y(tick) + 4} textAnchor="end">
                {display(tick)}
              </text>
            </g>
          ))}
          <line x1="64" y1="32" x2="64" y2="224" />
          <text x="64" y="16">
            {type === 'space'
              ? logarithmic
                ? 'memory units · log₁₀ scale'
                : 'memory units · linear scale'
              : logarithmic
                ? 'steps · log₁₀ scale'
                : 'steps · linear scale'}
          </text>
          <text x="240" y="265">
            input size n
          </text>

          {/* Reference curves */}
          {references.map((reference, index) => {
            const isMain = mainModel?.id === reference.id;
            const isCandidate = candidateModel?.id === reference.id && !fit && !isMain;
            const isHovered = hoveredState?.id === reference.id;
            const strokeOpacity = hoveredState
              ? isHovered
                ? 1
                : isMain
                  ? 0.65
                  : 0.2
              : isMain
                ? 1
                : 0.45;

            return (
              <g key={reference.id}>
                <polyline
                  className={`reference-curve ${isCandidate ? 'candidate-curve' : ''} ${isMain ? 'main-problem-curve' : ''}`}
                  data-reference={reference.id}
                  data-candidate={isCandidate ? 'true' : undefined}
                  data-main={isMain ? 'true' : undefined}
                  data-hovered={isHovered ? 'true' : undefined}
                  fill="none"
                  stroke={isMain ? mainColor : undefined}
                  strokeDasharray={isMain ? undefined : reference.dash}
                  strokeWidth={isHovered ? 2 : isMain ? 1.8 : 1}
                  strokeOpacity={strokeOpacity}
                  style={{
                    transition: 'stroke-width 0.2s ease, stroke-opacity 0.2s ease',
                  }}
                  points={points(rows.map((row) => row.references[index]))}
                >
                  <title>
                    {reference.label}{' '}
                    {isMain
                      ? `${type === 'space' ? 'Memory' : 'Work'} guide, not a measured result`
                      : isCandidate
                        ? 'candidate prediction'
                        : 'scaled reference'}
                  </title>
                </polyline>

                {isMain && (
                  <g className="main-curve-end-marker" aria-hidden="true">
                    <text
                      x="501"
                      y={Math.max(23, y(safePredict(reference.fit, maxN)) - 8)}
                      textAnchor="end"
                    >
                      {mainComplexity || reference.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Best Fit Curve */}
          {fit && (
            <polyline
              className="best-fit-curve"
              data-best-fit={fit.id}
              fill="none"
              strokeWidth={hoveredState?.id === fit.id ? 2.5 : 2}
              strokeOpacity={hoveredState ? (hoveredState.id === fit.id ? 1 : 0.35) : 1}
              strokeDasharray="7 3"
              points={points(rows.map((row) => row.best!))}
            >
              <title>Estimated best fit: {fit.label}</title>
            </polyline>
          )}

          {/* Measured Points */}
          {hasSamples &&
            samples.map((sample) => (
              <g key={sample.n}>
                <circle className="measured-point" cx={x(sample.n)} cy={y(sample.steps)} r="3.2">
                  <title>
                    Size {sample.n}: {sample.steps} captured {unitLabel}
                  </title>
                </circle>
                <text x={x(sample.n)} y="244" textAnchor="middle">
                  {sample.n}
                </text>
              </g>
            ))}

          {/* Hover Hairline and Tooltip under Cursor */}
          {hoveredState && (
            <g className="chart-hover-overlay" aria-hidden="true" pointerEvents="none">
              <line
                x1={hoveredState.x}
                y1="32"
                x2={hoveredState.x}
                y2="224"
                stroke={hoveredState.isMain ? mainColor : 'var(--muted)'}
                strokeDasharray="2 3"
                strokeWidth="1.2"
                opacity="0.75"
              />
              <circle className="chart-hover-point" cx={hoveredState.x} cy={hoveredState.y} r="4" />
              <g
                transform={`translate(${Math.max(68, Math.min(364, hoveredState.x - 70))}, ${Math.max(
                  28,
                  Math.min(180, hoveredState.y - 48),
                )})`}
              >
                <rect
                  width="168"
                  height="42"
                  rx="1"
                  fill="var(--surface-raised, #1b1b1a)"
                  stroke={hoveredState.isMain ? mainColor : 'var(--border, #343432)'}
                  strokeWidth="1"
                />
                <text
                  x="8"
                  y="16"
                  fill={hoveredState.isMain ? mainColor : 'var(--fg, #f4f4f2)'}
                  fontSize="11"
                  className="chart-tooltip-label"
                  fontFamily="var(--font-ui, sans-serif)"
                >
                  {hoveredState.label} ·{' '}
                  {hoveredState.name === 'Estimated best fit'
                    ? 'measured fit'
                    : hoveredState.isMain
                      ? 'guide'
                      : 'comparison'}
                </text>
                <text
                  x="8"
                  y="32"
                  fill="var(--muted, #93938b)"
                  fontSize="9.5"
                  fontFamily="var(--font-code, monospace)"
                >
                  n {hoveredState.n} · {display(hoveredState.val)}{' '}
                  {type === 'space' ? 'units' : 'steps'}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      <ul className="curve-legend" aria-label="Chart series">
        {mainModel && (
          <li
            className={`main-problem-legend-pill ${type === 'space' ? 'space-legend-pill' : 'time-legend-pill'}`}
          >
            <strong>Guide {mainComplexity || mainModel.label}</strong>
          </li>
        )}
        {hasSamples && (
          <li>
            <span className="measured-marker" aria-hidden="true">
              ●
            </span>
            Measured points
          </li>
        )}
        {fit && (
          <li>
            <svg viewBox="0 0 44 12" aria-hidden="true">
              <line className="best-fit-curve" x1="0" x2="44" y1="6" y2="6" />
            </svg>
            Measured fit: {fit.label} · dashed
          </li>
        )}
        {candidateModel && !fit && candidateModel.id !== mainModel.id && (
          <li className="candidate-legend-item">
            <svg viewBox="0 0 44 12" aria-hidden="true">
              <line
                className="reference-curve candidate-curve"
                x1="0"
                x2="44"
                y1="6"
                y2="6"
                strokeDasharray={candidateModel.dash}
                strokeWidth="2.5"
              />
            </svg>
            <strong>Candidate: {candidateModel.label}</strong>
          </li>
        )}
        {references.map((reference) => (
          <li
            key={reference.id}
            onPointerEnter={() => showReference(reference.id)}
            onPointerLeave={() => setHoveredState(null)}
          >
            <button
              type="button"
              onFocus={() => showReference(reference.id)}
              onBlur={handlePointerLeave}
              onClick={() => showReference(reference.id)}
              aria-label={`Inspect ${reference.label} reference`}
            >
              <svg viewBox="0 0 44 12" aria-hidden="true">
                <line
                  className="reference-curve"
                  x1="0"
                  x2="44"
                  y1="6"
                  y2="6"
                  strokeDasharray={reference.dash}
                  stroke={reference.id === mainModel?.id ? mainColor : undefined}
                  strokeWidth={reference.id === mainModel?.id ? 2.8 : 1.5}
                />
              </svg>
              {reference.label}
            </button>
          </li>
        ))}
      </ul>
      <p id={descriptionId}>
        {hasSamples
          ? 'Dots are real runs. Lines compare growth. A fit is an estimate, not proof.'
          : 'Guide curves only. Measure your code to add real points.'}
      </p>
      <details className="chart-details">
        <summary>Chart details</summary>
        <p>
          Reference curves are scaled to the measured series with non-negative least squares. The
          measured fit includes overhead. Focus a curve name or use arrow keys on the chart to
          inspect it.
        </p>
        <p>
          Drawing is clipped at {display(ceiling)} {unitLabel} to keep exponential growth bounded.{' '}
          {clipped ? 'Some curves reach this drawing limit. ' : ''}
          {logarithmic
            ? 'On the log axis, values below one step are drawn at one; the data table retains them.'
            : 'Use the log axis to compare growth across magnitudes.'}
        </p>
      </details>
      <div className="sr-only">
        <table>
          <caption>
            {type === 'space'
              ? 'Chart data: measured memory units and scaled curves'
              : 'Chart data: measured steps and scaled curves'}
          </caption>
          <thead>
            <tr>
              <th scope="col">Input size n</th>
              <th scope="col">{type === 'space' ? 'Measured memory units' : 'Measured steps'}</th>
              <th scope="col">Estimated best fit {fit?.label}</th>
              {references.map((reference) => (
                <th scope="col" key={reference.id}>
                  {reference.label} reference
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.n}>
                <th scope="row">{display(row.n)}</th>
                <td>{row.measured ?? 'Not sampled'}</td>
                <td>{row.best === null ? 'Not fitted' : display(row.best)}</td>
                {row.references.map((value, i) => (
                  <td key={i}>{display(value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ComplexityComparison({
  fit,
  staticTime = 'Unknown',
}: {
  fit?: (Partial<GrowthFit> & { id: string; label: string }) | null;
  staticTime?: string;
}) {
  const normalizedCandidate = staticTime
    .replace(' candidate', '')
    .replace('^2', '²')
    .replace('^3', '³');
  const candidateModel =
    growthModels.find(
      (item) =>
        item.label === normalizedCandidate ||
        item.id === normalizedCandidate.toLowerCase() ||
        (normalizedCandidate
          ? item.label.toLowerCase().includes(normalizedCandidate.toLowerCase())
          : false),
    ) ?? growthModels[2];
  const activeModelId = (fit ? fit.id : candidateModel.id) as GrowthId;

  return (
    <div>
      <dl className="complexity-facts complexity-sources">
        <div>
          <dt>Code estimate · Static</dt>
          <dd>{staticTime}</dd>
        </div>
        <div>
          <dt>Measured fit · Estimate</dt>
          <dd>{fit ? fit.label : <span className="dim">Not measured yet</span>}</dd>
        </div>
      </dl>
      <p>
        {fit
          ? staticComparison(staticTime, fit.id as GrowthId)
          : 'Run a measurement to compare this guide with your code.'}
      </p>
      <details className="chart-details">
        <summary>Compare larger inputs</summary>
        <p>
          Rough operation counts for this growth pattern and its neighbours. These compare growth,
          not waiting time or future runs of your code.
        </p>
        <div
          className="scale-table-scroll"
          role="region"
          aria-label="Scrollable Big-O scale table"
          tabIndex={0}
        >
          <table>
            <caption>Big-O scale comparison</caption>
            <thead>
              <tr>
                <th scope="col">Class</th>
                <th scope="col">Input n</th>
                <th scope="col">Approximate operations</th>
                <th scope="col">In plain English</th>
              </tr>
            </thead>
            <tbody>
              {neighboringModels(activeModelId).flatMap((model) =>
                [10, 1000, limits.measurementN].map((n) => {
                  const count = operationCount(model.id, n);
                  return (
                    <tr key={`${model.id}:${n}`}>
                      <th scope="row">
                        {model.label}
                        {model.id === activeModelId ? (fit ? ' · best fit' : ' · candidate') : ''}
                      </th>
                      <td>{n.toLocaleString('en-US')}</td>
                      <td className="mono">{count.notation}</td>
                      <td>{count.plainEnglish}</td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
        <p>
          “Effectively never finishes” means an impractical number of operations, not a timed
          result.
        </p>
      </details>
    </div>
  );
}
