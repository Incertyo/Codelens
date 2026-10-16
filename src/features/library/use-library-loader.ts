'use client';
import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useStore } from "@/features/workspace/public/store";
import { algorithms, type Algorithm } from "@/lib/algorithm-catalog";
import type { Example } from "@/lib/examples";
import type { Language } from "@/shared/breakdown";
import { implementationSchema, type LibraryImplementation } from "@/features/library/contract";
import { editorLanguage } from "@/features/editor/public/policy";
import { limits } from "@/shared/limits";

type LibraryLoaderOptions = {
  executing: boolean;
  setExampleName: Dispatch<SetStateAction<string>>;
  setFocusToken: Dispatch<SetStateAction<number>>;
  clearDraft: () => void;
};
export function useLibraryLoader({ executing, setExampleName, setFocusToken, clearDraft }: LibraryLoaderOptions) {
  const [fetchingCode, setFetchingCode] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [implementation, setImplementation] = useState<LibraryImplementation | null>(null);
  const loadRequest = useRef<AbortController | null>(null);
  const busy = executing || fetchingCode;
  const setCode = useStore((s) => s.setCode);
  const setStdin = useStore((s) => s.setStdin);
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
      clearDraft();
      setImplementation(loaded);
      useStore.getState().selectSource({
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

  return { fetchingCode, libraryError, setLibraryError, implementation, setImplementation, loadRequest, loadImplementation, loadExample };
}
