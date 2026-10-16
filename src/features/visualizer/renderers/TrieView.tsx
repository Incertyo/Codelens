'use client';
import type { TrieModel } from "@/features/visualizer/detectors";
import { ViewFrame } from "./shared";
import { DiagramViewport } from "../diagram-viewport";
export function TrieView({ model }: { model: TrieModel }) {
  const positions = new Map<string, { x: number; y: number }>(),
    seen = new Set<string>();
  let leaf = 0;
  const place = (id: string, depth: number): number => {
    if (seen.has(id)) return positions.get(id)?.x ?? 36;
    seen.add(id);
    const children = Object.values(model.nodes.get(id)?.children ?? {}).filter(
      (child) => model.nodes.has(child) && !seen.has(child),
    );
    const x = children.length
      ? children.map((c) => place(c, depth + 1)).reduce((a, b) => a + b, 0) / children.length
      : 36 + leaf++ * 70;
    positions.set(id, { x, y: 36 + depth * 78 });
    return x;
  };
  place(model.rootId, 0);
  const active = new Set(model.activePath),
    points = [...positions.values()];
  const width = Math.max(140, ...points.map((p) => p.x + 40));
  const height = Math.max(100, ...points.map((p) => p.y + 40));
  return (
    <ViewFrame model={model}>
      <DiagramViewport width={width} height={height} label={`${model.name} trie`}>
        <svg
          className="algo-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${model.name} prefix trie`}
        >
          {[...model.nodes].flatMap(([id, node]) =>
            Object.entries(node.children).map(([char, child]) => {
              const a = positions.get(id),
                b = positions.get(child);
              return a && b ? (
                <line
                  className={`algo-edge ${active.has(child) ? 'active-edge' : ''}`}
                  key={`${id}:${char}`}
                  x1={a.x}
                  x2={b.x}
                  y1={a.y + 24}
                  y2={b.y - 24}
                />
              ) : null;
            }),
          )}
          {[...model.nodes].map(([id, node]) => {
            const p = positions.get(id);
            return p ? (
              <g key={id} data-terminal={node.isTerminal} data-active={active.has(id)}>
                <circle
                  className={`algo-node ${active.has(id) ? 'active' : ''}`}
                  cx={p.x}
                  cy={p.y}
                  r="23"
                />
                {node.isTerminal && (
                  <>
                    <circle className="algo-terminal" cx={p.x} cy={p.y} r="28" />
                    <circle className="algo-terminal-signal" cx={p.x} cy={p.y} r="26" />
                  </>
                )}
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  className={active.has(id) ? 'on-accent' : ''}
                >
                  {node.char}
                </text>
                <title>{`${node.char}${node.isTerminal ? ' / word end' : ''}`}</title>
              </g>
            ) : null;
          })}
        </svg>
      </DiagramViewport>
      <p className="mono dim">Double ring = word end / highlighted path = live node references</p>
    </ViewFrame>
  );
}
