'use client';
import type { BitModel } from '@/lib/visualizer/detectors';
import { ViewFrame } from './shared';
export function BitmaskView({ model }: { model: BitModel }) {
  return (
    <ViewFrame
      model={model}
      extra={
        <span className="mono dim">
          {' '}
          / {model.decimalValue} / {model.bitLength}-bit
        </span>
      }
    >
      <div
        className="algo-register"
        role="list"
        aria-label={`${model.name} ${model.bitLength}-bit register`}
        data-testid="bit-register"
      >
        {model.bits.split('').map((bit, i) => (
          <div className="algo-bit-column" role="listitem" key={i}>
            <span className="mono dim">{model.bitLength - i - 1}</span>
            <div
              className={`algo-bit mono ${bit === '1' ? 'set-bit' : ''}`}
              data-bit={model.bitLength - i - 1}
              data-value={bit}
            >
              {bit}
            </div>
          </div>
        ))}
      </div>
      <p className="mono">
        {model.shift
          ? `${model.shift === 'left' ? '←' : '→'} SHIFT ${model.shift.toUpperCase()} / `
          : ''}
        Set bits are marked 1. Two’s complement, low {model.bitLength} bits.
      </p>
      {model.activeMasks.length > 0 && (
        <p className="mono">Active masks: {model.activeMasks.join(' / ')}</p>
      )}
    </ViewFrame>
  );
}
