import { identitySchema } from '@/shared/identity';
export { identitySchema, sourceIdentity, sameIdentity, type SourceIdentity } from '@/shared/identity';
import { limits } from '@/shared/limits';
import { z } from 'zod';
import type { Language } from './breakdown';
import type { TraceResult } from './trace';
import { fitGrowthModel, growthModels } from './complexity';

export const inputKinds = ['int', 'list', 'string'] as const;
export type InputKind = (typeof inputKinds)[number];
export const entrySchema = z
  .object({
    name: z.string().max(100),
    line: z.number().int().positive(),
    parameter: z.string(),
    kinds: z.array(z.enum(inputKinds)),
    reason: z.string().nullable(),
    time: z.string(),
    space: z.string(),
    evidence: z.string(),
  })
  .strict();
export const inspectionSchema = z
  .object({
    entries: z.array(entrySchema).max(40),
    moduleCode: z.string().max(limits.code),
    diagnostic: z.string().nullable(),
    preparationReason: z.string().nullable(),
  })
  .strict();
export type Inspection = z.infer<typeof inspectionSchema>;
export type Entry = z.infer<typeof entrySchema>;
export const empiricalSizes = [4, 8, 16, 32, 64];
export const empiricalProfiles = {
  standard: empiricalSizes,
  small: [2, 4, 8, 12, 16],
  tiny: [1, 2, 3, 4, 5],
};
export function generatedInput(kind: InputKind, n: number): number | number[] | string {
  if (kind === 'int') return n;
  if (kind === 'list') return Array.from({ length: n }, (_, i) => n - i);
  return Array.from({ length: n }, (_, i) => 'abc'[i % 3]).join('');
}
export const argumentSchema = z.union([
  z.number().int().min(-limits.testArgumentInteger).max(limits.testArgumentInteger),
  z.array(z.number().int().min(-limits.testArgumentInteger).max(limits.testArgumentInteger)).max(limits.testArgumentElements),
  z.string().max(limits.testArgumentElements),
]);
export function testHarness(
  inspection: Inspection,
  entry: Entry,
  argument: z.infer<typeof argumentSchema>,
  language: Language,
  output = false,
): string {
  if (inspection.preparationReason || entry.reason)
    throw new Error(inspection.preparationReason || entry.reason || 'Unsupported entry.');
  const kind: InputKind =
    typeof argument === 'number' ? 'int' : typeof argument === 'string' ? 'string' : 'list';
  if (!entry.kinds.includes(kind))
    throw new Error('This input type does not match the entry signature.');
  argumentSchema.parse(argument);

  const invocation = `${entry.name}(${JSON.stringify(argument)})`;
  const driver = output
    ? language === 'python'
      ? `print(repr(${invocation}))`
      : `console.log(${invocation});`
    : invocation;
  const code = `${inspection.moduleCode}\n${driver}\n`;
  if (code.length > limits.code)
    throw new Error('The generated driver would exceed the source size limit.');
  return code;
}
export function executionCounts(trace: TraceResult | null): Record<number, number> {
  if (!trace) return {};
  const counts: Record<number, number> = {};
  for (const step of trace.steps)
    if (step.event === 'line') counts[step.line] = (counts[step.line] ?? 0) + 1;
  return counts;
}
export type Sample = { n: number; steps: number };
export function fitComplexity(samples: Sample[]) {
  if (
    samples.length < 4 ||
    samples.some(
      (s) => !Number.isFinite(s.steps) || s.steps < 1 || !Number.isFinite(s.n) || s.n < 1,
    ) ||
    new Set(samples.map((s) => s.n)).size !== samples.length
  )
    throw new Error('At least four complete, non-empty traces are required.');
  if (samples.every((s) => s.steps === samples[0].steps))
    return {
      ...fitGrowthModel('constant', samples, true),
      alternatives: 'All tested sizes used the same step count.',
    };
  const ranked = growthModels
    .slice(1)
    .map((model) => fitGrowthModel(model.id, samples, true))
    .sort((a, b) => a.error - b.error);
  return {
    ...ranked[0],
    alternatives: `Next fit: ${ranked[1].label} (${(ranked[1].error * 100).toFixed(1)}% normalized error). These small deterministic inputs cannot establish asymptotic or average-case complexity.`,
  };
}
export const adviceSchema = z
  .object({
    summary: z.string().min(1).max(1200),
    issues: z
      .array(
        z
          .object({
            line: z.number().int().positive(),
            severity: z.enum(['bug', 'edge-case', 'suggestion']),
            message: z.string().min(1).max(limits.aiPurposeCharacters),
          })
          .strict(),
      )
      .max(12),
    optimization: z
      .object({
        code: z.string().min(1).max(limits.code),
        explanation: z.string().min(1).max(1200),
        lines: z.array(z.number().int().positive()).min(1).max(30),
      })
      .strict()
      .nullable(),
    tests: z
      .array(
        z
          .object({
            name: z.string().min(1).max(120),
            entry: z.string().min(1).max(100),
            line: z.number().int().positive(),
            argument: argumentSchema,
            expectedOutput: z.string().max(2000),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();
export type Advice = z.infer<typeof adviceSchema>;

export function sourceDiff(
  before: string,
  after: string,
): { kind: 'same' | 'remove' | 'add'; text: string }[] {
  const a = before.split('\n'),
    b = after.split('\n');
  let head = 0,
    tail = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  )
    tail++;
  return [
    ...a.slice(Math.max(0, head - 2), head).map((text) => ({ kind: 'same' as const, text })),
    ...a.slice(head, a.length - tail).map((text) => ({ kind: 'remove' as const, text })),
    ...b.slice(head, b.length - tail).map((text) => ({ kind: 'add' as const, text })),
    ...a
      .slice(a.length - tail, a.length - tail + 2)
      .map((text) => ({ kind: 'same' as const, text })),
  ];
}
