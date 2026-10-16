'use client';
import { motion } from 'framer-motion';
import { useStore } from "@/features/workspace/public/store";
import { displayValue, type Step, type Value } from "@/shared/trace";
import type { SequenceModel, StringModel, VisualModel } from "@/features/visualizer/detectors";
import { SlidingWindowOverlay } from "./SlidingWindowOverlay";
export type ViewProps<T> = { model: T; step: Step; previous?: Step };
export function useFormat(step: Step) {
  const language = useStore((s) => s.language);
  return (v: Value) => (typeof v === 'string' ? v : displayValue(v, step.heap, language));
}
const aliases: Record<string, string> = { binary_heap: 'heap', set_pool: 'set', deque: 'queue' };
export function ViewFrame({
  model,
  children,
  extra,
}: {
  model: VisualModel;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <section
      className="algo-view"
      data-view={model.kind}
      data-testid={`structure-${aliases[model.kind] ?? model.kind}`}
      aria-label={`${model.name} ${model.kind.replaceAll('_', ' ')}`}
    >
      <div className="data-label mono">
        {model.name} <span className="dim">/ {model.kind.replaceAll('_', ' ')}</span>
        {extra}
      </div>
      <div
        className="algo-scroll"
        tabIndex={0}
        data-native-scroll
        role="region"
        aria-label={`${model.name} diagram`}
      >
        {children}
      </div>
      {model.truncated && (
        <p className="mono dim">Showing captured cells within the 80-cell limit.</p>
      )}
    </section>
  );
}
export function LinearCells({ model, step, previous }: ViewProps<SequenceModel | StringModel>) {
  const reduced = useStore((s) => s.reduced),
    format = useFormat(step);
  const values = model.kind === 'string_buffer' ? model.chars : model.elements;
  const previousValues = previous?.heap[model.id]?.items;
  return (
    <div
      className={`algo-linear ${model.window ? 'has-window' : ''}`}
      style={{ width: Math.max(1, values.length) * 56 }}
    >
      <div className="algo-cell-row" role="list" aria-label={`${model.name} indexed cells`}>
        {values.map((v, i) => (
          <div className="algo-column" key={i} role="listitem">
            <span className="mono dim">{i}</span>
            <div
              className={`algo-cell ${model.kind === 'sequence' ? 'array-cell' : ''} mono ${Object.values(model.activePointers).includes(i) ? 'pointed' : ''} ${previousValues && JSON.stringify(previousValues[i]) !== JSON.stringify(v) ? 'changed' : ''}`}
              data-index={i}
              data-testid={model.kind === 'string_buffer' ? 'character-cell' : 'sequence-cell'}
            >
              {v === ' ' ? '␣' : format(v)}
            </div>
          </div>
        ))}
        {!values.length && (
          <p role="listitem" className="mono dim">
            empty sequence
          </p>
        )}
      </div>
      {model.window && <SlidingWindowOverlay model={model.window} />}
      <div
        className="algo-pins"
        role="group"
        style={{ height: Math.max(26, Object.keys(model.activePointers).length * 19 + 8) }}
        aria-label="Index pointers"
      >
        {Object.entries(model.activePointers).map(([name, index], row) => (
          <motion.span
            className="algo-pin mono"
            key={name}
            data-pointer={name}
            data-index={index}
            initial={false}
            animate={{ x: index * 56, y: row * 19 }}
            transition={{ duration: reduced ? 0 : 0.16 }}
            aria-label={`${name} points to index ${index}${index === values.length ? ' (past end)' : ''}`}
          >
            ↑ {name}
            <span className="sr-only"> index {index}</span>
          </motion.span>
        ))}
      </div>
    </div>
  );
}
