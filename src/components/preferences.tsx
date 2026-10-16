'use client';
import { useEffect } from 'react';
import { Moon, Sun, Activity } from 'lucide-react';
import { useStore } from '@/lib/store';
import { preferenceStorage } from '@/lib/storage';
export function usePreferences() {
  const theme = useStore((s) => s.theme),
    reduced = useStore((s) => s.reduced);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const savedTheme = preferenceStorage.getItem('codelens-theme');
    const savedMotion = preferenceStorage.getItem('codelens-motion');
    useStore.getState().patch({
      theme: savedTheme === 'light' ? 'light' : 'dark',
      reduced: media.matches || savedMotion === 'reduce',
    });
    const update = () =>
      useStore
        .getState()
        .patch({
          reduced: media.matches || preferenceStorage.getItem('codelens-motion') === 'reduce',
        });
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.motion = reduced ? 'reduce' : 'full';
  }, [theme, reduced]);
}
export function Preferences() {
  const theme = useStore((s) => s.theme),
    reduced = useStore((s) => s.reduced),
    patch = useStore((s) => s.patch);
  return (
    <div className="preferences">
      <button
        className="icon-button"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        onClick={() => {
          const next = theme === 'dark' ? 'light' : 'dark';
          patch({ theme: next });
          preferenceStorage.setItem('codelens-theme', next);
        }}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <button
        className={`motion-toggle ${reduced ? 'selected' : ''}`}
        aria-label="Reduce motion"
        aria-pressed={reduced}
        onClick={() => {
          patch({ reduced: !reduced });
          preferenceStorage.setItem('codelens-motion', !reduced ? 'reduce' : 'full');
        }}
      >
        <Activity size={13} />
        <span>Reduce motion</span>
      </button>
    </div>
  );
}
