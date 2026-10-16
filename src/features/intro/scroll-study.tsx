export function ScrollStudy() {
  return (
    <div className="motion-study" aria-hidden="true">
      <div className="study-tilt">
        <div className="study-scene">
          {['CODE', 'TRACE', 'CLARITY'].map((label, index) => (
            <div className="study-plane" key={label}>
              <svg viewBox="0 0 180 112" fill="none">
                <rect className="study-paper" x="1" y="1" width="178" height="110" rx="2" />
                <path className="study-rule" d="M1 26H179" />
                <text x="12" y="18">
                  0{index + 1} / {label}
                </text>
                {index === 0 ? (
                  <path className="study-rule" d="M16 44H88M28 58H136M28 72H110M16 86H72" />
                ) : index === 1 ? (
                  <g className="study-rule">
                    <path d="M30 68H150M65 68V45H114" />
                    <circle cx="30" cy="68" r="5" />
                    <circle cx="90" cy="68" r="5" />
                    <circle cx="150" cy="68" r="5" />
                  </g>
                ) : (
                  <g>
                    <path className="study-rule" d="M18 38V94H160" />
                    <path className="study-signal" d="M26 85L62 76L98 59L144 37" />
                    <circle className="study-point" cx="98" cy="59" r="3" />
                  </g>
                )}
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
