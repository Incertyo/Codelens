import { z } from 'zod';
import type { Language } from './breakdown';
import type { TraceResult } from './trace';

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
    moduleCode: z.string().max(30000),
    diagnostic: z.string().nullable(),
    preparationReason: z.string().nullable(),
  })
  .strict();
export type Inspection = z.infer<typeof inspectionSchema>;
export type Entry = z.infer<typeof entrySchema>;
export const identitySchema = z
  .object({
    implementationId: z.string().min(1).max(200),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type SourceIdentity = z.infer<typeof identitySchema>;
export async function sourceIdentity(
  implementationId: string,
  code: string,
): Promise<SourceIdentity> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return {
    implementationId,
    sourceHash: [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join(''),
  };
}
export const sameIdentity = (a: SourceIdentity, b: SourceIdentity) =>
  a.implementationId === b.implementationId && a.sourceHash === b.sourceHash;

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
  z.number().int().min(-10000).max(10000),
  z.array(z.number().int().min(-10000).max(10000)).max(128),
  z.string().max(128),
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
  if (code.length > 30000)
    throw new Error('The generated driver would exceed the source size limit.');
  return code;
}
export function executionCounts(trace: TraceResult | null): Record<number, number> {
  if (!trace || trace.origin === 'ai-simulated') return {};
  const counts: Record<number, number> = {};
  for (const step of trace.steps)
    if (step.event === 'line') counts[step.line] = (counts[step.line] ?? 0) + 1;
  return counts;
}
export type Sample = { n: number; steps: number };
export function fitComplexity(samples: Sample[]) {
  if (samples.length < 4 || samples.some((s) => !Number.isFinite(s.steps) || s.steps < 1))
    throw new Error('At least four complete, non-empty traces are required.');
  if (samples.every((s) => s.steps === samples[0].steps))
    return { label: 'O(1)', error: 0, alternatives: 'All tested sizes used the same step count.' };
  const models = [
    ['O(log n)', (n: number) => Math.log2(n)],
    ['O(n)', (n: number) => n],
    ['O(n log n)', (n: number) => n * Math.log2(n)],
    ['O(n²)', (n: number) => n * n],
    ['O(n³)', (n: number) => n * n * n],
    ['O(2ⁿ)', (n: number) => 2 ** n],
  ] as const;
  const ranked = models
    .map(([label, f]) => {
      const xs = samples.map((s) => f(s.n)),
        ys = samples.map((s) => s.steps);
      const mx = xs.reduce((a, b) => a + b) / xs.length,
        my = ys.reduce((a, b) => a + b) / ys.length;
      let scale = Math.max(
        0,
        xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0) /
          xs.reduce((sum, x) => sum + (x - mx) ** 2, 0),
      );
      let intercept = my - scale * mx;
      if (intercept < 0) {
        intercept = 0;
        scale =
          xs.reduce((sum, x, i) => sum + x * ys[i], 0) / xs.reduce((sum, x) => sum + x * x, 0);
      }
      const error =
        Math.sqrt(
          xs.reduce((sum, x, i) => sum + (ys[i] - (intercept + scale * x)) ** 2, 0) / xs.length,
        ) / my;
      return { label, error };
    })
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
            message: z.string().min(1).max(600),
          })
          .strict(),
      )
      .max(12),
    optimization: z
      .object({
        code: z.string().min(1).max(30000),
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
