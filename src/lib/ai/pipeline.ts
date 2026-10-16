import { generateText, Output } from 'ai';
import { z } from 'zod';
import { limits } from '@/shared/limits';
import { model, providerStatus } from './provider';
import { reserveProviderCall } from './rate-limit';
import { AIControlError } from './control-error';
import { generationOptions, generationFailureReason, retryFeedback, throwProviderFailure } from './generation';
import { providerOutputSchema } from './output-schema';

type GenerationMode<T> = {
  schema: z.ZodType<T>;
  system: string;
  prompt: (retry: string | undefined) => unknown;
  validate: (value: T) => void;
  feature: string;
  name?: string;
  description?: string;
};

export const generationCacheHook = Object.freeze({
  read: () => null,
});

export async function generateValidated<T>(mode: GenerationMode<T>, signal?: AbortSignal): Promise<{ data: T | null; reason: string }> {
  const status = providerStatus();
  if (!status.configured) return { data: null, reason: status.reason! };
  generationCacheHook.read();
  const deadline = AbortSignal.timeout(limits.aiDeadlineMs);
  const abortSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  let failure: unknown;
  for (let attempt = 0; attempt < limits.aiAttempts; attempt++) {
    try {
      await reserveProviderCall(abortSignal);
      abortSignal.throwIfAborted();
      const { output } = await generateText({
        model: model(),
        ...generationOptions(),
        output: Output.object({
          schema: providerOutputSchema(mode.schema),
          ...(mode.name ? { name: mode.name } : {}),
          ...(mode.description ? { description: mode.description } : {}),
        }),
        maxOutputTokens: limits.aiOutputTokens,
        maxRetries: 0,
        abortSignal,
        system: mode.system,
        prompt: JSON.stringify(mode.prompt(attempt ? retryFeedback(failure) : undefined)),
      });
      const data = mode.schema.parse(output);
      mode.validate(data);
      return { data, reason: '' };
    } catch (error) {
      if (error instanceof AIControlError) throw error;
      throwProviderFailure(error);
      failure = error;
      if (abortSignal.aborted) break;
    }
  }
  return { data: null, reason: generationFailureReason(failure, abortSignal.aborted, mode.feature) };
}
