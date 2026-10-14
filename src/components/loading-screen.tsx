'use client';
import { motion } from 'framer-motion';
import { Square } from 'lucide-react';
export function LoadingScreen({
  mode = 'site',
  language = 'python',
  phase = 'loading',
  progress = 0,
  message = '',
  reduced = false,
  onCancel,
}: {
  mode?: 'site' | 'run' | 'route';
  language?: 'python' | 'javascript' | 'cpp' | 'java';
  phase?: 'loading' | 'running';
  progress?: number;
  message?: string;
  reduced?: boolean;
  onCancel?: () => void;
}) {
  const simulated = language === 'cpp' || language === 'java';
  const preparing = mode === 'run' && phase === 'loading' && !simulated;
  return (
    <motion.div
      className="loading-screen"
      data-testid={
        mode === 'run' ? 'run-loading' : mode === 'route' ? 'route-loading' : 'site-loading'
      }
      role={mode === 'run' ? 'dialog' : 'status'}
      aria-modal={mode === 'run' ? true : undefined}
      aria-label={mode === 'run' ? 'Running code' : 'Opening CodeLens'}
      initial={mode === 'run' && !reduced ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      onKeyDown={(e) => {
        if (mode === 'run' && e.key === 'Escape') {
          e.preventDefault();
          onCancel?.();
        }
        if (mode === 'run' && onCancel && e.key === 'Tab') e.preventDefault();
      }}
    >
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="loading-brand">
        <span>/</span> codelens.
      </div>
      <div className="loading-stage mono">
        {mode === 'run'
          ? simulated
            ? '/ REQUESTING AI SIMULATION'
            : `/ ${preparing ? 'PREPARING' : 'TRACING'} ${language === 'python' ? 'PYTHON' : 'JAVASCRIPT'}`
          : '/ OPENING YOUR WORKSPACE'}
      </div>
      <h2>
        {mode === 'run' ? (
          <>
            WATCH CODE
            <br />
            <span>THINK.</span>
          </>
        ) : (
          <>
            ONE LINE
            <br />
            <span>AT A TIME.</span>
          </>
        )}
      </h2>
      <div className="loading-meter">
        {preparing ? (
          <>
            <span className="loading-counter doto">
              {String(Math.round(progress)).padStart(3, '0')}
              <span>%</span>
            </span>
            <progress
              value={progress}
              max={100}
              aria-label={`${language === 'python' ? 'Python' : 'JavaScript'} preparation progress`}
            />
          </>
        ) : (
          <>
            <div className="loading-ticks" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
            <span className="mono dim">
              {mode === 'run'
                ? simulated
                  ? 'AI-SIMULATED, MAY BE INACCURATE'
                  : 'CAPTURING EVERY STEP'
                : 'PREPARING THE EDITOR'}
            </span>
          </>
        )}
      </div>
      <p className="mono" aria-live="polite">
        {message || 'Loading your local workspace…'}
      </p>
      {onCancel && (
        <button className="loading-cancel mono" onClick={onCancel} autoFocus>
          <Square size={13} /> / cancel run
        </button>
      )}
      <span className="loading-footnote mono dim">
        LOCAL EXECUTION / STEP BY STEP — LINE BY LINE — CALL BY CALL
      </span>
    </motion.div>
  );
}
