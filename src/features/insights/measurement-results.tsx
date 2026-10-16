'use client';
import { MEASUREMENT_MEMORY_DEFINITION, MEASUREMENT_SAMPLING_NOTE, type MeasurementSeries } from "@/features/runner/public/measurement";

export function MeasurementDefinition() {
  return (
    <details className="chart-details">
      <summary>How we count</summary>
      <p>
        Time counts executed line events inside user functions, including called helpers, and
        excludes module and generated driver events. It does not measure wall-clock time.
        Imported/native function internals are not traced.
      </p>
      <p>{MEASUREMENT_MEMORY_DEFINITION}</p>
      <p>{MEASUREMENT_SAMPLING_NOTE}</p>
      <p>
        Each size has a separate budget of 3,000,000 events or 10 seconds. These safety clocks are
        not performance measurements. Budget-exceeded, partial and failed sizes are never fitted. At
        least four complete positive points are required; fewer than six points or a best/runner-up
        RMS error gap below two percentage points is inconclusive.
      </p>
    </details>
  );
}

export function MeasurementResults({ result }: { result: MeasurementSeries | null }) {
  if (!result) return null;
  return (
    <details className="chart-details">
      <summary>View measurement numbers</summary>
      <p>
        {result.space
          ? `Extra memory: estimated ${result.space.label} up to input size ${result.space.maxN}${result.space.inconclusive ? ' · not enough evidence to choose confidently' : ''}. Fit error: ${(result.space.error * 100).toFixed(1)}%. ${result.space.alternatives}`
          : 'We need at least four complete samples to estimate memory growth.'}
      </p>
      <div
        className="scale-table-scroll"
        role="region"
        aria-label="Scrollable measurement counters"
        tabIndex={0}
      >
        <table>
          <caption>Snapshot-free measurement counters</caption>
          <thead>
            <tr>
              <th scope="col">Size</th>
              <th scope="col">Status</th>
              <th scope="col">Line events</th>
              <th scope="col">Total peak units</th>
              <th scope="col">Input units</th>
              <th scope="col">Auxiliary peak units</th>
            </tr>
          </thead>
          <tbody>
            {result.sizes.map((size) => (
              <tr key={size.n}>
                <th scope="row">{size.n}</th>
                <td>
                  {size.status}
                  {size.reason ? `: ${size.reason}` : ''}
                </td>
                <td>{size.lineEvents ?? 'Unavailable'}</td>
                <td>{size.totalPeak ?? 'Unavailable'}</td>
                <td>{size.inputUnits ?? 'Unavailable'}</td>
                <td>{size.auxiliaryPeak ?? 'Unavailable'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
