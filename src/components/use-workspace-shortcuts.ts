'use client';
import { useEffect, type RefObject } from 'react';
import { useStore } from '@/lib/store';

export function useWorkspaceShortcuts(run: () => Promise<void>, booting: boolean, menu: RefObject<HTMLDialogElement | null>) {
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
        state.setPlaying(false);
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.cursor === state.result.steps.length - 1) state.seek(0);
        state.setPlaying(!state.playing);
      }
    };
    window.addEventListener('keydown', keys, true);
    return () => window.removeEventListener('keydown', keys, true);
  }, [run, booting, menu]);

}
