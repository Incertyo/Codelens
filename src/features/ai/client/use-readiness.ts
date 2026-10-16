'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkAIReadiness } from "@/features/ai/client/readiness-client";

export function useAIReadiness(enabled = true) {
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState({
    configured: false,
    reason: 'Checking AI availability…',
    revision: -1,
    enabled: false,
  });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const sequence = useRef(0);
  const check = useCallback(
    async (signal?: AbortSignal) => {
      const request = ++sequence.current;
      const result = await checkAIReadiness(signal);
      if (!signal?.aborted && request === sequence.current)
        setStatus({ ...result, revision, enabled });
      return result;
    },
    [revision, enabled],
  );
  const unavailable = useCallback(
    (reason: string) => {
      sequence.current++;
      setStatus({ configured: false, reason, revision, enabled });
    },
    [revision, enabled],
  );
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void check(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [enabled, check]);
  const current = status.revision === revision && status.enabled === enabled;
  return {
    configured: enabled && current && status.configured,
    reason: current ? status.reason : 'Checking AI availability…',
    refresh,
    unavailable,
    check,
  };
}
