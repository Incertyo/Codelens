import { APICallError, NoObjectGeneratedError } from 'ai';
import { z } from 'zod';
import { AIControlError } from "./control-error";
import { throwProviderQuota } from "./provider-quota";

export class AIOutputError extends Error {}

export function generationOptions() {
  const provider = process.env.LLM_PROVIDER?.toLowerCase();
  if (provider === 'google') return { reasoning: 'minimal' as const };
  if (provider === 'openai-compatible' && process.env.LLM_BASE_URL) {
    const endpoint = new URL(process.env.LLM_BASE_URL);
    if (endpoint.protocol === 'https:' && endpoint.hostname === 'api.groq.com')
      return { providerOptions: { openai: { strictJsonSchema: false } } };
  }
  return {};
}

export function retryFeedback(error: unknown) {
  if (error instanceof AIOutputError) return error.message;
  if (error instanceof z.ZodError)
    return `Correct these schema fields: ${error.issues
      .slice(0, 6)
      .map(
        (issue) =>
          `${issue.path.filter((part) => typeof part === 'number' || /^[a-zA-Z_][a-zA-Z_0-9]{0,79}$/.test(String(part))).join('.')}: ${issue.code}`,
      )
      .join('; ')}. Keep every field concise.`;
  if (NoObjectGeneratedError.isInstance(error) && error.finishReason === 'length')
    return 'The response exceeded the output budget. Return much shorter JSON and fewer annotations/tests/step notes.';
  return 'Return compact JSON matching the schema exactly. Check every source line, entry name and sampled step reference.';
}

export function throwProviderFailure(error: unknown) {
  throwProviderQuota(error);
  if (!APICallError.isInstance(error)) return;
  const status = error.statusCode;
  if (status === 401 || status === 403)
    throw new AIControlError(
      'provider_auth',
      'AI provider authentication failed. Check the server provider credentials. Local analysis and traces remain available.',
    );
  if (status === 404)
    throw new AIControlError(
      'provider_model',
      'The configured AI model is unavailable. Check LLM_MODEL. Local analysis and traces remain available.',
    );
  if (status === 400 || status === 422)
    throw new AIControlError(
      'provider_request',
      'The AI provider rejected the request configuration. Local analysis and traces remain available.',
    );
  throw new AIControlError(
    'provider_unavailable',
    'The AI provider is temporarily unavailable. Local analysis and traces remain available.',
  );
}

export function generationFailureReason(error: unknown, aborted: boolean, feature: string) {
  if (aborted)
    return `${feature} timed out. Try a shorter snippet. Local analysis and traces remain available.`;
  if (NoObjectGeneratedError.isInstance(error) && error.finishReason === 'length')
    return `${feature} exceeded the response size limit. Try a shorter snippet. Local analysis and traces remain available.`;
  return `${feature} returned an invalid response after one validation retry. Local analysis and traces remain available.`;
}
