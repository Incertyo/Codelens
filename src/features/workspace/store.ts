import { limits } from "@/shared/limits";
import { create } from 'zustand';
import { examples } from "../../lib/examples";
import type { TraceResult } from "../../shared/trace";
import type { BreakdownData, Enrichment, Language } from "../../shared/breakdown";
import type { SourceOrigin } from "../editor/public/language-detection";
import type { UnsupportedEditorLanguage } from "../editor/public/policy";
export type State = {
  code: string;
  sourceRevision: number;
  runEpoch: number;
  maxSteps: number;
  language: Language;
  unsupportedLanguage: UnsupportedEditorLanguage | null;
  sourceOrigin: SourceOrigin;
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
  tab: 'visualizer' | 'insights' | 'complexity';
  theme: 'dark' | 'light';
  reduced: boolean;
  setCode: (code: string, origin?: SourceOrigin) => void;
  setStdin: (stdin: string) => void;
  setMaxSteps: (maxSteps: number) => void;
  beginRun: () => void;
  setResult: (result: TraceResult) => void;
  seek: (index: number) => void;
  toggleBreakpoint: (line: number) => void;
  setMessage: (message: string) => void;
  updateRun: (state: Partial<Pick<State, 'status' | 'progress' | 'message' | 'playing' | 'edited' | 'result' | 'cursor' | 'tab' | 'selectedLine'>>) => void;
  selectSource: (state: Partial<Pick<State, 'language' | 'unsupportedLanguage' | 'tab' | 'selectedLine' | 'enrichment' | 'breakdown' | 'message'>>) => void;
  selectLine: (line: number | null, pause?: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  selectTab: (tab: State['tab']) => void;
  setPreferences: (preferences: Partial<Pick<State, 'theme' | 'reduced'>>) => void;
  setBreakdown: (breakdown: BreakdownData | null) => void;
  setEnrichment: (enrichment: Enrichment | null) => void;
};
export const useStore = create<State>((set, get) => ({
  code: examples[0].code,
  sourceRevision: 0,
  runEpoch: 0,
  maxSteps: limits.steps,
  language: 'python',
  unsupportedLanguage: null,
  sourceOrigin: 'sample',
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
      maxSteps: Math.min(limits.steps, Math.max(limits.editorMinSteps, maxSteps || limits.editorMinSteps)),
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
  setMessage: (message) => set({ message }),
  updateRun: (state) => set(state),
  selectSource: (state) => set(state),
  selectLine: (selectedLine, pause = false) => set({ selectedLine, ...(pause ? { playing: false } : {}) }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  selectTab: (tab) => set({ tab }),
  setPreferences: (preferences) => set(preferences),
  setBreakdown: (breakdown) => set({ breakdown }),
  setEnrichment: (enrichment) => set({ enrichment }),
}));
