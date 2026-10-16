export function privateSender<T extends object>(post: (message: T & { nonce: string }) => void, nonce: string) {
  return (message: T) => post({ ...message, nonce });
}

export function authenticatedMessage(data: unknown, nonce: string): data is Record<string, unknown> & { nonce: string; type: string } {
  return !!data && typeof data === 'object' && 'nonce' in data && data.nonce === nonce;
}

export function runProtocol(nonce: string) {
  let phase: 'loading' | 'sent' | 'started' | 'finished' = 'loading';
  let deadline = Infinity;
  return {
    accepts(data: unknown) { return phase !== 'finished' && authenticatedMessage(data, nonce); },
    expired(now: number) { return now >= deadline; },
    send(now: number, timeoutMs: number) {
      if (phase !== 'loading') return false;
      phase = 'sent';
      deadline = now + timeoutMs;
      return true;
    },
    start() {
      if (phase !== 'sent') return false;
      phase = 'started';
      return true;
    },
    get phase() { return phase; },
    finish() { phase = 'finished'; },
  };
}

export function lockProtocol(scope: object) {
  const blocked = () => { throw new Error('Worker protocol messages are private.'); };
  for (let target: object | null = scope; target; target = Object.getPrototypeOf(target)) {
    if (Object.hasOwn(target, 'postMessage'))
      Object.defineProperty(target, 'postMessage', { value: blocked, writable: false, configurable: false });
  }
}

export function lockCapabilities(scope: object, keys: readonly string[], message: string) {
  const blocked = () => { throw new Error(message); };
  for (const key of keys)
    Object.defineProperty(scope, key, { value: blocked, writable: false, configurable: false });
}

export const networkCapabilities = ['fetch', 'XMLHttpRequest', 'importScripts', 'WebSocket', 'WebTransport', 'EventSource', 'Worker', 'SharedWorker', 'open'] as const;
export const asynchronousCapabilities = [...networkCapabilities, 'setTimeout', 'setInterval', 'queueMicrotask'] as const;
