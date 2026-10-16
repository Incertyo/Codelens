import { limits } from '@/shared/limits';
export const INTRO_MIN_MS = limits.introMinMs;
export const INTRO_SKIP_MS = limits.introSkipMs;
export const INTRO_MAX_MS = limits.introMaxMs;
export type IntroReadiness = {
  hydration: boolean;
  fonts: boolean;
  editor: boolean;
  manifest: boolean;
};
export const introProgress = (ready: IntroReadiness) =>
  (ready.hydration ? 20 : 0) +
  (ready.fonts ? 20 : 0) +
  (ready.manifest ? 20 : 0) +
  (ready.editor ? 40 : 0);

export const INTRO_WATCHDOG = `(() => {
  window.__codelensIntroStarted = performance.now();
  window.__codelensIntroTimer = setTimeout(() => {
    window.__codelensIntroExpired = true;
    if (window.__codelensIntroHydrated) {
      window.dispatchEvent(new Event('codelens:intro-expired'));
    } else {
      document.documentElement.dataset.introExpired = 'true';
      document.querySelectorAll('[data-intro-background],.site-shell,.skip-link').forEach(el => {
        el.removeAttribute('inert');
        el.setAttribute('aria-busy', 'false');
      });
    }
  }, ${INTRO_MAX_MS});
})();`;
