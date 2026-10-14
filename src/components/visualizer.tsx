'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, Copy, Terminal, Braces } from 'lucide-react';
import { useStore } from '@/lib/store';
import { displayValue } from '@/lib/trace';
import { Playback } from './playback';
import { AlgorithmCanvas } from './visualizer/AlgorithmCanvas';
import { RecursionTree } from './recursion-tree';
function PanelTitle({
  number,
  title,
  extra,
}: {
  number: string;
  title: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="panel-title">
      <span>
        <span className="mono dim">{number}</span> {title}
      </span>
      {extra}
    </div>
  );
}
export function Visualizer() {
  const language = useStore((s) => s.language);
  const result = useStore((s) => s.result),
    cursor = useStore((s) => s.cursor),
    reduced = useStore((s) => s.reduced);
  const step = result?.steps[cursor],
    previous = result?.steps[cursor - 1];
  const [copied, setCopied] = useState(false);
  const vars = { ...step?.globals, ...step?.callStack.at(-1)?.locals };
  const prevVars = { ...previous?.globals, ...previous?.callStack.at(-1)?.locals };
  return (
    <div
      className={`visualizer ${result?.origin === 'ai-simulated' ? 'simulated-visualizer' : ''}`}
    >
      {result?.origin === 'ai-simulated' && (
        <div role="status" className="simulation-notice">
          <strong>AI-simulated, may be inaccurate</strong>
          <span>
            Hypothetical steps and values from the configured provider. This source was not
            executed.
          </span>
        </div>
      )}
      <Playback />
      {result?.truncated && (
        <div role="status" className="notice">
          Trace truncated at the safety limit. You can inspect the captured steps.
        </div>
      )}
      {result?.error && (
        <div role="alert" className="notice">
          {result.error}{' '}
          <button onClick={() => useStore.getState().seek(result.steps.length - 1)}>
            Jump to exception ↗
          </button>
        </div>
      )}
      <section className="data-panel">
        <PanelTitle
          number="01"
          title="DATA IN MOTION"
          extra={
            <span className="mono dim">
              {step ? `L.${String(step.line).padStart(2, '0')}` : 'LIVE VIEW'}
            </span>
          }
        />
        {step ? (
          <AlgorithmCanvas step={step} previous={previous} />
        ) : (
          <div className="visual-empty">
            <div className="ghost-array" aria-hidden="true">
              {[5, 3, 8, 1, 2].map((n, i) => (
                <div key={i}>
                  <span className="mono">0{i}</span>
                  <span>{n}</span>
                </div>
              ))}
            </div>
            <p>FROM ABSTRACT TO OBVIOUS.</p>
            <span className="mono">Run a program. See every move it makes.</span>
          </div>
        )}
      </section>
      <RecursionTree />
      <div className="inspect-grid">
        <section className="variables-panel">
          <PanelTitle number="02" title="VARIABLES" extra={<Braces size={14} />} />
          <div
            className="variable-list"
            tabIndex={0}
            role="region"
            aria-label="Variables"
            data-native-scroll
          >
            {Object.entries(vars).length ? (
              Object.entries(vars).map(([name, v]) => {
                const changed =
                  JSON.stringify(prevVars[name]) !== JSON.stringify(v) ||
                  (v !== null &&
                    typeof v === 'object' &&
                    JSON.stringify(step?.heap[v.ref]) !== JSON.stringify(previous?.heap[v.ref]));
                return (
                  <div className={`variable-row ${changed ? 'variable-changed' : ''}`} key={name}>
                    <span className="mono variable-name">{name}</span>
                    <span
                      className="mono variable-value"
                      title={displayValue(v, step?.heap, language)}
                    >
                      {displayValue(v, step?.heap, language)}
                    </span>
                    {changed && (
                      <span className="change-marker" aria-label="Value changed">
                        ↗
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="empty-note mono">No variables yet.</p>
            )}
          </div>
        </section>
        <section className="stack-panel">
          <PanelTitle
            number="03"
            title="CALL STACK"
            extra={
              <span className="mono dim">
                {String(step?.callStack.length ?? 0).padStart(2, '0')}
              </span>
            }
          />
          <div
            className="stack-list"
            tabIndex={0}
            role="region"
            aria-label="Call stack frames"
            data-native-scroll
          >
            <AnimatePresence initial={false}>
              {step?.callStack.length ? (
                step.callStack.map((frame, i) => (
                  <motion.div
                    initial={{ y: reduced ? 0 : 8 }}
                    animate={{ y: 0 }}
                    exit={{ y: reduced ? 0 : -8 }}
                    transition={{ duration: reduced ? 0 : 0.18 }}
                    className={`stack-frame ${i === step.callStack.length - 1 ? 'active-frame' : ''}`}
                    key={`${frame.func}-${i}`}
                  >
                    <span className="mono">
                      {frame.func === '<' + 'module>' ? 'module' : frame.func}
                      <span className="dim">()</span>
                    </span>
                    <span className="mono dim">:{frame.line}</span>
                    {i === step.callStack.length - 1 && <ArrowDown size={12} />}
                  </motion.div>
                ))
              ) : (
                <p className="empty-note mono">Waiting for the first call.</p>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
      <section className="heap-panel">
        <PanelTitle
          number="04"
          title="HEAP / OBJECTS"
          extra={<span className="mono dim">STABLE REFERENCES</span>}
        />
        <div className="heap-list">
          {step && Object.entries(step.heap).length ? (
            Object.entries(step.heap).map(([id, obj]) => (
              <details key={id} className="heap-object">
                <summary className="mono">
                  <span>@{id}</span>
                  <span className="dim">
                    {obj.type} {obj.items ? `(${obj.items.length}${obj.truncated ? '+' : ''})` : ''}
                  </span>
                </summary>
                <div className="heap-detail mono">
                  {obj.items
                    ? obj.items.map((v, i) => (
                        <div key={i}>
                          <span className="dim">[{i}]</span>
                          <span>{displayValue(v, step.heap, language)}</span>
                        </div>
                      ))
                    : obj.entries
                      ? obj.entries.map(([k, v], i) => (
                          <div key={i}>
                            <span>{displayValue(k, step.heap, language)}</span>
                            <span>→ {displayValue(v, step.heap, language)}</span>
                          </div>
                        ))
                      : Object.entries(obj.fields ?? {}).map(([k, v]) => (
                          <div key={k}>
                            <span>{k}</span>
                            <span>→ {displayValue(v, step.heap, language)}</span>
                          </div>
                        ))}
                  {obj.truncated && <p>Additional items truncated.</p>}
                </div>
              </details>
            ))
          ) : (
            <p className="empty-note mono">Lists, dictionaries, and objects live here.</p>
          )}
        </div>
      </section>
      <section className="console-panel">
        <PanelTitle
          number="05"
          title="OUTPUT"
          extra={
            <button
              className="icon-button"
              aria-label="Copy output"
              disabled={!step?.stdout}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(step?.stdout ?? '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? <span className="mono">✓</span> : <Copy size={13} />}
            </button>
          }
        />
        <pre
          className="console-output"
          data-testid="stdout"
          tabIndex={0}
          role="region"
          aria-label="Program output"
          data-native-scroll
        >
          {step?.stdout || (
            <span className="dim">
              <Terminal size={13} />{' '}
              {step ? 'No output at this step.' : 'Your program has the floor.'}
            </span>
          )}
        </pre>
      </section>
    </div>
  );
}
