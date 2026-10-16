'use client';
import { limits } from '@/shared/limits';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  Plus,
  Play,
  Square,
  X,
  Share2,
  LoaderCircle,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { examples, type Example } from '@/lib/examples';
import { CodeRunner } from '@/lib/runner';
import { exampleCode } from '@/lib/javascript-examples';
import { type Language, enrichmentSchema } from '@/lib/breakdown';
import { decodeShare, encodeShortShare } from '@/lib/share';
import { Preferences, usePreferences } from './preferences';
import { Visualizer } from './visualizer';
import { AlgorithmBrowser } from './algorithm-browser';
import { LoadingScreen } from './loading-screen';
import { ScrollStudy } from './scroll-study';
import { algorithms, type Algorithm } from '@/lib/algorithm-catalog';
import { implementationSchema, type LibraryImplementation } from '@/lib/library-contract';
import { sourceIdentity } from '@/lib/analysis';
import { LANGUAGE_LABELS } from '@/lib/language-detection';
import { editorLanguage, editorSourceIssue, unsupportedShareLanguage, type UnsupportedEditorLanguage } from '@/lib/editor-language';
import { useLanguageDetection } from './use-language-detection';
import { usePageIntro } from './page-intro';
const Analysis = dynamic(() => import('./analysis').then((m) => m.Analysis));
const Breakdown = dynamic(() => import('./breakdown').then((m) => m.Breakdown), {
  loading: () => <p className="empty-note mono">/ loading breakdown</p>,
});
const ComplexityView = dynamic(() => import('./complexity-view').then((m) => m.ComplexityView));
const CodeEditor = dynamic(() => import('./code-editor').then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <div className="editor-body editor-loading mono">/ loading editor</div>,
});
const Decorative = dynamic(() => import('./decorative'), { ssr: false });
export function Workspace() {
  usePreferences();
  const code = useStore((s) => s.code),
    language = useStore((s) => s.language),
    stdin = useStore((s) => s.stdin),
    status = useStore((s) => s.status),
    progress = useStore((s) => s.progress),
    message = useStore((s) => s.message),
    edited = useStore((s) => s.edited),
    tab = useStore((s) => s.tab),
    reduced = useStore((s) => s.reduced);
  const setCode = useStore((s) => s.setCode),
    setStdin = useStore((s) => s.setStdin),
    patch = useStore((s) => s.patch),
    result = useStore((s) => s.result);
  const languageMode = useStore((s) => s.languageMode);
  const detection = useLanguageDetection();
  const [exampleName, setExampleName] = useState('Bubble sort');
  const [showInput, setShowInput] = useState(false);
  const [shareState, setShareState] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [split, setSplit] = useState(48);
  const maxSteps = useStore((s) => s.maxSteps),
    setMaxSteps = useStore((s) => s.setMaxSteps);
  const { active: booting, editorReady: finishBoot } = usePageIntro();
  const [focusToken, setFocusToken] = useState(0);
  const [draft, setDraft] = useState<{
    code: string;
    stdin: string;
    name: string;
    language: Language;
    unsupportedLanguage: UnsupportedEditorLanguage | null;
  } | null>(null);
  const [fetchingCode, setFetchingCode] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [implementation, setImplementation] = useState<LibraryImplementation | null>(null);
  const unsupportedLanguage = useStore((s) => s.unsupportedLanguage);
  const sourceIssue = editorSourceIssue(code);
  const implementationId =
    implementation && implementation.language === language && code === implementation.code
      ? implementation.id
      : `draft:${language}`;
  const loadRequest = useRef<AbortController | null>(null);
  const menu = useRef<HTMLDialogElement>(null),
    drawer = useRef<HTMLDialogElement>(null),
    about = useRef<HTMLDialogElement>(null),
    share = useRef<HTMLDialogElement>(null),
    workspace = useRef<HTMLDivElement>(null),
    runner = useRef<CodeRunner | null>(null),
    runId = useRef(0);
  const executing = status === 'loading' || status === 'running';
  const busy = executing || fetchingCode;
  const run = useCallback(async () => {
    if (booting) return;
    if (loadRequest.current) return;
    const state = useStore.getState();
    if (state.status === 'loading' || state.status === 'running') return;
    if (!state.code.trim()) {
      patch({ message: 'Paste your code or load an example before running.' });
      return;
    }
    if (state.unsupportedLanguage || state.language !== editorLanguage || editorSourceIssue(state.code)) {
      patch({ message: 'Only Python can run in this editor.' });
      return;
    }
    const id = ++runId.current;
    state.beginRun();
    runner.current ??= new CodeRunner();
    patch({
      status: 'loading',
      progress: 0,
      message: `Preparing ${LANGUAGE_LABELS[state.language]}…`,
      playing: false,
      edited: true,
      result: null,
      cursor: 0,
      tab: 'visualizer',
      selectedLine: null,
    });
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (id !== runId.current) return;
      const trace = await runner.current.run(
        state.code,
        state.stdin,
        maxSteps,
        (p) => {
          if (id === runId.current)
            patch({ status: p.phase, progress: p.progress, message: p.message });
        },
        editorLanguage,
      );
      const identity = await sourceIdentity(implementationId, state.code);
      if (
        id === runId.current &&
        useStore.getState().code === state.code &&
        useStore.getState().language === state.language
      )
        useStore.getState().setResult({ ...trace, identity });
    } catch (error) {
      if (id === runId.current)
        patch({
          status: 'error',
          message: error instanceof Error ? error.message : 'Execution failed. Try again.',
        });
    } finally {
      if (id === runId.current) document.querySelector<HTMLButtonElement>('.run-button')?.focus();
    }
  }, [booting, maxSteps, patch, implementationId]);
  const stop = () => {
    runId.current++;
    runner.current?.dispose();
    patch({ status: 'idle', message: 'Run stopped.', playing: false });
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.run-button')?.focus());
  };
  const loadImplementation = async (
    algorithm: Algorithm,
    selectedLanguage: Language,
    variant: 'featured' | 'reference',
  ) => {
    if (busy || loadRequest.current || selectedLanguage !== editorLanguage) return false;
    const controller = new AbortController();
    loadRequest.current = controller;
    setFetchingCode(true);
    setLibraryError('');
    const original = useStore.getState();
    try {
      const query = new URLSearchParams({ id: algorithm.id, language: selectedLanguage, variant });
      const response = await fetch(`/api/library?${query}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(limits.libraryTimeoutMs)]),
      });
      if (!response.ok)
        throw new Error('Could not load this code. Please retry. Your editor is unchanged.');
      const parsed = implementationSchema.safeParse(await response.json());
      if (
        !parsed.success ||
        parsed.data.algorithmId !== algorithm.id ||
        parsed.data.language !== selectedLanguage ||
        parsed.data.variant !== variant
      )
        throw new Error('The library code could not be verified. Please retry.');
      const loaded = parsed.data;
      const current = useStore.getState();
      if (
        current.code !== original.code ||
        current.stdin !== original.stdin ||
        current.language !== original.language
      )
        throw new Error(
          'Your code changed while the library was loading. Select Load again when ready.',
        );
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setCode(loaded.code, variant === 'featured' ? 'sample' : 'library');
      setStdin(loaded.fixture.stdin);
      setExampleName(loaded.name);
      setDraft(null);
      setImplementation(loaded);
      patch({
        language: editorLanguage,
        languageMode: editorLanguage,
        autoSwitchEligible: false,
        tab: 'visualizer',
      });
      setFocusToken((token) => token + 1);
      return true;
    } catch (error) {
      if (!controller.signal.aborted)
        setLibraryError(
          error instanceof Error ? error.message : 'Code could not be loaded. Please retry.',
        );
      return false;
    } finally {
      if (loadRequest.current === controller) {
        loadRequest.current = null;
        setFetchingCode(false);
      }
    }
  };
  const loadExample = (example: Example) => {
    const algorithm = algorithms.find((a) => a.exampleId === example.id)!;
    void loadImplementation(
      algorithm,
      editorLanguage,
      'featured',
    );
  };
  const newCode = (name = 'Untitled') => {
    setImplementation(null);
    setLibraryError('');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setDraft({ code, stdin, name: exampleName, language, unsupportedLanguage });
    setCode('');
    setStdin('');
    setExampleName(name);
    patch({
      languageMode: useStore.getState().languageChosenManually ? languageMode : 'auto',
      tab: 'visualizer',
      message: '',
      unsupportedLanguage: null,
      selectedLine: null,
    });
    setFocusToken((token) => token + 1);
  };
  useEffect(() => {
    const load = () => {
      const shared = decodeShare(window.location.hash || window.location.search);
      if (shared) {
        runId.current++;
        runner.current?.dispose();
        useStore.getState().setCode(shared.code, 'share');
        useStore.getState().setStdin(shared.stdin);
        useStore.getState().patch({
          language: editorLanguage,
          languageMode: shared.language === editorLanguage ? editorLanguage : 'auto',
          unsupportedLanguage: unsupportedShareLanguage(shared.language),
          autoSwitchEligible: false,
        });
        setExampleName(
          examples.find(
            (example) =>
              shared.language === editorLanguage &&
              exampleCode(example, shared.language) === shared.code,
          )?.title ?? 'Shared code',
        );
      } else if (
        window.location.hash.startsWith('#code=') ||
        window.location.hash.startsWith('#s=') ||
        window.location.search.includes('s=') ||
        window.location.search.includes('code=')
      ) {
        useStore
          .getState()
          .patch({ message: 'This share link is invalid or exceeds the code limit.' });
      }
    };
    load();
    window.addEventListener('hashchange', load);
    return () => {
      window.removeEventListener('hashchange', load);
      runner.current?.dispose();
      loadRequest.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (unsupportedLanguage || sourceIssue || !code.trim()) return;
    let active = true;
    const encoder = new TextEncoder();
    crypto.subtle
      .digest('SHA-256', encoder.encode(code))
      .then((hashBuf) => {
        if (!active) return;
        const sHash = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        fetch(
          `/api/analyze?sourceHash=${sHash}&language=${language}&implementationId=${encodeURIComponent(implementationId)}`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((res) => {
            if (
              active &&
              res?.analysis?.enrichment &&
              useStore.getState().code === code &&
              useStore.getState().language === language &&
              !useStore.getState().enrichment
            ) {
              const parsed = enrichmentSchema.safeParse(res.analysis.enrichment);
              if (parsed.success) {
                useStore.getState().patch({ enrichment: parsed.data });
              }
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [code, language, unsupportedLanguage, sourceIssue, implementationId]);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (booting) return;
      const target = e.target as HTMLElement;
      const typing = target.closest(
        'input,textarea,select,[contenteditable="true"],.monaco-editor',
      );
      if (document.querySelector('dialog[open]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        void run();
        return;
      }
      if (typing || document.querySelector('dialog[open]')) return;
      if (
        target.closest('[data-native-scroll]') &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)
      )
        return;
      if (e.code === 'Space' && target.closest('button,a,summary')) return;
      if (target.closest('[role="tab"],[role="separator"]') && e.key.startsWith('Arrow')) return;
      const state = useStore.getState();
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        menu.current?.showModal();
      }
      if (state.tab !== 'visualizer' || !state.result?.steps.length) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        state.seek(state.cursor + (e.key === 'ArrowRight' ? 1 : -1));
        state.patch({ playing: false });
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.cursor === state.result.steps.length - 1) state.seek(0);
        state.patch({ playing: !state.playing });
      }
    };
    window.addEventListener('keydown', keys, true);
    return () => window.removeEventListener('keydown', keys, true);
  }, [run, booting]);
  const shareCode = async () => {
    const url =
      window.location.origin + window.location.pathname + encodeShortShare(code, stdin, unsupportedLanguage ?? language);
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setShareState('Link copied');
      setTimeout(() => setShareState(''), 2200);
    } catch {
      share.current?.showModal();
    }
  };
  const navigate = (target: typeof tab | 'examples' | 'about') => {
    menu.current?.close();
    if (target === 'examples') drawer.current?.showModal();
    else if (target === 'about') about.current?.showModal();
    else patch({ tab: target });
  };
  return (
    <>
      <a className="skip-link" href="#workspace" inert={booting || executing}>
        Skip to workspace
      </a>
      <div className="site-shell" inert={booting || executing} aria-busy={booting || busy}>
        <header className="topbar">
          <Link className="wordmark" href="/" aria-label="CodeLens home">
            <span className="slash-logo">/</span>
            <span>
              codelens<span className="logo-dot">.</span>
            </span>
          </Link>
          <span className="topbar-caption mono">A CLOSER LOOK AT YOUR CODE</span>
          <div className="topbar-actions">
            <Preferences />
            <button
              className="menu-button"
              onClick={() => menu.current?.showModal()}
              aria-haspopup="dialog"
              data-cursor="MENU"
            >
              <span className="roll-text">MENU</span>
              <Plus size={17} />
            </button>
          </div>
        </header>
        <main>
          <section className={`hero ${edited ? 'hero-docked' : ''}`} aria-label="Introduction">
            <div className="hero-definition mono">
              codelens · noun · the act of watching code think.
            </div>
            <div className="hero-heading-row">
              <h1 className="hero-title">
                <span className="hero-paste-badge">PASTE.</span> RUN.
                <br className="hero-break" /> <span>UNDERSTAND.</span>
              </h1>
              <div className="hero-note">
                <ScrollStudy />
                <p>
                  Less guessing.
                  <br />
                  More <span>getting it.</span>
                </p>
                <span className="mono">CODE VISUALIZER / V.02</span>
              </div>
            </div>
            <div className="hero-bottom mono">
              <span>EVERY LINE HAS A STORY. FOLLOW IT.</span>
              <span>
                BUILT FOR THE CURIOUS <ArrowUpRight size={13} />
              </span>
            </div>
          </section>
          <div className="marquee" aria-hidden="true">
            <div>
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i}>
                  STEP BY STEP <b>—</b> LINE BY LINE <b>—</b> CALL BY CALL <b>—</b>{' '}
                </span>
              ))}
            </div>
            <span className="marquee-static">STEP BY STEP — LINE BY LINE — CALL BY CALL</span>
          </div>
          <div className="workspace-topline">
            <span className="mono">
              <span className="status-indicator" /> YOUR WORKSPACE
            </span>
            <span className="mono dim">LOCAL EXECUTION. ZERO GUESSWORK.</span>
          </div>
          <AlgorithmBrowser
            busy={busy}
            error={libraryError}
            onLoad={loadImplementation}
            onNewCode={newCode}
          />
          {fetchingCode && (
            <p className="mono library-message" role="status">
              / loading code from the library…
            </p>
          )}
          {libraryError && (
            <p className="mono library-message" role="status">
              {libraryError}
            </p>
          )}
          {implementation && code === implementation.code && (
            <details className="library-provenance mono">
              <summary>
                LIBRARY / {implementation.variant.toUpperCase()} ·{' '}
                {implementation.language.toUpperCase()} · V{implementation.revision}
              </summary>
              <p>
                {implementation.name} · Edit the demonstration input at the bottom of the code, then
                Run.
              </p>
              {implementation.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
              <p>Expected demonstration output</p>
              <pre>{implementation.fixture.expectedStdout}</pre>
            </details>
          )}
          <div
            className="workspace"
            id="workspace"
            ref={workspace}
            style={{ '--split': `${split}%` } as React.CSSProperties}
          >
            <section className="editor-pane" aria-label="Code input">
              <div className="editor-toolbar">
                <div className="language-select">
                  <span className="language-dot" />
                  <select
                    aria-label="Programming language"
                    value={editorLanguage}
                    disabled={busy}
                    onChange={() => {
                      const next = editorLanguage;
                      useStore.getState().chooseLanguage(next);
                      const example =
                        useStore.getState().sourceOrigin === 'sample' &&
                        examples.find(
                          (item) =>
                            language === editorLanguage &&
                            exampleCode(item, language) === code,
                        );
                      setCode(
                        example ? exampleCode(example, next) : code,
                        example ? 'sample' : 'draft',
                      );
                      patch({
                        language: next,
                        tab: 'visualizer',
                        selectedLine: null,
                        enrichment: null,
                        breakdown: null,
                      });
                    }}
                  >
                    <option value="python">Python</option>
                  </select>
                  <ChevronDown size={13} />
                </div>
                {detection?.detection?.kind === 'supported' && (
                  <button
                    className="detection-chip mono"
                    disabled={busy || detection.detection.language === language}
                    onClick={() =>
                      detection.detection?.kind === 'supported' &&
                      useStore
                        .getState()
                        .applyDetection(detection.detection.language, detection.revision, true)
                    }
                  >
                    Detected: {LANGUAGE_LABELS[detection.detection.language]} ·{' '}
                    {detection.detection.language === language ? 'Selected' : 'Switch'}
                  </button>
                )}
                {detection?.detection?.kind === 'unsupported' && (
                  <span className="detection-chip mono" role="status">
                    {detection.detection.languageId === 'ts'
                      ? 'TypeScript detected — unsupported. Only Python can run in this editor.'
                      : ['c', 'cpp', 'java'].includes(detection.detection.languageId)
                        ? `${({ c: 'C', cpp: 'C++', java: 'Java' } as Record<string, string>)[detection.detection.languageId]} detected — unsupported. Only Python can run in this editor.`
                        : detection.detection.languageId === 'js'
                          ? 'JavaScript detected — unsupported. Only Python can run in this editor.'
                          : 'unsupported language detected'}
                  </span>
                )}
                {detection?.error && (
                  <span className="detection-chip mono" role="status">
                    {detection.error}
                  </span>
                )}
                <div className="editor-actions">
                  <button className="text-button mono" disabled={busy} onClick={() => newCode()}>
                    / new code <Plus size={13} />
                  </button>
                  <button
                    className="text-button mono"
                    onClick={() => drawer.current?.showModal()}
                    aria-haspopup="dialog"
                  >
                    / examples <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
              <div className="filebar mono">
                <span>
                  <span className="file-mark">{language.toUpperCase()}</span>{' '}
                  {exampleName.toLowerCase().replaceAll(' ', '_')}.
                  {language === 'python' ? 'py' : language === 'javascript' ? 'js' : language}
                </span>
                <span className="dim">{code.split('\n').length} LINES</span>
              </div>
              <CodeEditor onReady={finishBoot} focusToken={focusToken} />
              {unsupportedLanguage && (
                <p className="notice" role="status">
                  Unsupported language: {unsupportedLanguage === 'javascript' ? 'JavaScript' : unsupportedLanguage === 'cpp' ? 'C++' : 'Java'}. Source and input were preserved. Only Python can run in this editor.
                </p>
              )}
              {!unsupportedLanguage && sourceIssue && <p className="notice" role="status">{sourceIssue}</p>}
              {!code && (
                <p className="new-code-hint mono">
                  Paste your{' '}
                  {LANGUAGE_LABELS[language]}{' '}
                  code into the editor above.
                </p>
              )}
              {draft && (
                <div className="draft-undo">
                  <span className="mono dim">A fresh workspace.</span>
                  <button
                    className="text-button mono"
                    disabled={busy}
                    onClick={() => {
                      setCode(draft.code, 'sample');
                      setStdin(draft.stdin);
                      setExampleName(draft.name);
                      patch({
                        language: editorLanguage,
                        unsupportedLanguage: draft.unsupportedLanguage,
                        languageMode: editorLanguage,
                        autoSwitchEligible: false,
                      });
                      setDraft(null);
                      setFocusToken((token) => token + 1);
                    }}
                  >
                    / undo new code
                  </button>
                </div>
              )}
              <div className="editor-bottom">
                <span className="mono dim">CLICK A LINE NUMBER TO SET A BREAKPOINT</span>
                <button
                  className="text-button mono"
                  aria-expanded={showInput}
                  onClick={() => setShowInput(!showInput)}
                >
                  {showInput ? '−' : '+'} stdin
                </button>
              </div>
              {showInput && (
                <div className="stdin-box">
                  <label htmlFor="stdin" className="mono">
                    STANDARD INPUT <span className="dim">/ one value per line</span>
                  </label>
                  <textarea
                    id="stdin"
                    placeholder="Input your program expects…"
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    disabled={busy}
                    maxLength={limits.stdin}
                  />
                </div>
              )}
              <div className="run-row">
                <div className="run-settings">
                  <label className="mono dim">
                    STEP LIMIT{' '}
                    <input
                      aria-label="Maximum trace steps"
                      type="number"
                      min={limits.editorMinSteps}
                      max={limits.steps}
                      step="100"
                      value={maxSteps}
                      disabled={busy}
                      onChange={(e) =>
                        setMaxSteps(Math.min(limits.steps, Math.max(limits.editorMinSteps, Number(e.target.value) || limits.editorMinSteps)))
                      }
                    />
                  </label>
                  <span className="mono shortcut">CTRL / ⌘ ↵</span>
                </div>
                <button
                  className="run-button"
                  disabled={
                    booting ||
                    fetchingCode ||
                    (!executing &&
                      (!code.trim() || Boolean(unsupportedLanguage) || Boolean(sourceIssue)))
                  }
                  onClick={executing ? stop : () => void run()}
                  data-magnetic
                  data-cursor={executing ? 'STOP' : 'RUN'}
                >
                  {executing ? (
                    <>
                      <Square size={13} fill="currentColor" /> / stop
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="currentColor" />{' '}
                      {'/ run code'}
                    </>
                  )}
                  <ArrowUpRight size={17} />
                </button>
              </div>
              {executing && (
                <div className="runtime-status" role="status">
                  <LoaderCircle className="spinner" size={13} />
                  <span className="mono">
                    {message} {status === 'loading' ? `${progress}%` : ''}
                  </span>
                  {status === 'loading' && (
                    <progress aria-label="Runtime loading progress" max={100} value={progress} />
                  )}
                </div>
              )}
              {!busy && message && (
                <div className="notice" role={status === 'error' ? 'alert' : 'status'}>
                  {message}
                </div>
              )}
            </section>
            <div
              className="split-divider"
              role="separator"
              aria-label="Resize code and visualization panels"
              aria-orientation="vertical"
              tabIndex={0}
              aria-valuenow={split}
              aria-valuemin={30}
              aria-valuemax={65}
              data-cursor="DRAG"
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  setSplit(Math.min(65, Math.max(30, split + (e.key === 'ArrowRight' ? 2 : -2))));
                }
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                patch({ playing: false });
              }}
              onPointerMove={(e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                const rect = workspace.current?.getBoundingClientRect();
                if (rect)
                  setSplit(
                    Math.max(30, Math.min(65, ((e.clientX - rect.left) / rect.width) * 100)),
                  );
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
              }}
            >
              <span />
            </div>
            <section className="results-pane" aria-label="Execution results">
              <div className="tabs" role="tablist" aria-label="Result views">
                {(['visualizer', 'breakdown', 'analysis', 'complexity'] as const).map((name, i) => (
                  <button
                    role="tab"
                    id={`tab-${name}`}
                    aria-selected={tab === name}
                    aria-controls={`panel-${name}`}
                    tabIndex={tab === name ? 0 : -1}
                    className={tab === name ? 'active-tab' : ''}
                    key={name}
                    onClick={() => patch({ tab: name })}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        const names = [
                          'visualizer',
                          'breakdown',
                          'analysis',
                          'complexity',
                        ] as const;
                        const delta = e.key === 'ArrowRight' ? 1 : -1;
                        const next = names[(i + delta + names.length) % names.length];
                        patch({ tab: next });
                        document.getElementById(`tab-${next}`)?.focus();
                      }
                    }}
                  >
                    <span className="mono">0{i + 1}</span> {name}
                  </button>
                ))}
              </div>
              <div
                className="tab-content"
                key={tab}
                role="tabpanel"
                id={`panel-${tab}`}
                aria-labelledby={`tab-${tab}`}
                tabIndex={0}
              >
                {unsupportedLanguage || sourceIssue ? (
                  <p className="empty-note">Use Python to inspect and run this source.</p>
                ) : tab === 'visualizer' ? (
                  <Visualizer />
                ) : tab === 'breakdown' ? (
                  <Breakdown implementationId={implementationId} />
                ) : tab === 'analysis' ? (
                  <Analysis
                    key={`${implementationId}:${language}:${code}`}
                    implementationId={implementationId}
                  />
                ) : (
                  <ComplexityView implementationId={implementationId} />
                )}
              </div>
            </section>
          </div>
          <div className="workspace-foot">
            <span className="mono dim">
              ← → STEP <span>/</span> SPACE PLAY <span>/</span> M MENU
            </span>
            <span className="mono dim">
              {result
                ? `${result.steps.length} STEPS / ${result.elapsed} MS`
                : 'YOUR CODE STAYS IN YOUR BROWSER'}
            </span>
            <button
              className="text-button mono"
              onClick={() => void shareCode()}
              data-cursor="COPY"
            >
              <Share2 size={13} /> {shareState || '/ share'}
            </button>
            <span className="sr-only" role="status">
              {shareState}
            </span>
          </div>
        </main>
        <footer className="site-footer">
          <span className="footer-statement">
            CODE IS A PROCESS.
            <br />
            <span>NOW YOU CAN SEE IT.</span>
          </span>
          <div className="footer-links mono">
            <button onClick={() => about.current?.showModal()}>
              / about <ArrowUpRight size={12} />
            </button>
            <Link href="/design">
              / design system <ArrowUpRight size={12} />
            </Link>
            <span className="dim">CODELENS © 2026</span>
          </div>
        </footer>
      </div>
      <dialog ref={menu} className="menu-dialog" aria-labelledby="menu-title">
        <div className="dialog-top">
          <span className="wordmark" id="menu-title">
            / codelens.
          </span>
          <button className="text-button mono" onClick={() => menu.current?.close()}>
            RETURN <X size={19} />
          </button>
        </div>
        <nav className="overlay-nav">
          {['Visualizer', 'Breakdown', 'Analysis', 'Complexity', 'Examples', 'About'].map(
            (name, i) => (
              <button
                key={name}
                onClick={() => navigate(name.toLowerCase() as typeof tab | 'examples' | 'about')}
              >
                <span className="mono">0{i + 1}</span>
                <span>{name}</span>
                <ArrowUpRight />
              </button>
            ),
          )}
        </nav>
        <div className="dialog-bottom mono">
          <span>WATCH CODE THINK.</span>
          <span>ESC TO RETURN</span>
        </div>
      </dialog>
      <dialog ref={drawer} className="examples-dialog" aria-labelledby="examples-title">
        <div className="dialog-top">
          <span className="mono">THE EXAMPLES INDEX</span>
          <button
            className="icon-button"
            aria-label="Close examples"
            onClick={() => drawer.current?.close()}
          >
            <X size={21} />
          </button>
        </div>
        <h2 id="examples-title">
          A PLACE
          <br />
          TO START<span>.</span>
        </h2>
        <p className="drawer-intro">
          {examples.length} small Python programs. A whole lot to see.
        </p>
        <div className="example-index">
          {examples.map((example) => (
            <button
              key={example.id}
              disabled={busy}
              onClick={() => {
                loadExample(example);
                drawer.current?.close();
                patch({ tab: 'visualizer' });
              }}
            >
              <span className="example-code mono">EX.{example.id}</span>
              <div className="example-text">
                <strong>{example.title}</strong>
                <span className="mono dim">{example.category}</span>
                <p>{example.description}</p>
              </div>
              <div className="mini-preview" aria-hidden="true">
                {example.preview.slice(0, 5).map((n, i) => (
                  <span key={i} style={{ height: `${18 + n * 2}px` }}>
                    {n}
                  </span>
                ))}
              </div>
              <ArrowUpRight size={20} />
            </button>
          ))}
        </div>
        <p className="mono dim drawer-end">
          {`REAL ${LANGUAGE_LABELS[language].toUpperCase()}. REAL EXECUTION.`}{' '}
          EVERY SINGLE STEP.
        </p>
      </dialog>
      <dialog ref={about} className="about-dialog" aria-labelledby="about-title">
        <div className="dialog-top">
          <span className="mono">05 / ABOUT</span>
          <button
            className="icon-button"
            aria-label="Close about"
            onClick={() => about.current?.close()}
          >
            <X size={21} />
          </button>
        </div>
        <div className="about-scroll">
          <div className="about-content">
            <h2 id="about-title" className="about-reveal">
              WATCH
              <br />
              CODE THINK<span>.</span>
            </h2>
            <p className="about-reveal">
              CodeLens is a space between writing code and understanding it. Follow a program
              through its real execution, one line, one variable, one call at a time.
            </p>
            <div className="about-facts mono about-reveal">
              <p>01 / PYTHON AND JAVASCRIPT RUN LOCALLY IN WEB WORKERS.</p>
              <p>02 / NO API KEY. NO SERVER EXECUTION.</p>
              <p>03 / SHARING PUTS YOUR CODE IN THE LINK.</p>
            </div>
            <p className="about-reveal">
              Explore real execution, linked structures, recursion, AST analysis and measured
              complexity estimates. AI notes and suggestions are optional. Requesting AI sends your
              source to the configured provider only when requesting notes or advice.
            </p>
            <p className="mono dim about-reveal">
              Snapshots capture user-code events, not the internals of library functions. Huge
              values, deep objects, output, and execution are bounded. The worker is isolated from
              the page and its network APIs are disabled after loading. It is a learning tool, not a
              hardened security boundary for hostile code.
            </p>
            <Link className="text-button mono" href="/design">
              / explore the design system <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </dialog>
      <dialog ref={share} className="share-dialog" aria-labelledby="share-title">
        <div className="dialog-top">
          <h2 id="share-title">Copy your link</h2>
          <button
            className="icon-button"
            aria-label="Close share link"
            onClick={() => share.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <p>Code and input are stored in the URL. Anyone with the link can read them.</p>
        <input
          aria-label="Share link"
          readOnly
          value={shareUrl}
          onFocus={(e) => e.target.select()}
        />
      </dialog>
      <AnimatePresence>
        {executing ? (
          <LoadingScreen
            key="run"
            mode="run"
            language={language}
            phase={status === 'running' ? 'running' : 'loading'}
            progress={progress}
            message={message}
            reduced={reduced}
            onCancel={stop}
          />
        ) : null}
      </AnimatePresence>
      {!reduced && <Decorative />}
    </>
  );
}
