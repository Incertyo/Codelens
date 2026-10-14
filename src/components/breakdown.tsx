'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LoaderCircle, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { CodeRunner } from '@/lib/runner';
import { CONCEPTS, enrichmentSchema } from '@/lib/breakdown';
import { useAIReadiness } from './use-ai-readiness';
import { AI_SOURCE_NOTICE } from '@/lib/ai/notice';
export function Breakdown() {
  const code = useStore((s) => s.code),
    language = useStore((s) => s.language),
    data = useStore((s) => s.breakdown),
    enrichment = useStore((s) => s.enrichment),
    selected = useStore((s) => s.selectedLine),
    result = useStore((s) => s.result);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [aiStatus, setAiStatus] = useState(''),
    [aiBusy, setAiBusy] = useState(false);
  const readiness = useAIReadiness(['python', 'javascript'].includes(language));
  const configured = readiness.configured;
  const outlineRunner = useRef<CodeRunner | null>(null),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!['python', 'javascript'].includes(language)) return;
    if (data) return;
    let active = true;
    outlineRunner.current ??= new CodeRunner();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      controller.current?.abort();
      setAiBusy(false);
      setAiStatus('');
      outlineRunner
        .current!.analyze(code, language)
        .then((outline) => {
          if (
            active &&
            useStore.getState().code === code &&
            useStore.getState().language === language
          )
            useStore.getState().patch({ breakdown: outline });
        })
        .catch((e) => {
          if (active) setError(e instanceof Error ? e.message : 'Could not parse this snippet.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
      outlineRunner.current?.dispose();
    };
  }, [code, language, data]);
  useEffect(() => {
    return () => controller.current?.abort();
  }, []);
  const select = (line: number) => {
    const state = useStore.getState();
    state.patch({ selectedLine: line, playing: false });
    const index = state.result?.steps.findIndex((s) => s.line === line && s.event === 'line');
    if (index !== undefined && index >= 0) state.seek(index);
  };
  const enrich = async () => {
    if (!data || aiBusy) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setAiBusy(true);
    setAiStatus('');
    const sample = (result?.steps ?? [])
      .filter((step, i, all) => i === 0 || step.event !== 'line' || all[i - 1]?.line !== step.line)
      .slice(0, 32)
      .map(({ index, line, event, func }) => ({ index, line, event, func }));
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          functions: data.functions
            .slice(0, 40)
            .map(({ name, line, endLine, parameters }) => ({ name, line, endLine, parameters })),
          steps: sample,
        }),
        signal: abort.signal,
      });
      const body = await response.json();
      if (!response.ok) {
        const reason = body.error || 'Enrichment is unavailable.';
        if (
          !abort.signal.aborted &&
          useStore.getState().code === code &&
          useStore.getState().language === language
        )
          readiness.unavailable(reason);
        throw new Error(reason);
      }
      if (useStore.getState().code !== code || useStore.getState().language !== language) return;
      if (body.source === 'ai') {
        const parsed = enrichmentSchema.safeParse(body.enrichment);
        if (!parsed.success)
          throw new Error('AI returned invalid notes. Your static breakdown remains available.');
        useStore.getState().patch({ enrichment: parsed.data });
        setAiStatus('AI notes added. The structure outline still comes from your AST.');
      } else setAiStatus(body.reason || 'Using the offline breakdown.');
    } catch (e) {
      if (!abort.signal.aborted)
        setAiStatus(
          e instanceof Error
            ? e.message
            : 'Could not enrich this snippet. The offline breakdown remains available.',
        );
    } finally {
      if (!abort.signal.aborted) setAiBusy(false);
    }
  };
  const functions = data?.functions.length
    ? data.functions
    : data
      ? [
          {
            name: 'program',
            line: 1,
            endLine: code.split('\n').length,
            parameters: [],
            returns: [],
            recursive: false,
            purpose: 'Runs the top-level statements in order.',
          },
        ]
      : [];
  if (!['python', 'javascript'].includes(language))
    return (
      <div className="analysis-pane">
        <h2>AST breakdown supports Python and JavaScript.</h2>
        <p>
          C++ and Java traces are AI-simulated, may be inaccurate, and have no local AST analysis.
        </p>
      </div>
    );
  return (
    <div className="breakdown-view">
      <div className="breakdown-heading">
        <span className="mono dim">02 / THE BIGGER PICTURE</span>
        <span className="mono phase-tag">
          {enrichment ? 'AST + AI NOTES' : 'LOCAL AST / OFFLINE'}
        </span>
      </div>
      {loading && !data && (
        <p className="breakdown-loading mono" role="status">
          <LoaderCircle className="spinner" size={14} /> Reading the structure of your{' '}
          {language === 'python' ? 'Python' : 'JavaScript'} code…
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {data?.diagnostic && (
        <p className="notice" role="alert">
          {data.diagnostic}
        </p>
      )}
      {data && (
        <>
          <section className="breakdown-summary">
            <p className="mono dim">WHAT THIS CODE DOES</p>
            <h2>{enrichment?.pattern ?? data.pattern}</h2>
            <p>{enrichment?.summary ?? data.summary}</p>
            <div className="concept-chips" aria-label="Concepts used">
              {data.concepts.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="concept-chip"
                  aria-describedby={`concept-${name.replaceAll(' ', '-')}`}
                >
                  {name}
                  <span role="tooltip" id={`concept-${name.replaceAll(' ', '-')}`}>
                    {CONCEPTS[name]}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="outline-section">
            <div className="panel-title">
              <span>STRUCTURE OUTLINE</span>
              <span className="mono dim">FROM THE AST</span>
            </div>
            <div className="outline-list">
              {data.outline.length ? (
                data.outline.map((node) => (
                  <button
                    key={node.id}
                    className={`outline-row ${selected && selected >= node.line && selected <= node.endLine ? 'outline-selected' : ''}`}
                    style={{
                      paddingLeft: `calc(var(--s5) + ${Math.min(node.depth, 5)} * var(--s3))`,
                    }}
                    onClick={() => select(node.line)}
                  >
                    <span className="mono dim">{String(node.line).padStart(2, '0')}</span>
                    <span>{node.label}</span>
                    <span className="mono dim outline-kind">{node.kind}</span>
                    <ArrowUpRight size={12} />
                  </button>
                ))
              ) : (
                <p className="empty-note mono">
                  A straight-line program. No functions, loops, or branches.
                </p>
              )}
            </div>
          </section>
          <section className="function-section">
            <div className="panel-title">
              <span>FUNCTION BY FUNCTION</span>
              <span className="mono dim">
                {functions.length} BLOCK{functions.length === 1 ? '' : 'S'}
              </span>
            </div>
            {functions.map((fn) => {
              const rich = enrichment?.functions.find(
                (f) => f.line === fn.line && f.name === fn.name,
              );
              const annotations = data.annotations.filter(
                (a) => a.line >= fn.line && a.line <= fn.endLine,
              );
              return (
                <article className="function-card" key={`${fn.name}-${fn.line}`}>
                  <button className="function-heading" onClick={() => select(fn.line)}>
                    <h3>
                      {fn.name}
                      <span className="dim">({fn.parameters.join(', ')})</span>
                    </h3>
                    <span className="mono dim">
                      L.{fn.line}–{fn.endLine} <ArrowUpRight size={12} />
                    </span>
                  </button>
                  <p>{rich?.purpose ?? fn.purpose}</p>
                  <dl className="function-meta">
                    <dt>PARAMETERS</dt>
                    <dd>{fn.parameters.join(', ') || 'None'}</dd>
                    <dt>RETURNS</dt>
                    <dd>
                      {rich?.returns ??
                        (fn.returns.length
                          ? fn.returns.join(' / ')
                          : language === 'python'
                            ? 'None'
                            : 'undefined')}
                    </dd>
                  </dl>
                  <details className="line-notes">
                    <summary className="mono">/ line-by-line notes ({annotations.length})</summary>
                    <div>
                      {annotations.map((annotation) => (
                        <button
                          className={`annotation-row ${selected === annotation.line ? 'annotation-selected' : ''}`}
                          key={annotation.line}
                          onClick={() => select(annotation.line)}
                        >
                          <span className="mono dim">
                            {String(annotation.line).padStart(2, '0')}
                          </span>
                          <span>
                            <code>{annotation.code.trim()}</code>
                            <span>
                              {enrichment?.annotations.find((a) => a.line === annotation.line)
                                ?.text ?? annotation.text}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </details>
                </article>
              );
            })}
          </section>
          <section className="enrichment-panel">
            <div>
              <Sparkles size={17} />
              <h3>A little more context.</h3>
            </div>
            <p>
              {configured
                ? AI_SOURCE_NOTICE
                : `${readiness.reason} The full structure and notes work offline.`}
            </p>
            {!configured && (
              <button className="text-button" onClick={readiness.refresh}>
                Check AI availability
              </button>
            )}
            <button
              className="run-button"
              disabled={!configured || aiBusy || !!data.diagnostic || !code.trim()}
              onClick={() => void enrich()}
            >
              {aiBusy ? <LoaderCircle className="spinner" size={14} /> : <Sparkles size={14} />} /
              enrich with AI <ArrowUpRight size={14} />
            </button>
            {enrichment && (
              <button
                className="text-button mono"
                onClick={() => {
                  useStore.getState().patch({ enrichment: null });
                  setAiStatus('Showing the original AST notes.');
                }}
              >
                / use static notes
              </button>
            )}
            {aiStatus && (
              <p className="mono" role="status">
                {aiStatus}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
