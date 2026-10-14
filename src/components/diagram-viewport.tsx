'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
export type DiagramBounds = { left: number; top: number; width: number; height: number };

export function DiagramViewport({
  width,
  height,
  label,
  focusPoint,
  children,
}: {
  width: number;
  height: number;
  label: string;
  focusPoint?: { x: number; y: number };
  children: ReactNode | ((bounds: DiagramBounds) => ReactNode);
}) {
  const area = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 500, height: 280 });
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const [zoom, setZoom] = useState<number | null>(null);
  const scale =
    zoom ?? Math.min(1.25, Math.max(0.6, Math.min(box.width / width, box.height / height)));
  useEffect(() => {
    const node = area.current;
    if (!node) return;
    const measure = () => {
      const next = {
        width: Math.max(1, node.clientWidth),
        height: Math.max(180, Math.min(420, window.innerHeight * 0.45)),
      };
      setBox((old) => (old.width === next.width && old.height === next.height ? old : next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  const x = focusPoint?.x,
    y = focusPoint?.y;
  useEffect(() => {
    const node = area.current;
    if (!node || x === undefined || y === undefined) return;
    const px = x * scale,
      py = y * scale;
    if (px < node.scrollLeft + 70 * scale || px > node.scrollLeft + node.clientWidth - 70 * scale)
      node.scrollLeft = Math.max(0, px - node.clientWidth / 2);
    if (py < node.scrollTop + 30 * scale || py > node.scrollTop + node.clientHeight - 40 * scale)
      node.scrollTop = Math.max(0, py - node.clientHeight / 2);
    setScroll({ left: node.scrollLeft, top: node.scrollTop });
  }, [x, y, scale, box.width, box.height]);
  const bounds = {
    left: scroll.left / scale,
    top: scroll.top / scale,
    width: box.width / scale,
    height: Math.min(box.height, height * scale) / scale,
  };
  return (
    <div className="diagram-viewport">
      <div className="diagram-controls mono" role="group" aria-label={`${label} sizing`}>
        <button
          aria-label={`Fit ${label}`}
          aria-pressed={zoom === null}
          onClick={() => setZoom(null)}
        >
          Auto fit
        </button>
        <button
          aria-label={`Zoom out ${label}`}
          disabled={scale <= 0.25}
          onClick={() => setZoom(Math.max(0.25, scale - 0.15))}
        >
          −
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button
          aria-label={`Zoom in ${label}`}
          disabled={scale >= 2}
          onClick={() => setZoom(Math.min(2, scale + 0.15))}
        >
          +
        </button>
        <button aria-label={`Actual size ${label}`} onClick={() => setZoom(1)}>
          1:1
        </button>
      </div>
      <div
        className="diagram-scroll"
        ref={area}
        style={{ height: Math.min(box.height, height * scale) }}
        tabIndex={0}
        role="region"
        aria-label={`${label} scroll area`}
        data-native-scroll
        data-scale={scale}
        data-fit={zoom === null}
        onScroll={(event) =>
          setScroll({ left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop })
        }
      >
        <div className="diagram-plane" style={{ width: width * scale, height: height * scale }}>
          {typeof children === 'function' ? children(bounds) : children}
        </div>
      </div>
    </div>
  );
}
