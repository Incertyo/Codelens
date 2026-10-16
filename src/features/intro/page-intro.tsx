'use client';
import { limits } from '@/shared/limits';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { preferenceStorage } from "@/shared/storage";
import { INTRO_MAX_MS, INTRO_MIN_MS, INTRO_SKIP_MS, introProgress, type IntroReadiness } from "@/features/intro/policy";

declare global {
  interface Window {
    __codelensIntroStarted?: number;
    __codelensIntroTimer?: number;
    __codelensIntroExpired?: boolean;
    __codelensIntroHydrated?: boolean;
  }
}
const IntroContext = createContext({ active: false, editorReady: () => {} });
export const usePageIntro = () => useContext(IntroContext);

export function PageIntro({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<'opening' | 'exiting' | 'done'>('opening');
  const [counter, setCounter] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const ready = useRef<IntroReadiness>({
    hydration: false,
    fonts: false,
    editor: pathname !== '/',
    manifest: false,
  });
  const phaseRef = useRef('opening');
  const reduced = useRef(false);
  const skipReady = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const editorReady = useCallback(() => {
    ready.current.editor = true;
  }, []);
  const exit = useCallback(() => {
    if (phaseRef.current !== 'opening') return;
    phaseRef.current = 'exiting';
    setPhase('exiting');
    clearTimeout(window.__codelensIntroTimer);
    exitTimer.current = setTimeout(
      () => {
        phaseRef.current = 'done';
        setPhase('done');
      },
      reduced.current ? 120 : 420,
    );
  }, []);
  useEffect(() => {
    if (phase !== 'done') return;

    const old = previousFocus.current;
    const target =
      old && old !== document.body && old.isConnected
        ? old
        : (document.querySelector<HTMLElement>('[aria-label="Programming language"]') ??
          document.querySelector<HTMLElement>('main'));
    if (target) {
      if (!target.matches('button,input,select,textarea,a,[tabindex]')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }, [phase]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let frame = 0;
    let shown = 0;
    let rounded = 0;
    const started = window.__codelensIntroStarted ?? performance.now();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let savedReduced = false;
    try {
      savedReduced = preferenceStorage.getItem('codelens-motion') === 'reduce';
    } catch {}
    reduced.current = media.matches || savedReduced;
    window.__codelensIntroHydrated = true;
    previousFocus.current ??= document.activeElement as HTMLElement;
    panel.current?.focus({ preventScroll: true });
    ready.current.hydration = true;
    const mediaChanged = () => {
      reduced.current = media.matches || savedReduced;
    };
    media.addEventListener('change', mediaChanged);
    Promise.all([
      document.fonts.load('600 16px "Doto"'),
      document.fonts.load('400 16px "Space Grotesk"'),
      document.fonts.ready,
    ])
      .then(() => {
        if (active) ready.current.fonts = true;
      })
      .catch(() => {});
    fetch('/runtime-assets.json', {
      cache: 'no-cache',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(limits.introManifestTimeoutMs)]),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const manifest = await response.json();
        if (
          active &&
          /^\/pyodide\/[a-f0-9]{16}$/.test(manifest.pyodide) &&
          /^\/monaco\/[a-f0-9]{16}\/vs$/.test(manifest.monaco) &&
          /^\/language-detection\/[a-f0-9]{16}$/.test(manifest.languageDetection)
        )
          ready.current.manifest = true;
      })
      .catch(() => {});
    const expired = () => exit();
    window.addEventListener('codelens:intro-expired', expired);
    const keys = (event: KeyboardEvent) => {
      if (phaseRef.current === 'done') return;
      if (event.key === 'Tab') {
        event.preventDefault();
        panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
      }
      if (skipReady.current && ['Enter', 'Escape'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        exit();
      }
    };
    window.addEventListener('keydown', keys, true);
    const tick = () => {
      if (!active || phaseRef.current !== 'opening') return;
      const elapsed = performance.now() - started;
      const target = introProgress(ready.current);
      shown = reduced.current
        ? target
        : Math.min(target, shown + Math.max(0.7, (target - shown) * 0.12));
      const next = Math.floor(shown);
      if (next !== rounded) {
        rounded = next;
        setCounter(next);
      }
      if (!skipReady.current && elapsed >= INTRO_SKIP_MS) {
        skipReady.current = true;
        setCanSkip(true);
      }
      const minimum = reduced.current ? 180 : INTRO_MIN_MS;
      if (
        (target === 100 && next === 100 && elapsed >= minimum) ||
        elapsed >= (reduced.current ? 2000 : INTRO_MAX_MS) ||
        window.__codelensIntroExpired
      ) {
        exit();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      active = false;
      controller.abort();
      cancelAnimationFrame(frame);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      media.removeEventListener('change', mediaChanged);
      window.removeEventListener('codelens:intro-expired', expired);
      window.removeEventListener('keydown', keys, true);
    };
  }, [exit]);
  const active = phase !== 'done';
  const context = useMemo(() => ({ active, editorReady }), [active, editorReady]);
  return (
    <IntroContext.Provider value={context}>
      <div data-intro-background inert={active} aria-busy={active}>
        {children}
      </div>
      {active && (
        <div
          className="page-intro"
          data-testid="site-loading"
          data-exiting={phase === 'exiting'}
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-title"
          tabIndex={-1}
          onClick={() => {
            if (skipReady.current) exit();
          }}
        >
          <div className="intro-top mono">
            <span id="intro-title">/ CODELENS</span>
            <span>ONE LINE AT A TIME</span>
          </div>
          <div className="intro-center">
            <div className="intro-counter doto" aria-hidden="true">
              {String(counter).padStart(3, '0')}
              <span>%</span>
            </div>
            <p className="intro-reduced mono">OPENING CODELENS</p>
            <progress value={counter} max={100} aria-label="Workspace readiness" />
            <p className="intro-definition mono">
              <strong>codelens</strong> /ˈkəʊdlɛnz/ · noun
              <br />
              the act of watching code think.
            </p>
          </div>
          <div className="intro-stripe" aria-hidden="true">
            <div>
              {[0, 1].map((copy) => (
                <span key={copy}>
                  CODE → TRACE → UNDERSTAND · LINE BY LINE · CODE → TRACE → UNDERSTAND · LINE BY
                  LINE ·{' '}
                </span>
              ))}
            </div>
          </div>
          <div className="intro-bottom mono">
            <span role="status">Preparing fonts, editor and local assets.</span>
            <button
              disabled={!canSkip}
              onClick={(e) => {
                e.stopPropagation();
                exit();
              }}
            >
              Skip intro · Enter / Esc
            </button>
          </div>
        </div>
      )}
    </IntroContext.Provider>
  );
}
