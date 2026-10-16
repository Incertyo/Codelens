type StorageKind = 'localStorage' | 'sessionStorage';

const memory: Record<StorageKind, Map<string, string>> = {
  localStorage: new Map(),
  sessionStorage: new Map(),
};
const unavailable = new Set<StorageKind>();

export function guardedStorage(kind: StorageKind = 'localStorage') {
  return {
    getItem(key: string): string | null {
      if (typeof window === 'undefined') return null;
      if (!unavailable.has(kind)) {
        try {
          const value = window[kind].getItem(key);
          if (value === null) memory[kind].delete(key);
          else memory[kind].set(key, value);
          return value;
        } catch {
          unavailable.add(kind);
        }
      }
      return memory[kind].get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      if (typeof window === 'undefined') return;
      memory[kind].set(key, value);
      if (!unavailable.has(kind)) {
        try {
          window[kind].setItem(key, value);
        } catch {
          unavailable.add(kind);
        }
      }
    },
  };
}

export const preferenceStorage = guardedStorage();
