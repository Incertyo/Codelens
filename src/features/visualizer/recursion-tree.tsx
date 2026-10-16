'use client';
import { useMemo } from 'react';
import { DiagramViewport, type DiagramBounds } from "./diagram-viewport";
import { useStore } from "@/features/workspace/public/store";
import { buildCallTree, type CallNode } from "@/features/visualizer/structures";
import { displayValue, type Value } from "@/shared/trace";
function layoutCalls(calls: CallNode[]) {
  const byId = new Map(calls.map((c) => [c.id, c]));
  const children = new Map<string, string[]>();
  const positions = new Map<string, { x: number; y: number }>();
  const seen = new Set<string>();
  let leaf = 0;
  calls.forEach((c) => {
    if (c.parent) children.set(c.parent, [...(children.get(c.parent) ?? []), c.id]);
  });
  const place = (id: string, depth: number): number => {
    if (seen.has(id)) return positions.get(id)?.x ?? 70;
    seen.add(id);
    const descendants = (children.get(id) ?? []).filter((child) => !seen.has(child));
    const x = descendants.length
      ? descendants.map((child) => place(child, depth + 1)).reduce((a, b) => a + b, 0) /
        descendants.length
      : 70 + leaf++ * 145;
    positions.set(id, { x, y: 35 + depth * 80 });
    return x;
  };
  calls.filter((c) => !c.parent || !byId.has(c.parent)).forEach((c) => place(c.id, 0));
  calls.filter((c) => !seen.has(c.id)).forEach((c) => place(c.id, 0));
  return {
    positions,
    byId,
    width: Math.max(450, leaf * 145),
    height: Math.max(140, ...[...positions.values()].map((p) => p.y + 55)),
  };
}
const label = (v: Value) => (typeof v === 'string' ? v : displayValue(v));
export function RecursionTree() {
  const result = useStore((s) => s.result),
    language = useStore((s) => s.language),
    cursor = useStore((s) => s.cursor);
  const step = result?.steps[cursor];
  const calls = useMemo(() => buildCallTree(result?.steps ?? [], language), [result, language]);
  const model = useMemo(() => layoutCalls(calls), [calls]);
  const recursive = useMemo(
    () => calls.some((c) => c.parent && model.byId.get(c.parent)?.func === c.func),
    [calls, model],
  );
  const current = step?.callStack.at(-1)?.id;
  if (!recursive) return null;
  const active = new Set(step?.callStack.map((f) => f.id));
  const begun = calls.filter((c) => c.start <= cursor);
  const draw = (viewport: DiagramBounds) => {
    const near = (x: number, y: number) =>
      x > viewport.left - 180 &&
      x < viewport.left + viewport.width + 180 &&
      y > viewport.top - 100 &&
      y < viewport.top + viewport.height + 100;
    const visible = begun.filter((c) => {
      const p = model.positions.get(c.id)!;
      return active.has(c.id) || near(p.x, p.y);
    });
    const edges = begun.filter((c) => {
      if (!c.parent) return false;
      const p = model.positions.get(c.id),
        parent = model.positions.get(c.parent);
      return (
        p &&
        parent &&
        Math.max(p.x, parent.x) >= viewport.left &&
        Math.min(p.x, parent.x) <= viewport.left + viewport.width &&
        Math.max(p.y, parent.y) >= viewport.top &&
        Math.min(p.y, parent.y) <= viewport.top + viewport.height
      );
    });
    return (
      <svg
        viewBox={`0 0 ${model.width} ${model.height}`}
        role="img"
        aria-label="Recursion call tree"
      >
        {edges.map((call) => {
          const p = model.positions.get(call.id)!,
            parent = model.positions.get(call.parent!)!;
          return (
            <line
              key={call.id}
              x1={parent.x}
              y1={parent.y + 24}
              x2={p.x}
              y2={p.y - 21}
              stroke="var(--muted)"
            />
          );
        })}
        {visible.map((call) => {
          const p = model.positions.get(call.id)!;
          const highlighted = current === call.id;
          const complete = call.end !== undefined && call.end <= cursor;
          const args = Object.entries(call.args)
            .filter(([name]) => name !== 'this')
            .slice(0, 2)
            .map(([k, v]) => `${k}=${call.argsLabels?.[k] ?? label(v)}`)
            .join(', ');
          return (
            <g key={call.id} data-call-id={call.id} data-current={highlighted}>
              <rect
                x={p.x - 62}
                y={p.y - 22}
                width="124"
                height="48"
                fill={highlighted ? 'var(--accent)' : 'var(--surface)'}
                stroke={active.has(call.id) ? 'var(--code-active)' : 'var(--muted)'}
                strokeWidth={active.has(call.id) ? 2 : 1}
              />
              <text
                x={p.x}
                y={p.y - 6}
                textAnchor="middle"
                className="call-node-label"
                fill={highlighted ? 'var(--ink)' : 'var(--fg)'}
              >
                {call.func === '<module>' ? 'program' : call.func}({args.slice(0, 22)})
              </text>
              <text
                x={p.x}
                y={p.y + 13}
                textAnchor="middle"
                className="call-node-label"
                fill={highlighted ? 'var(--ink)' : 'var(--muted)'}
              >
                {complete
                  ? `↳ ${call.returnedLabel ?? label(call.returned ?? null)}`
                  : highlighted
                    ? '▶ current call'
                    : '… pending'}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };
  return (
    <section className="recursion-panel">
      <div className="panel-title">
        <span>
          <span className="mono dim">06</span> RECURSION TREE
        </span>
        <span className="mono dim">
          {begun.length} / {calls.length} CALLS
        </span>
      </div>
      <DiagramViewport
        width={model.width}
        height={model.height}
        label="Recursion tree"
        focusPoint={current ? model.positions.get(current) : undefined}
      >
        {draw}
      </DiagramViewport>
      <p className="empty-note mono">
        Automatically fits readable calls. Zoom or pan to inspect large trees; the view follows the
        current frame.
      </p>
    </section>
  );
}
