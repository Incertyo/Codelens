'use client';
import { useId } from 'react';
import type { DPModel } from "@/features/visualizer/detectors";
import { useFormat, ViewFrame, type ViewProps } from "./shared";
export function DPDependencyGrid({ model, step }: ViewProps<DPModel>) {
  const marker = useId().replaceAll(':', ''),
    format = useFormat(step),
    cols = Math.max(1, ...model.cells.map((r) => r.length));
  const pos = (row: number, col: number) => ({ x: 36 + col * 56 + 24, y: 26 + row * 48 + 20 });
  const active = model.activeCell ? pos(...model.activeCell) : undefined;
  return (
    <ViewFrame
      model={model}
      extra={
        <span className="mono dim">
          {' '}
          / {model.rows} × {model.cols}
        </span>
      }
    >
      <div
        className="algo-dp"
        style={{ width: cols * 56 + 36, height: model.cells.length * 48 + 30 }}
      >
        <div className="algo-dp-table" role="table" aria-label={`${model.name} matrix`}>
          {model.cells.map((row, r) => (
            <div role="row" key={r} className="algo-dp-row">
              <span className="mono dim">{r}</span>
              {!row.length && (
                <span role="cell" className="mono dim">
                  empty row
                </span>
              )}
              {row.map((value, c) => {
                const current = model.activeCell?.[0] === r && model.activeCell[1] === c,
                  source = model.sourceCells.some(([sr, sc]) => sr === r && sc === c);
                return (
                  <div
                    role="cell"
                    key={c}
                    className={`algo-cell mono ${current ? 'pointed' : ''} ${source ? 'dependency-source' : ''}`}
                    data-cell={`${r},${c}`}
                    data-active={current}
                    title={`[${r}][${c}]${source ? ' prerequisite' : ''}`}
                  >
                    {format(value)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <svg
          className="algo-dp-arrows"
          width={cols * 56 + 36}
          height={model.cells.length * 48 + 30}
          role="img"
          aria-label="DP prerequisite arrows"
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {active &&
            model.sourceCells.map(([r, c], i) => {
              const p = pos(r, c);
              return (
                <path
                  key={i}
                  className="algo-dependency"
                  d={`M ${p.x + 23} ${p.y} Q ${p.x + 34} ${Math.min(p.y, active.y) - 22} ${active.x} ${active.y - 18}`}
                  fill="none"
                  markerEnd={`url(#${marker})`}
                  data-source={`${r},${c}`}
                />
              );
            })}
        </svg>
      </div>
      <p className="mono dim">Dashed cells = prerequisites / arrows point to the active cell.</p>
    </ViewFrame>
  );
}
