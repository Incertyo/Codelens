'use client';
import Link from 'next/link';
import type { RefObject } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { useStore, type State } from "@/features/workspace/store";
import { examples, type Example } from "@/lib/examples";
import type { Language } from "@/shared/breakdown";
import { LANGUAGE_LABELS } from "@/features/editor/public/language-detection";

type WorkspaceDialogsProps = {
  menu: RefObject<HTMLDialogElement | null>;
  drawer: RefObject<HTMLDialogElement | null>;
  about: RefObject<HTMLDialogElement | null>;
  share: RefObject<HTMLDialogElement | null>;
  busy: boolean;
  language: Language;
  shareUrl: string;
  navigate: (target: State['tab'] | 'examples' | 'about') => void;
  loadExample: (example: Example) => void;
};
export function WorkspaceDialogs({ menu, drawer, about, share, busy, language, shareUrl, navigate, loadExample }: WorkspaceDialogsProps) {
  return <>
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
          {['Visualizer', 'Insights', 'Complexity', 'Examples', 'About'].map(
            (name, i) => (
              <button
                key={name}
                onClick={() => navigate(name.toLowerCase() as State['tab'] | 'examples' | 'about')}
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
                useStore.getState().selectTab('visualizer');
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
              <p>01 / PYTHON RUNS LOCALLY IN WEB WORKERS.</p>
              <p>02 / NO API KEY. NO SERVER EXECUTION.</p>
              <p>03 / SHARING PUTS YOUR CODE IN THE LINK.</p>
            </div>
            <p className="about-reveal">
              Explore real execution, linked structures, recursion, AST analysis and measured
              complexity estimates. Opening Insights automatically sends your source to the
              configured AI provider for notes and advice when available. Local AST analysis works
              without AI. Stdin, output and runtime values stay local.
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

  </>;
}
