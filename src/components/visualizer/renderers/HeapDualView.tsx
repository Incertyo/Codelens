'use client';
import type { HeapModel } from '@/lib/visualizer/detectors';
import { useFormat, ViewFrame, type ViewProps } from './shared';
import { DiagramViewport } from '../../diagram-viewport';
export function HeapDualView({ model, step }: ViewProps<HeapModel>) {
  const format = useFormat(step),
    n = model.elements.length,
    depth = Math.floor(Math.log2(Math.max(1, n))),
    width = Math.max(360, Math.pow(2, depth) * 64),
    height = (depth + 1) * 78;
  const pos = (i: number) => {
    const level = Math.floor(Math.log2(i + 1)),
      offset = i - (2 ** level - 1);
    return { x: ((offset + 0.5) * width) / 2 ** level, y: level * 78 + 32 };
  };
  return (
    <ViewFrame model={model} extra={<span className="mono dim"> / {model.heapType} heap</span>}>
      <DiagramViewport width={width} height={height} label={`${model.name} heap`}>
        <svg
          className="algo-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${model.name} complete binary heap`}
          data-testid="heap-tree"
        >
          {[...model.parentChildMap].flatMap(([i, children]) =>
            [children.left, children.right]
              .filter((j) => j !== undefined)
              .map((j) => {
                const a = pos(i),
                  b = pos(j!);
                return (
                  <line
                    className="algo-edge"
                    key={`${i}:${j}`}
                    x1={a.x}
                    y1={a.y + 24}
                    x2={b.x}
                    y2={b.y - 24}
                  />
                );
              }),
          )}
          {model.elements.map((v, i) => {
            const p = pos(i);
            return (
              <g key={i} data-heap-index={i}>
                <circle
                  className={`algo-node ${i === 0 ? 'active' : ''}`}
                  cx={p.x}
                  cy={p.y}
                  r="24"
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  className={i === 0 ? 'on-accent' : ''}
                >
                  {format(v).slice(0, 8)}
                </text>
                <text x={p.x} y={p.y + 40} textAnchor="middle">
                  [{i}]
                </text>
                <title>{`${i}: ${format(v)}`}</title>
              </g>
            );
          })}
        </svg>
      </DiagramViewport>
      <div
        className="algo-heap-array"
        data-testid="heap-array"
        role="list"
        aria-label={`${model.name} indexed heap array`}
      >
        {!model.elements.length && (
          <span role="listitem" className="mono dim">
            empty heap
          </span>
        )}
        {model.elements.map((v, i) => (
          <div className="algo-column" role="listitem" key={i}>
            <span className="mono dim">{i}</span>
            <div className={`algo-cell mono ${i === 0 ? 'pointed' : ''}`} data-heap-index={i}>
              {format(v)}
            </div>
            <span className="mono dim">
              {model.parentChildMap.get(i)?.left !== undefined
                ? `↳ ${2 * i + 1}${2 * i + 2 < n ? `,${2 * i + 2}` : ''}`
                : 'leaf'}
            </span>
          </div>
        ))}
      </div>
      <p className="mono dim">i → left 2i + 1 / right 2i + 2</p>
      {!n && <p className="mono dim">empty heap</p>}
    </ViewFrame>
  );
}
