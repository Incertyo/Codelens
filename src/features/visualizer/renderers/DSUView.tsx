'use client';
import type { DSUModel } from "@/features/visualizer/detectors";
import { ViewFrame } from "./shared";
export function DSUView({ model }: { model: DSUModel }) {
  return (
    <ViewFrame model={model}>
      <div className="algo-clusters">
        {[...model.sets].map(([root, members]) => (
          <div className="algo-cluster" key={root}>
            <span className="mono algo-root">ROOT {root}</span>
            <svg
              className="algo-svg"
              width={Math.max(100, members.length * 48)}
              height="95"
              role="img"
              aria-label={`Set rooted at ${root}`}
            >
              <text x={Math.max(100, members.length * 48) / 2} y="15" textAnchor="middle">
                {root}
              </text>
              {members.map((member, i) => (
                <g key={member}>
                  <line
                    className="algo-edge"
                    x1={Math.max(100, members.length * 48) / 2}
                    y1="23"
                    x2={24 + i * 48}
                    y2="50"
                  />
                  <circle
                    className={`algo-node ${member === root ? 'active' : ''}`}
                    cx={24 + i * 48}
                    cy="68"
                    r="18"
                  />
                  <text
                    className={member === root ? 'on-accent' : ''}
                    x={24 + i * 48}
                    y="72"
                    textAnchor="middle"
                  >
                    {member}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ))}
      </div>
      <table className="map-table mono">
        <caption>Live union-find indices</caption>
        <thead>
          <tr>
            <th>index</th>
            <th>parent</th>
            {model.rank && <th>rank</th>}
            {model.size && <th>size</th>}
          </tr>
        </thead>
        <tbody>
          {model.parent.map((parent, i) => (
            <tr key={i}>
              <td>{i}</td>
              <td>{parent}</td>
              {model.rank && <td>{model.rank[i]}</td>}
              {model.size && <td>{model.size[i]}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {model.invalidParents.length > 0 && (
        <p className="mono">Unresolved parent links or cycles: {model.invalidParents.join(', ')}</p>
      )}
    </ViewFrame>
  );
}
