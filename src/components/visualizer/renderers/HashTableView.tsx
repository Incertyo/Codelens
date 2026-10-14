'use client';
import type { HashModel, SetModel } from '@/lib/visualizer/detectors';
import { useFormat, ViewFrame, type ViewProps } from './shared';
export function HashTableView({ model, step }: ViewProps<HashModel>) {
  const format = useFormat(step);
  return (
    <ViewFrame model={model}>
      <p className="mono dim">
        Capacity {model.capacity} / captured load factor {model.loadFactor.toFixed(2)}
      </p>
      <div role="list" aria-label={`${model.name} collision buckets`}>
        {!model.buckets.length && (
          <span role="listitem" className="mono dim">
            empty bucket table
          </span>
        )}
        {model.buckets.map((bucket, i) => (
          <div className="algo-bucket mono" role="listitem" key={i}>
            <span>[{i}] →</span>
            {bucket.map((entry, j) => (
              <span className="algo-cell" key={j}>
                {entry.key}: {format(entry.value)} {j < bucket.length - 1 ? '→' : ''}
              </span>
            ))}
            {!bucket.length && <span className="dim">∅</span>}
          </div>
        ))}
      </div>
    </ViewFrame>
  );
}
export function SetPoolView({ model, step }: ViewProps<SetModel>) {
  const format = useFormat(step);
  return (
    <ViewFrame model={model}>
      <div className="algo-set" role="list" aria-label={`${model.name} membership pool`}>
        {model.items.map((value, i) => (
          <span role="listitem" className="algo-cell mono" key={i}>
            {format(value)}
          </span>
        ))}
        {!model.items.length && (
          <span role="listitem" className="mono dim">
            ∅ empty set
          </span>
        )}
      </div>
      {model.operation && <p className="mono">Operation: {model.operation}</p>}
    </ViewFrame>
  );
}
