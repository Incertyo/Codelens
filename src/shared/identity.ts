import { z } from 'zod';
import { limits } from './limits';

export const identitySchema = z.object({
  implementationId: z.string().min(1).max(limits.implementationId),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type SourceIdentity = z.infer<typeof identitySchema>;

export async function hashSource(code: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sourceIdentity(implementationId: string, code: string): Promise<SourceIdentity> {
  return { implementationId, sourceHash: await hashSource(code) };
}

export const sameIdentity = (a: SourceIdentity, b: SourceIdentity) =>
  a.implementationId === b.implementationId && a.sourceHash === b.sourceHash;
