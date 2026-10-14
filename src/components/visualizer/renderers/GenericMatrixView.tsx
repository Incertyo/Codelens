'use client';
import { useStore } from '@/lib/store';
import { displayValue, type Step, type Value } from '@/lib/trace';
import { CELL_CAP, type LegacyModel } from '@/lib/visualizer/detectors';
import { ViewFrame } from './shared';
export function GenericMatrixView({ model, step }: { model: LegacyModel; step: Step }) {
  const language = useStore((s) => s.language);
  let remaining = CELL_CAP;
  const rows: { r: number; cells: Value[] }[] = [];
  for (const [r, v] of (model.structure.object.items ?? []).entries()) {
    if (!v || typeof v !== 'object' || remaining <= 0) continue;
    const cells = (step.heap[v.ref]?.items ?? []).slice(0, remaining);
    remaining -= cells.length;
    rows.push({ r, cells });
  }
  const total = (model.structure.object.items ?? []).reduce<number>(
    (n, v) => n + (v && typeof v === 'object' ? (step.heap[v.ref]?.items?.length ?? 0) : 0),
    0,
  );
  return (
    <ViewFrame model={{ ...model, truncated: total > CELL_CAP || model.truncated }}>
      <div className="matrix" role="table" aria-label={`${model.name} matrix`}>
        {rows.map(({ r, cells }) => (
          <div className="matrix-row" role="row" key={r}>
            <span className="matrix-index mono">{r}</span>
            {!cells.length && (
              <span role="cell" className="mono dim">
                empty row
              </span>
            )}
            {cells.map((cell, c) => (
              <span className="matrix-cell mono" role="cell" title={`[${r}][${c}]`} key={c}>
                {displayValue(cell, step.heap, language)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </ViewFrame>
  );
}
