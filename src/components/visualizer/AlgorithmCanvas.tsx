'use client';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { displayValue, type Step } from '@/lib/trace';
import { detectVisualModels, sourceHints, type VisualModel } from '@/lib/visualizer/detectors';
import { StructureView } from '../structure-views';
import { StringBufferView } from './renderers/StringBufferView';
import { StackView } from './renderers/StackView';
import { QueueView } from './renderers/QueueView';
import { IntervalView } from './renderers/IntervalView';
import { HeapDualView } from './renderers/HeapDualView';
import { TrieView } from './renderers/TrieView';
import { DSUView } from './renderers/DSUView';
import { BitmaskView } from './renderers/BitmaskView';
import { DPDependencyGrid } from './renderers/DPDependencyGrid';
import { SegmentTreeView } from './renderers/SegmentTreeView';
import { HashTableView, SetPoolView } from './renderers/HashTableView';
import { GenericMatrixView } from './renderers/GenericMatrixView';
import { LinearCells, ViewFrame } from './renderers/shared';
function RenderModel({
  model,
  step,
  previous,
}: {
  model: VisualModel;
  step: Step;
  previous?: Step;
}) {
  const language = useStore((s) => s.language);
  switch (model.kind) {
    case 'string_buffer':
      return <StringBufferView model={model} step={step} />;
    case 'sequence':
      return (
        <ViewFrame model={model}>
          <LinearCells model={model} step={step} previous={previous} />
        </ViewFrame>
      );
    case 'stack':
      return <StackView model={model} step={step} />;
    case 'queue':
    case 'deque':
      return <QueueView model={model} step={step} />;
    case 'interval_set':
      return <IntervalView model={model} />;
    case 'binary_heap':
      return <HeapDualView model={model} step={step} />;
    case 'trie':
      return <TrieView model={model} />;
    case 'dsu':
      return <DSUView model={model} />;
    case 'bitmask':
      return <BitmaskView model={model} />;
    case 'dp_matrix':
      return <DPDependencyGrid model={model} step={step} />;
    case 'segment_tree':
      return <SegmentTreeView model={model} />;
    case 'hash_table':
      return <HashTableView model={model} step={step} />;
    case 'set_pool':
      return <SetPoolView model={model} step={step} />;
    case 'legacy':
      return model.structure.kind === 'matrix' ? (
        <GenericMatrixView model={model} step={step} />
      ) : (
        <StructureView structure={model.structure} step={step} previous={previous} />
      );
    case 'scalar':
      return (
        <ViewFrame model={model}>
          <div className="algo-scalars" role="list" aria-label="Scalar State Monitor">
            {model.values.map((entry, i) => (
              <div className="algo-scalar" role="listitem" key={`${entry.name}:${i}`}>
                <span className="mono dim">{entry.name}</span>
                <strong className="mono">{displayValue(entry.value, step.heap, language)}</strong>
              </div>
            ))}
          </div>
        </ViewFrame>
      );
    case 'sliding_window':
      return null;
  }
}
export function AlgorithmCanvas({ step, previous }: { step: Step; previous?: Step }) {
  const code = useStore((s) => s.code);
  const language = useStore((s) => s.language);
  const hints = useMemo(() => sourceHints(code, language), [code, language]);
  const models = useMemo(() => detectVisualModels(step, hints), [step, hints]);
  return models.length ? (
    <div
      className="arrays algorithm-canvas"
      tabIndex={0}
      role="region"
      aria-label="Data structure views"
      data-native-scroll
    >
      {models.map((model) => (
        <RenderModel
          key={`${model.kind}:${model.id}`}
          model={model}
          step={step}
          previous={previous}
        />
      ))}
    </div>
  ) : (
    <div className="visual-empty">
      <p>NO COLLECTIONS IN THIS FRAME.</p>
      <span className="mono">No captured variables are declared in this frame yet.</span>
    </div>
  );
}
