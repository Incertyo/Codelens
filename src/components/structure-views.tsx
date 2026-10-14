'use client';
import { useId } from 'react';
import { useStore } from '@/lib/store';
import {
  detectStructures,
  objectFields,
  type Structure,
  type StructureNode,
} from '@/lib/structures';
import { displayValue, type Step, type Value } from '@/lib/trace';
import { DiagramViewport } from './diagram-viewport';
const label = (v: Value, step?: Step, language: string = 'python') =>
  typeof v === 'string' ? v : displayValue(v, step?.heap, language);
function Diagram({
  kind,
  nodes,
  step,
  previous,
}: {
  kind: string;
  nodes: StructureNode[];
  step: Step;
  previous?: Step;
}) {
  const marker = useId().replaceAll(':', '');
  const language = useStore((s) => s.language);
  const positions = new Map<string, { x: number; y: number }>();
  if (kind === 'binary-tree' || kind === 'heap') {
    const parents = new Set(nodes.flatMap((n) => n.links.map((l) => l.target)));
    const root = nodes.find((n) => !parents.has(n.id)) ?? nodes[0];
    const seen = new Set<string>();
    let leaf = 0;
    const place = (id: string, depth: number): number => {
      if (seen.has(id)) return positions.get(id)?.x ?? 50;
      seen.add(id);
      const targets = (nodes.find((n) => n.id === id)?.links ?? []).filter(
        (link) => !seen.has(link.target) && nodes.some((n) => n.id === link.target),
      );
      const x = targets.length
        ? targets.map((link) => place(link.target, depth + 1)).reduce((a, b) => a + b, 0) /
          targets.length
        : 50 + leaf++ * 85;
      positions.set(id, { x, y: 35 + depth * 68 });
      return x;
    };
    if (root) place(root.id, 0);
    nodes.filter((n) => !seen.has(n.id)).forEach((n) => place(n.id, 0));
  } else if (kind === 'linked-list')
    nodes.forEach((n, i) =>
      positions.set(n.id, { x: 42 + (i % 5) * 95, y: 40 + Math.floor(i / 5) * 80 }),
    );
  else if (nodes.length > 12)
    nodes.forEach((n, i) => {
      const columns = Math.ceil(Math.sqrt(nodes.length));
      positions.set(n.id, { x: 55 + (i % columns) * 105, y: 45 + Math.floor(i / columns) * 90 });
    });
  else
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      const radius = Math.max(85, nodes.length * 16);
      positions.set(n.id, {
        x: radius + 60 + Math.cos(angle) * radius,
        y: radius + 45 + Math.sin(angle) * radius,
      });
    });
  const height = Math.max(130, ...[...positions.values()].map((p) => p.y + 40));
  const width = Math.max(140, ...[...positions.values()].map((p) => p.x + 80));
  const vars = { ...step.globals, ...step.callStack.at(-1)?.locals };
  return (
    <DiagramViewport width={width} height={height} label={`${kind} diagram`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${kind.replaceAll('-', ' ')} diagram with ${nodes.length} nodes`}
      >
        <defs>
          <marker
            id={marker}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
          </marker>
        </defs>
        {nodes.flatMap((node) =>
          node.links.map((link, i) => {
            const from = positions.get(node.id),
              to = positions.get(link.target);
            if (!from || !to) return null;
            const dx = to.x - from.x,
              dy = to.y - from.y;
            const scale = Math.max(Math.abs(dx) / 25, Math.abs(dy) / 20) || 1;
            const ax = dx / scale,
              ay = dy / scale;
            return (
              <g key={`${node.id}-${link.target}-${i}`}>
                {node.id === link.target ? (
                  <path
                    d={`M ${from.x + 25} ${from.y - 12} C ${from.x + 65} ${from.y - 55},${from.x + 65} ${from.y + 30},${from.x + 25} ${from.y + 12}`}
                    fill="none"
                    stroke="var(--muted)"
                    markerEnd={`url(#${marker})`}
                  />
                ) : (
                  <line
                    x1={from.x + ax}
                    y1={from.y + ay}
                    x2={to.x - ax}
                    y2={to.y - ay}
                    stroke="var(--muted)"
                    markerEnd={`url(#${marker})`}
                  />
                )}
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8} className="edge-label">
                  {link.label === 'left' ? 'L' : link.label === 'right' ? 'R' : link.label}
                </text>
              </g>
            );
          }),
        )}
        {nodes.map((node) => {
          const p = positions.get(node.id)!;
          const changed =
            !!previous &&
            !!step.heap[node.id] &&
            JSON.stringify(step.heap[node.id]) !== JSON.stringify(previous.heap[node.id]);
          const pointers = Object.entries(vars)
            .filter(([, v]) => v && typeof v === 'object' && v.ref === node.id)
            .map(([name]) => name);
          return (
            <g key={node.id}>
              <rect
                x={p.x - 25}
                y={p.y - 20}
                width="50"
                height="38"
                fill={changed ? 'var(--accent)' : 'var(--surface)'}
                stroke={changed ? 'var(--code-active)' : 'var(--border)'}
                strokeWidth={changed ? 2 : 1}
              />
              <text
                x={p.x}
                y={p.y + 3}
                textAnchor="middle"
                className="node-value"
                fill={changed ? 'var(--ink)' : 'var(--fg)'}
              >
                {label(node.label, step, language).slice(0, 8)}
                {changed ? ' ↗' : ''}
              </text>
              <text x={p.x} y={p.y + 31} textAnchor="middle" className="edge-label">
                {pointers.length ? pointers.join(', ') : node.id}
              </text>
            </g>
          );
        })}
      </svg>
    </DiagramViewport>
  );
}
export function StructureView({
  structure,
  step,
  previous,
}: {
  structure: Structure;
  step: Step;
  previous?: Step;
}) {
  const { kind, names, ref, object } = structure;
  const language = useStore((s) => s.language);
  let nodes = structure.nodes;
  if (kind === 'heap')
    nodes = (object.items ?? []).map((value, i) => ({
      id: String(i),
      label: value,
      links: [2 * i + 1, 2 * i + 2]
        .filter((j) => j < (object.items?.length ?? 0))
        .map((j, index) => ({ target: String(j), label: index ? 'R' : 'L' })),
    }));
  return (
    <div className="structure-view" data-testid={`structure-${kind}`}>
      <div className="data-label mono">
        {names.join(' / ')}{' '}
        <span className="dim">
          / {kind.replaceAll('-', ' ')} · @{ref}
        </span>
      </div>
      {nodes ? (
        <Diagram kind={kind} nodes={nodes} step={step} previous={previous} />
      ) : kind === 'map' ? (
        <table className="map-table">
          <caption className="sr-only">{names[0]} key to value table</caption>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {(object.entries ?? Object.entries(objectFields(object))).map(([k, v], i) => (
              <tr key={i}>
                <td className="mono">{label(k, step, language)}</td>
                <td className="mono">→ {displayValue(v, step.heap, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <div
            className={`collection-cells ${kind === 'stack' ? 'stack-cells' : ''}`}
            tabIndex={0}
            data-native-scroll
            role="list"
            aria-label={`${names[0]} ${kind}`}
          >
            {(object.items ?? []).map((v, i) => (
              <div className="array-cell mono" key={i} role="listitem">
                {label(v, step, language)}
              </div>
            ))}
            {!object.items?.length && <span className="mono dim">empty</span>}
          </div>
          {kind === 'queue' && (
            <p className="mono dim collection-direction">
              ↑ FRONT / FIRST OUT <span>BACK / LAST IN ↑</span>
            </p>
          )}
          {kind === 'stack' && (
            <p className="mono dim collection-direction">↑ TOP / LAST IN, FIRST OUT</p>
          )}
        </>
      )}
      {object.truncated && <p className="mono dim">Additional entries truncated.</p>}
    </div>
  );
}
export function StructureViews({ step, previous }: { step: Step; previous?: Step }) {
  const structures = detectStructures(step)
    .filter((s) => !['array', 'matrix'].includes(s.kind))
    .slice(0, 6);
  if (!structures.length) return null;
  return (
    <div className="advanced-structures">
      {structures.map((s) => (
        <StructureView key={s.ref} structure={s} step={step} previous={previous} />
      ))}
    </div>
  );
}
