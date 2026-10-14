'use client';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { WindowModel } from '@/lib/visualizer/detectors';
export function SlidingWindowOverlay({ model }: { model: WindowModel }) {
  const reduced = useStore((s) => s.reduced);
  return (
    <motion.div
      className="algo-window"
      initial={false}
      animate={{ x: model.startIndex * 56, width: model.windowLength * 56 - 4 }}
      transition={{ duration: reduced ? 0 : 0.16 }}
      data-testid="sliding-window"
      aria-label={`Window from ${model.startIndex} to ${model.endIndex}, size ${model.windowLength}`}
    >
      <span className="mono">
        Window Size: {model.endIndex} − {model.startIndex} + 1 = {model.windowLength}
      </span>
    </motion.div>
  );
}
