'use client';
import { useCallback, useEffect, useState } from 'react';

export function useAIReadiness(enabled = true) {
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState({
    configured: false,
    reason: 'Checking AI availability…',
    revision: -1,
    enabled: false,
  });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const unavailable = useCallback(
    (reason: string) => setStatus({ configured: false, reason, revision, enabled }),
    [revision, enabled],
  );
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch('/api/analyze', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('AI availability could not be checked.');
        const body = await response.json();
        if (!controller.signal.aborted)
          setStatus({
            revision,
            enabled,
            configured: body.configured === true,
            reason:
              typeof body.reason === 'string'
                ? body.reason
                : body.configured === true
                  ? ''
                  : 'AI is unavailable.',
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setStatus({
            revision,
            enabled,
            configured: false,
            reason:
              'AI availability could not be checked. Static analysis and traces remain available.',
          });
      });
    return () => controller.abort();
  }, [enabled, revision]);
  const current = status.revision === revision && status.enabled === enabled;
  return {
    configured: enabled && current && status.configured,
    reason: current ? status.reason : 'Checking AI availability…',
    refresh,
    unavailable,
  };
}
