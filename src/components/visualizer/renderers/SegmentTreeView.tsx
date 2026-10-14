'use client';
import type { SegmentModel } from '@/lib/visualizer/detectors';
import { ViewFrame } from './shared';
import { DiagramViewport } from '../../diagram-viewport';
export function SegmentTreeView({ model }: { model: SegmentModel }) {
  const width = 640,
    span = Math.max(1, ...model.rangeMap.map((r) => r.right + 1));
  const height = Math.max(100, model.rangeMap.length * 34 + 24);
  return (
    <ViewFrame model={model} extra={<span className="mono dim"> / {model.variant}</span>}>
      <DiagramViewport width={width} height={height} label={`${model.name} range tree`}>
        <svg
          className="algo-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${model.name} ${model.variant} range hierarchy`}
        >
          {model.rangeMap.map((range, i) => {
            const x = 32 + (range.left / span) * 570,
              y = 12 + i * 34,
              w = Math.max(35, ((range.right - range.left + 1) / span) * 570),
              active = range.index === model.activeIndex;
            return (
              <g key={range.index}>
                <rect
                  className={`algo-node ${active ? 'active' : ''}`}
                  x={x}
                  y={y}
                  width={w}
                  height="27"
                />
                <text className={active ? 'on-accent' : ''} x={x + 5} y={y + 18}>
                  [{range.left},{range.right}] = {range.val}
                </text>
                <title>{`tree[${range.index}]${range.parent !== undefined ? ` → parent[${range.parent}]` : ''}`}</title>
              </g>
            );
          })}
        </svg>
      </DiagramViewport>
      <table className="map-table mono">
        <caption>
          {model.variant === 'fenwick' ? 'Fenwick low-bit jumps' : 'Segment index ranges'}
        </caption>
        <thead>
          <tr>
            <th>index</th>
            <th>range</th>
            <th>value</th>
            <th>{model.variant === 'fenwick' ? 'next update' : 'parent'}</th>
          </tr>
        </thead>
        <tbody>
          {model.rangeMap.map((r) => (
            <tr key={r.index}>
              <td>{r.index}</td>
              <td>
                {r.left}…{r.right}
              </td>
              <td>{r.val}</td>
              <td>{r.parent ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ViewFrame>
  );
}
