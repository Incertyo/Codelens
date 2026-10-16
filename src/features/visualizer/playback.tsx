'use client';
import { useEffect } from 'react';
import { SkipBack, SkipForward, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useStore } from "@/features/workspace/public/store";
import { explainStep } from "@/shared/trace";
export function Playback() {
  const language = useStore((s) => s.language),
    notes = useStore((s) => s.enrichment?.stepNotes);
  const result = useStore((s) => s.result),
    cursor = useStore((s) => s.cursor),
    playing = useStore((s) => s.playing),
    speed = useStore((s) => s.speed);
  const seek = useStore((s) => s.seek),
    breakpoints = useStore((s) => s.breakpoints);
  const count = result?.steps.length ?? 0;
  useEffect(() => {
    if (!playing || !count) return;
    const interval = setInterval(() => {
      const state = useStore.getState();
      const next = state.cursor + 1;
      if (next >= count) {
        state.setPlaying(false);
        return;
      }
      state.seek(next);
      if (state.breakpoints.includes(state.result!.steps[next].line) || next === count - 1)
        state.setPlaying(false);
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [playing, speed, count, breakpoints]);
  const toggle = () => {
    if (cursor === count - 1) seek(0);
    useStore.getState().setPlaying(!playing);
  };
  const step = result?.steps[cursor];
  return (
    <div className="playback">
      <div className="playback-top">
        <div className="transport">
          <button
            className="icon-button"
            aria-label="Jump to start"
            disabled={!count}
            onClick={() => {
              seek(0);
              useStore.getState().setPlaying(false);
            }}
          >
            <SkipBack size={15} />
          </button>
          <button
            className="icon-button"
            aria-label="Previous step"
            disabled={!count || cursor === 0}
            onClick={() => {
              seek(cursor - 1);
              useStore.getState().setPlaying(false);
            }}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="play-button"
            aria-label={playing ? 'Pause playback' : 'Play trace'}
            disabled={!count}
            onClick={toggle}
            data-cursor="PLAY"
          >
            {playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
          </button>
          <button
            className="icon-button"
            aria-label="Next step"
            disabled={!count || cursor === count - 1}
            onClick={() => {
              seek(cursor + 1);
              useStore.getState().setPlaying(false);
            }}
          >
            <ChevronRight size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Jump to end"
            disabled={!count}
            onClick={() => {
              seek(count - 1);
              useStore.getState().setPlaying(false);
            }}
          >
            <SkipForward size={15} />
          </button>
        </div>
        <span className="step-counter" data-testid="step-counter">
          ( {count ? String(cursor + 1).padStart(3, '0') : '000'} / {String(count).padStart(3, '0')}{' '}
          )
        </span>
      </div>
      <div className="timeline-row">
        <input
          aria-label="Execution timeline"
          type="range"
          min="0"
          max={Math.max(0, count - 1)}
          value={cursor}
          disabled={!count}
          onChange={(e) => {
            seek(Number(e.target.value));
            useStore.getState().setPlaying(false);
          }}
        />
        <label className="speed-label mono">
          Speed{' '}
          <input
            aria-label="Playback speed"
            type="range"
            min="1"
            max="10"
            value={speed}
            onChange={(e) => useStore.getState().setSpeed(Number(e.target.value))}
          />
          <span>{speed}×</span>
        </label>
      </div>
      <p className="step-explanation" aria-live={playing ? 'off' : 'polite'}>
        <span className="step-dot" />
        {step
          ? notes?.find((note) => note.index === cursor)?.text
            ? `AI note · ${notes.find((note) => note.index === cursor)!.text}`
            : explainStep(step, result?.steps[cursor - 1], language)
          : 'A little curiosity goes a long way. Run your code to begin.'}
      </p>
    </div>
  );
}
