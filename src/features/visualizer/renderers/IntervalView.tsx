'use client';
import type { IntervalModel } from "@/features/visualizer/detectors";
import { ViewFrame } from "./shared";
export function IntervalView({ model }: { model: IntervalModel }) {
  const sorted = [...model.intervals].sort((a, b) => a.start - b.start || a.end - b.end);
  const ends: number[] = [],
    intervals = sorted.map((interval) => {
      let lane = ends.findIndex((end) => end < interval.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = interval.end;
      return { ...interval, lane };
    });
  const min = Math.min(0, ...sorted.map((i) => i.start)),
    max = Math.max(min + 1, ...sorted.map((i) => i.end));
  const x = (n: number) => 34 + ((n - min) / (max - min)) * 550;
  return (
    <ViewFrame model={model}>
      <svg
        className="algo-svg"
        width="620"
        height={Math.max(120, ends.length * 40 + 65)}
        role="img"
        aria-label={`${model.name} interval timeline`}
      >
        <line x1="34" y1="27" x2="584" y2="27" className="algo-edge" />
        {Array.from({ length: 6 }, (_, i) => {
          const val = min + ((max - min) * i) / 5;
          return (
            <g key={i}>
              <line x1={x(val)} x2={x(val)} y1="23" y2="32" className="algo-edge" />
              <text x={x(val)} y="17" textAnchor="middle">
                {Number(val.toFixed(2))}
              </text>
            </g>
          );
        })}
        {intervals.map((i) => (
          <g key={i.id} data-active={i.active}>
            <title>{`[${i.start}, ${i.end}]`}</title>
            <rect
              x={x(i.start)}
              y={45 + i.lane * 40}
              width={Math.max(3, x(i.end) - x(i.start))}
              height="28"
              rx="8"
              className={i.active ? 'algo-node active' : 'algo-node'}
            />
            <text
              x={(x(i.start) + x(i.end)) / 2}
              y={64 + i.lane * 40}
              textAnchor="middle"
              className={i.active ? 'on-accent' : ''}
            >
              {i.start} – {i.end}
            </text>
          </g>
        ))}
      </svg>
    </ViewFrame>
  );
}
