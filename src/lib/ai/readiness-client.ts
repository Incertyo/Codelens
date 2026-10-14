export async function checkAIReadiness(signal?: AbortSignal) {
  const unavailable = {
    configured: false,
    reason: 'AI availability could not be checked. Local analysis and traces remain available.',
  };
  try {
    const response = await fetch('/api/analyze', {
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
        : AbortSignal.timeout(8000),
    });
    if (!response.ok) return unavailable;
    const body = await response.json();
    if (!body || typeof body !== 'object' || typeof body.configured !== 'boolean')
      return unavailable;
    return {
      configured: body.configured === true,
      reason:
        typeof body.reason === 'string' ? body.reason : body.configured ? '' : 'AI is unavailable.',
    };
  } catch {
    signal?.throwIfAborted();
    return unavailable;
  }
}
