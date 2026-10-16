'use client';
import { limits } from "@/shared/limits";
import dynamic from 'next/dynamic';
import { useWorkspaceRun } from "./use-run-controller";
import { useLibraryLoader } from "../library/public/use-library-loader";
import { useWorkspaceShortcuts } from "./use-shortcuts";
import { useStoredNotes } from "./use-stored-notes";
import { WorkspaceDialogs } from "./workspace-dialogs";
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus, Play, Square, Share2, LoaderCircle } from 'lucide-react';
import { useStore } from "@/features/workspace/store";
import { examples } from "@/lib/examples";
import { type Language } from "@/shared/breakdown";
import { decodeShare, encodeShortShare } from "@/features/share/public/codec";
import { Preferences, usePreferences } from "../preferences/public/preferences";
import { Visualizer } from "../visualizer/public/visualizer";
import { AlgorithmBrowser } from "../library/public/algorithm-browser";
import { LoadingScreen } from "../intro/public/loading-screen";
import { ScrollStudy } from "../intro/public/scroll-study";
import { editorLanguage, editorSourceIssue, unsupportedShareLanguage, type UnsupportedEditorLanguage } from "@/features/editor/public/policy";
import { usePageIntro } from "../intro/public/page-intro";
const Analysis = dynamic(() => import("../insights/public/analysis").then((m) => m.Analysis));
const Breakdown = dynamic(() => import("../insights/public/breakdown").then((m) => m.Breakdown), {
  loading: () => <p className="empty-note mono">/ loading breakdown</p>,
});
const ComplexityView = dynamic(() => import("../insights/public/complexity-view").then((m) => m.ComplexityView));
const CodeEditor = dynamic(() => import("../editor/public/code-editor").then((m) => m.CodeEditor), {
  ssr: false,
  loading: () => <div className="editor-body editor-loading mono">/ loading editor</div>,
});
const Decorative = dynamic(() => import("../intro/public/decorative"), { ssr: false });
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
    result = useStore((s) => s.result);
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
  const { fetchingCode, libraryError, setLibraryError, implementation, setImplementation, loadRequest, loadImplementation, loadExample } = useLibraryLoader({
    executing: status === 'loading' || status === 'running',
    setExampleName,
    setFocusToken,
    clearDraft: () => setDraft(null),
  });
  const unsupportedLanguage = useStore((s) => s.unsupportedLanguage);
  const sourceIssue = editorSourceIssue(code);
  const implementationId =
    implementation && implementation.language === language && code === implementation.code
      ? implementation.id
      : `draft:${language}`;
  const menu = useRef<HTMLDialogElement>(null),
    drawer = useRef<HTMLDialogElement>(null),
    about = useRef<HTMLDialogElement>(null),
    share = useRef<HTMLDialogElement>(null),
    workspace = useRef<HTMLDivElement>(null);
  const executing = status === 'loading' || status === 'running';
  const busy = executing || fetchingCode;
  const { run, stop, cancel } = useWorkspaceRun(booting, maxSteps, implementationId, loadRequest);
  const newCode = (name = 'Untitled') => {
    setImplementation(null);
    setLibraryError('');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setDraft({ code, stdin, name: exampleName, language, unsupportedLanguage });
    setCode('');
    setStdin('');
    setExampleName(name);
    useStore.getState().selectSource({
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
        cancel();
        useStore.getState().setCode(shared.code, 'share');
        useStore.getState().setStdin(shared.stdin);
        useStore.getState().selectSource({
          language: editorLanguage,
          unsupportedLanguage: unsupportedShareLanguage(shared.language),
        });
        setExampleName(
          examples.find(
            (example) =>
              shared.language === editorLanguage &&
              example.code === shared.code,
          )?.title ?? 'Shared code',
        );
      } else if (
        window.location.hash.startsWith('#code=') ||
        window.location.hash.startsWith('#s=') ||
        window.location.search.includes('s=') ||
        window.location.search.includes('code=')
      ) {
        useStore
          .getState().setMessage('This share link is invalid or exceeds the code limit.');
      }
    };
    load();
    window.addEventListener('hashchange', load);
    const abortCurrentLoad = loadRequest.current;
    return () => {
      window.removeEventListener('hashchange', load);
      cancel();
      abortCurrentLoad?.abort();
    };
  }, [cancel, loadRequest]);
  useStoredNotes(code, language, unsupportedLanguage, sourceIssue, implementationId);
  useWorkspaceShortcuts(run, booting, menu);
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
    else useStore.getState().selectTab(target);
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
                  Paste your Python code into the editor above.
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
                      useStore.getState().selectSource({
                        language: editorLanguage,
                        unsupportedLanguage: draft.unsupportedLanguage,
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
                useStore.getState().setPlaying(false);
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
                    onClick={() => useStore.getState().selectTab(name)}
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
                        useStore.getState().selectTab(next);
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
      <WorkspaceDialogs menu={menu} drawer={drawer} about={about} share={share} busy={busy} language={language} shareUrl={shareUrl} navigate={navigate} loadExample={loadExample} />
      <AnimatePresence
        onExitComplete={() => {
          document.querySelector<HTMLButtonElement>('.run-button')?.focus();
        }}
      >
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
