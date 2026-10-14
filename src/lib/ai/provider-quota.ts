import { AIControlError } from './control-error';

export function isProviderQuotaError(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const failure = current as {
      statusCode?: unknown;
      responseBody?: unknown;
      cause?: unknown;
      lastError?: unknown;
    };
    if (failure.statusCode === 429) return true;
    if (typeof failure.responseBody === 'string') {
      try {
        const body = JSON.parse(failure.responseBody);
        if (body?.error?.status === 'RESOURCE_EXHAUSTED' || body?.error?.code === 429) return true;
      } catch {}
    }
    current = failure.cause ?? failure.lastError;
  }
  return false;
}

export function throwProviderQuota(error: unknown) {
  if (isProviderQuotaError(error))
    throw new AIControlError(
      'provider_quota',
      'AI notes are paused: provider quota reached. Local analysis and traces remain available.',
      429,
    );
}
