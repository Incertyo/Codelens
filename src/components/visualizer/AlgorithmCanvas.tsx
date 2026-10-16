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
  isPrimary,
  highlightReason,
}: {
  model: VisualModel;
  step: Step;
  previous?: Step;
  isPrimary?: boolean;
  highlightReason?: string;
}) {
  const language = useStore((s) => s.language);
  let content: React.ReactNode = null;
  switch (model.kind) {
    case 'string_buffer':
      content = <StringBufferView model={model} step={step} />;
      break;
    case 'sequence':
      content = (
        <ViewFrame model={model}>
          <LinearCells model={model} step={step} previous={previous} />
        </ViewFrame>
      );
      break;
    case 'stack':
      content = <StackView model={model} step={step} />;
      break;
    case 'queue':
    case 'deque':
      content = <QueueView model={model} step={step} />;
      break;
    case 'interval_set':
      content = <IntervalView model={model} />;
      break;
    case 'binary_heap':
      content = <HeapDualView model={model} step={step} />;
      break;
    case 'trie':
      content = <TrieView model={model} />;
      break;
    case 'dsu':
      content = <DSUView model={model} />;
      break;
    case 'bitmask':
      content = <BitmaskView model={model} />;
      break;
    case 'dp_matrix':
      content = <DPDependencyGrid model={model} step={step} />;
      break;
    case 'segment_tree':
      content = <SegmentTreeView model={model} />;
      break;
    case 'hash_table':
      content = <HashTableView model={model} step={step} />;
      break;
    case 'set_pool':
      content = <SetPoolView model={model} step={step} />;
      break;
    case 'legacy':
      content =
        model.structure.kind === 'matrix' ? (
          <GenericMatrixView model={model} step={step} />
        ) : (
          <StructureView structure={model.structure} step={step} previous={previous} />
        );
      break;
    case 'scalar':
      content = (
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
      break;
    case 'sliding_window':
      return null;
  }
  return (
    <div
      className={`model-wrapper ${isPrimary ? 'primary-structure-model' : ''} ${highlightReason ? 'highlighted-structure-model' : ''}`}
      data-primary={isPrimary ? 'true' : undefined}
    >
      {(isPrimary || highlightReason) && (
        <div className="model-visual-annotation mono">
          {isPrimary && <span className="primary-structure-badge">PRIMARY STRUCTURE</span>}
          {highlightReason && <span className="highlight-reason-badge">★ {highlightReason}</span>}
        </div>
      )}
      {content}
    </div>
  );
}
export function AlgorithmCanvas({ step, previous }: { step: Step; previous?: Step }) {
  const code = useStore((s) => s.code);
  const language = useStore((s) => s.language);
  const enrichment = useStore((s) => s.enrichment);
  const visualMapping = enrichment?.visualMapping;

  const hints = useMemo(
    () => sourceHints(code, language, visualMapping),
    [code, language, visualMapping],
  );
  const rawModels = useMemo(() => detectVisualModels(step, hints), [step, hints]);

  const primaryStructure = visualMapping?.primaryStructure;
  const highlights = visualMapping?.highlights;
  const keyOperations = visualMapping?.keyOperations;
  const stepIndex = step.index;
  const stepLine = step.line;

  const models = useMemo(() => {
    if (!primaryStructure) return rawModels;
    const target = primaryStructure.toLowerCase();
    return [...rawModels].sort((a, b) => {
      const aMatch = a.name.toLowerCase() === target || a.kind.toLowerCase() === target;
      const bMatch = b.name.toLowerCase() === target || b.kind.toLowerCase() === target;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [rawModels, primaryStructure]);

  const currentHighlight = useMemo(() => {
    if (!highlights?.length) return null;
    return highlights.find((h) => h.step === stepIndex);
  }, [highlights, stepIndex]);

  const currentKeyOp = useMemo(() => {
    if (!keyOperations?.length) return null;
    return keyOperations.find((op) => op.line === stepLine);
  }, [keyOperations, stepLine]);

  return models.length ? (
    <div
      className="arrays algorithm-canvas"
      tabIndex={0}
      role="region"
      aria-label="Data structure views"
      data-native-scroll
    >
      {(currentKeyOp || currentHighlight) && (
        <div className="custom-visual-mapper-bar" role="status">
          {currentHighlight && (
            <div className="visual-mapper-highlight">
              <span className="visual-mapper-star">★</span>
              <strong className="mono">{currentHighlight.variable}</strong>: {currentHighlight.reason}
            </div>
          )}
          {currentKeyOp && (
            <div className="visual-mapper-key-op">
              <span className="key-op-tag mono">{currentKeyOp.type.toUpperCase()}</span>
              <span className="mono dim">L.{currentKeyOp.line}</span>
              <span>{currentKeyOp.description}</span>
            </div>
          )}
        </div>
      )}
      {models.map((model) => {
        const isPrimary =
          visualMapping?.primaryStructure?.toLowerCase() === model.name.toLowerCase() ||
          visualMapping?.primaryStructure?.toLowerCase() === model.kind.toLowerCase();
        const highlightReason =
          currentHighlight &&
          (currentHighlight.variable.toLowerCase() === model.name.toLowerCase() ||
            currentHighlight.variable === '*')
            ? currentHighlight.reason
            : undefined;
        return (
          <RenderModel
            key={`${model.kind}:${model.id}`}
            model={model}
            step={step}
            previous={previous}
            isPrimary={isPrimary}
            highlightReason={highlightReason}
          />
        );
      })}
    </div>
  ) : (
    <div className="visual-empty">
      <p>NO COLLECTIONS IN THIS FRAME.</p>
      <span className="mono">No captured variables are declared in this frame yet.</span>
    </div>
  );
}
