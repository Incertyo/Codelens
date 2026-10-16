'use client';
import { useCallback, useRef, type RefObject } from 'react';
import { useStore } from "@/features/workspace/store";
import { CodeRunner } from "@/features/runner/public/code-runner";
import { sourceIdentity } from "@/features/insights/public/model/analysis";
import { LANGUAGE_LABELS } from "@/features/editor/public/language-detection";
import { editorLanguage, editorSourceIssue } from "@/features/editor/public/policy";

export function useWorkspaceRun(booting: boolean, maxSteps: number, implementationId: string, loadRequest: RefObject<AbortController | null>) {
  const runner = useRef<CodeRunner | null>(null);
  const runId = useRef(0);
  const run = useCallback(async () => {
    if (booting) return;
    if (loadRequest.current) return;
    const state = useStore.getState();
    if (state.status === 'loading' || state.status === 'running') return;
    if (!state.code.trim()) {
      useStore.getState().setMessage('Paste your code or load an example before running.');
      return;
    }
    if (state.unsupportedLanguage || state.language !== editorLanguage || editorSourceIssue(state.code)) {
      useStore.getState().setMessage('Only Python can run in this editor.');
      return;
    }
    const id = ++runId.current;
    state.beginRun();
    runner.current ??= new CodeRunner();
    useStore.getState().updateRun({
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
            useStore.getState().updateRun({ status: p.phase, progress: p.progress, message: p.message });
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
        useStore.getState().updateRun({
          status: 'error',
          message: error instanceof Error ? error.message : 'Execution failed. Try again.',
        });
    } finally {
      if (id === runId.current) document.querySelector<HTMLButtonElement>('.run-button')?.focus();
    }
  }, [booting, maxSteps, implementationId, loadRequest]);
  const cancel = useCallback(() => {
    runId.current++;
    runner.current?.dispose();
  }, []);

  const stop = () => {
    cancel();
    useStore.getState().updateRun({ status: 'idle', message: 'Run stopped.', playing: false });
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.run-button')?.focus());
  };

  return { run, stop, cancel };
}
