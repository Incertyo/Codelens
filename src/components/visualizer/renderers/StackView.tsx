'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { StackModel } from '@/lib/visualizer/detectors';
import { useFormat, ViewFrame, type ViewProps } from './shared';
export function StackView({ model, step }: ViewProps<StackModel>) {
  const reduced = useStore((s) => s.reduced),
    format = useFormat(step);
  return (
    <ViewFrame model={model}>
      <div className="algo-beaker" role="list" aria-label={`${model.name} bottom to top stack`}>
        <AnimatePresence initial={false}>
          {model.elements.map((v, i) => (
            <motion.div
              className="algo-stack-item mono"
              data-index={i}
              role="listitem"
              key={`${i}:${JSON.stringify(v)}`}
              layout={!reduced}
              initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -38 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -38 }}
              transition={{ duration: reduced ? 0 : 0.18, type: 'spring', bounce: 0.2 }}
            >
              {format(v)}
            </motion.div>
          ))}
        </AnimatePresence>
        {!model.elements.length && (
          <span role="listitem" className="mono dim">
            empty
          </span>
        )}
        <motion.span
          className="algo-top mono"
          data-testid="stack-top"
          data-index={model.topIndex}
          initial={false}
          animate={{ bottom: Math.max(0, model.topIndex) * 40 + 10 }}
          transition={{ duration: reduced ? 0 : 0.16 }}
        >
          ← TOP {model.topIndex}
        </motion.span>
      </div>
    </ViewFrame>
  );
}
