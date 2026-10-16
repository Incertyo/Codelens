import { create } from 'zustand';
import { examples } from './examples';
import type { TraceResult } from './trace';
import type { BreakdownData, Enrichment, Language } from './breakdown';
import { canAutoSwitch, type LanguageMode, type SourceOrigin } from './language-detection';
type State = {
  code: string;
  sourceRevision: number;
  runEpoch: number;
  maxSteps: number;
  language: Language;
  unsupportedLanguage: 'cpp' | 'java' | null;
  languageMode: LanguageMode;
  languageChosenManually: boolean;
  sourceOrigin: SourceOrigin;
  autoSwitchEligible: boolean;
  breakdown: BreakdownData | null;
  enrichment: Enrichment | null;
  selectedLine: number | null;
  stdin: string;
  result: TraceResult | null;
  cursor: number;
  playing: boolean;
  speed: number;
  breakpoints: number[];
  status: 'idle' | 'loading' | 'running' | 'ready' | 'error';
  progress: number;
  message: string;
  edited: boolean;
  tab: 'visualizer' | 'breakdown' | 'analysis' | 'complexity';
  theme: 'dark' | 'light';
  reduced: boolean;
  setCode: (code: string, origin?: SourceOrigin) => void;
  chooseLanguage: (mode: LanguageMode) => void;
  applyDetection: (language: Language, revision: number, explicit?: boolean) => void;
  setStdin: (stdin: string) => void;
  setMaxSteps: (maxSteps: number) => void;
  beginRun: () => void;
  setResult: (result: TraceResult) => void;
  seek: (index: number) => void;
  toggleBreakpoint: (line: number) => void;
  patch: (partial: Partial<State>) => void;
};
export const useStore = create<State>((set, get) => ({
  code: examples[0].code,
  sourceRevision: 0,
  runEpoch: 0,
  maxSteps: 5000,
  language: 'python',
  unsupportedLanguage: null,
  languageMode: 'auto',
  languageChosenManually: false,
  sourceOrigin: 'sample',
  autoSwitchEligible: false,
  breakdown: null,
  enrichment: null,
  selectedLine: null,
  stdin: '',
  result: null,
  cursor: 0,
  playing: false,
  speed: 2,
  breakpoints: [],
  status: 'idle',
  progress: 0,
  message: '',
  edited: false,
  tab: 'visualizer',
  theme: 'dark',
  reduced: false,
  setCode: (code, origin = 'draft') =>
    set((previous) => ({
      code,
      sourceOrigin: origin,
      unsupportedLanguage: origin === 'sample' || origin === 'library' ? null : previous.unsupportedLanguage,
      autoSwitchEligible:
        origin === 'draft' &&
        !previous.languageChosenManually &&
        (previous.autoSwitchEligible ||
          !previous.code.trim() ||
          (!previous.edited && previous.sourceOrigin === 'sample')),
      sourceRevision: previous.sourceRevision + 1,
      runEpoch: previous.runEpoch + 1,
      edited: true,
      result: null,
      cursor: 0,
      playing: false,
      breakpoints: [],
      status: 'idle',
      message: '',
      breakdown: null,
      enrichment: null,
      selectedLine: null,
    })),
  chooseLanguage: (mode) =>
    set((previous) => ({
      runEpoch: previous.runEpoch + 1,
      languageMode: mode,
      languageChosenManually: previous.languageChosenManually || mode !== 'auto',
      ...(mode === 'auto'
        ? {}
        : {
            language: mode,
            unsupportedLanguage: null,
            result: null,
            status: 'idle' as const,
            playing: false,
            cursor: 0,
            breakdown: null,
            enrichment: null,
            selectedLine: null,
          }),
    })),
  applyDetection: (language, revision, explicit = false) => {
    const state = get();
    if (
      state.sourceRevision !== revision ||
      state.languageMode !== 'auto' ||
      ['loading', 'running'].includes(state.status) ||
      (!explicit && !canAutoSwitch(state))
    )
      return;
    if (!explicit && state.language === language) {
      set({ autoSwitchEligible: false });
      return;
    }

    set({
      language,
      autoSwitchEligible: false,
      sourceRevision: state.sourceRevision + 1,
      runEpoch: state.runEpoch + 1,
      ...(explicit ? { languageMode: language, languageChosenManually: true } : {}),
      result: null,
      status: 'idle',
      playing: false,
      cursor: 0,
      breakdown: null,
      enrichment: null,
      selectedLine: null,
    });
  },
  setStdin: (stdin) =>
    set((previous) => ({
      runEpoch: previous.runEpoch + 1,
      stdin,
      result: null,
      enrichment: null,
      cursor: 0,
      playing: false,
      status: 'idle',
      message: '',
    })),
  setMaxSteps: (maxSteps) =>
    set((previous) => ({
      maxSteps: Math.min(5000, Math.max(100, maxSteps || 100)),
      runEpoch: previous.runEpoch + 1,
      result: null,
      enrichment: null,
      cursor: 0,
      playing: false,
      status: 'idle',
      message: '',
    })),
  beginRun: () => set((previous) => ({ runEpoch: previous.runEpoch + 1 })),
  setResult: (result) =>
    set({ result, cursor: 0, playing: false, status: 'ready', progress: 100, message: '' }),
  seek: (index) =>
    set({
      cursor: Math.min(Math.max(0, index), Math.max(0, (get().result?.steps.length ?? 1) - 1)),
    }),
  toggleBreakpoint: (line) =>
    set((s) => ({
      breakpoints: s.breakpoints.includes(line)
        ? s.breakpoints.filter((l) => l !== line)
        : [...s.breakpoints, line],
    })),
  patch: (partial) => set(partial),
}));
