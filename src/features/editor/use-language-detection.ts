'use client';
import { limits } from "@/shared/limits";
import { useEffect, useRef, useState } from 'react';
import { useStore } from "@/features/workspace/public/store";
import { DETECTION_MIN_CHARS, heuristicDetection, type Detection } from "@/features/editor/language-detection";
import { editorDetection } from "@/features/editor/policy";

export function useLanguageDetection() {
  const code = useStore((s) => s.code),
    revision = useStore((s) => s.sourceRevision),
    mode = useStore((s) => s.languageMode),
    origin = useStore((s) => s.sourceOrigin),
    busy = useStore((s) => s.status === 'loading' || s.status === 'running');
  const [result, setResult] = useState<{
    revision: number;
    detection?: Detection;
    error?: string;
  } | null>(null);
  const worker = useRef<Worker | null>(null);
  const enabled = mode === 'auto' && origin === 'draft' && !busy;
  useEffect(() => {
    if (!enabled || code.replace(/\s/g, '').length < DETECTION_MIN_CHARS) return;
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cleanupWorker = () => {};
    const accept = (rawDetection: Detection) => {
      const detection = editorDetection(rawDetection);
      if (
        !active ||
        useStore.getState().sourceRevision !== revision ||
        useStore.getState().languageMode !== 'auto'
      )
        return;
      setResult({ revision, detection });
      if (detection.kind === 'supported')
        useStore.getState().applyDetection(detection.language, revision);
    };
    const timer = setTimeout(() => {
      const heuristic = heuristicDetection(code);
      if (heuristic.kind !== 'ambiguous') {
        accept(heuristic);
        return;
      }

      try {
        worker.current ??= new Worker(
          new URL("./workers/language-detection.worker.ts", import.meta.url),
        );
      } catch {
        setResult({
          revision,
          error: 'Automatic language detection is unavailable. Choose a language manually.',
        });
        return;
      }
      const current = worker.current;
      const message = (
        event: MessageEvent<{ id: number; detection?: Detection; error?: string }>,
      ) => {
        if (event.data.id !== revision || !active) return;
        clearTimeout(timeout);
        if (event.data.detection) accept(event.data.detection);
        else setResult({ revision, error: event.data.error });
      };
      const failed = () => {
        if (active)
          setResult({
            revision,
            error: 'Automatic language detection is unavailable. Choose a language manually.',
          });
        current.terminate();
        if (worker.current === current) worker.current = null;
      };
      current.addEventListener('message', message);
      current.addEventListener('error', failed);
      cleanupWorker = () => {
        current.removeEventListener('message', message);
        current.removeEventListener('error', failed);
      };
      timeout = setTimeout(failed, limits.detectionTimeoutMs);
      current.postMessage({ id: revision, code: code.slice(0, limits.code) });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(timeout);
      cleanupWorker();
    };
  }, [code, revision, enabled]);
  useEffect(() => () => worker.current?.terminate(), []);
  return enabled && result?.revision === revision ? result : null;
}
