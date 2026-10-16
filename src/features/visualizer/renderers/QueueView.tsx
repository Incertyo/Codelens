'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from "@/features/workspace/public/store";
import type { QueueModel } from "@/features/visualizer/detectors";
import { useFormat, ViewFrame, type ViewProps } from "./shared";
export function QueueView({ model, step }: ViewProps<QueueModel>) {
  const format = useFormat(step),
    reduced = useStore((s) => s.reduced);
  const keys = new Map<string, number>();
  return (
    <ViewFrame model={model}>
      <div className="algo-pipe" role="list" aria-label={`${model.name} front to rear`}>
        <AnimatePresence initial={false}>
          {model.elements.map((v, i) => {
            const key = JSON.stringify(v),
              count = keys.get(key) ?? 0;
            keys.set(key, count + 1);
            return (
              <motion.div
                className="algo-cell mono"
                role="listitem"
                key={`${key}:${count}`}
                data-index={i}
                layout={!reduced}
                initial={{ x: reduced ? 0 : 50, opacity: reduced ? 1 : 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: reduced ? 0 : -50, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
              >
                {format(v)}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!model.elements.length && (
          <span role="listitem" className="mono dim">
            empty queue
          </span>
        )}
      </div>
      <p className="algo-direction mono">
        <span>↑ FRONT {model.frontIndex}</span>
        <span>
          {model.isCircular ? 'CIRCULAR / ' : ''}REAR {model.rearIndex} ↑
        </span>
      </p>
      {model.kind === 'deque' && (
        <p className="mono dim">Deque: insertion and removal at either end.</p>
      )}
    </ViewFrame>
  );
}
