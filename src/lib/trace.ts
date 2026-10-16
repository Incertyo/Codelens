import { z } from 'zod';

export type Value = null | boolean | number | string | { ref: string };
export type HeapObject = {
  type: string;
  items?: Value[];
  entries?: [Value, Value][];
  fields?: Record<string, Value>;
  truncated?: boolean;
};
export type Step = {
  index: number;
  line: number;
  event: 'line' | 'call' | 'return' | 'exception' | 'output';
  func: string;
  callStack: { id?: string; func: string; line: number; locals: Record<string, Value> }[];
  globals: Record<string, Value>;
  heap: Record<string, HeapObject>;
  stdout: string;
  explanation?: string;
};
export type TraceResult = {
  origin?: 'ai-simulated';
  execution?: 'java-subset-v1';
  identity?: { implementationId: string; sourceHash: string };
  steps: Step[];
  truncated: boolean;
  error: string | null;
  elapsed: number;
};
export const MAX_CODE_LENGTH = 30000;
export const DEFAULT_MAX_STEPS = 5000;
export const RUN_TIMEOUT_MS = 12000;
export const MAX_TRACE_BYTES = 16 * 1024 * 1024;
export const TRACE_NOTICE_RESERVE = 128 * 1024;
const value = z.union([
  z.null(),
  z.boolean(),
  z.number(),
  z.string(),
  z.object({ ref: z.string() }),
]);
const record = <T extends z.ZodType>(schema: T) =>
  z
    .preprocess(
      (input) =>
        input && typeof input === 'object' && !Array.isArray(input) ? Object.entries(input) : null,
      z.array(z.tuple([z.string(), schema])),
    )
    .transform((entries) => {
      const output: Record<string, z.output<T>> = Object.create(null);
      for (const [key, entry] of entries) output[String(key)] = entry as z.output<T>;
      return output;
    });
const heap = z.object({
  type: z.string(),
  items: z.array(value).optional(),
  entries: z.array(z.tuple([value, value])).optional(),
  fields: record(value).optional(),
  truncated: z.boolean().optional(),
});
export const stepSchema = z.object({
  index: z.number().int().nonnegative(),
  line: z.number().int().positive(),
  event: z.enum(['line', 'call', 'return', 'exception', 'output']),
  func: z.string(),
  callStack: z.array(
    z.object({
      id: z.string().optional(),
      func: z.string(),
      line: z.number(),
      locals: record(value),
    }),
  ),
  globals: record(value),
  heap: record(heap),
  stdout: z.string(),
  explanation: z.string().optional(),
});
export const traceSchema = z.object({
  execution: z.literal('java-subset-v1').optional(),
  steps: z.array(stepSchema).max(DEFAULT_MAX_STEPS),
  truncated: z.boolean(),
  error: z.string().nullable(),
  elapsed: z.number(),
});
export function displayValue(
  v: Value,
  objects?: Record<string, HeapObject>,
  language: string = 'python',
): string {
  if (v === null) return language === 'python' ? 'None' : 'null';
  if (typeof v === 'object') {
    const obj = objects?.[v.ref];
    if (obj && ['undefined', 'number', 'bigint'].includes(obj.type))
      return String(obj.fields?.value ?? obj.type);
    if (obj?.items)
      return `${obj.type === 'set' ? '{' : '['}${obj.items.map((i) => (typeof i === 'object' && i ? `@${i.ref}` : String(i))).join(', ')}${obj.truncated ? ', …' : ''}${obj.type === 'set' ? '}' : ']'}`;
    return `@${v.ref}`;
  }
  return typeof v === 'string' ? JSON.stringify(v) : String(v);
}
export function explainStep(step: Step, previous?: Step, language: string = 'python'): string {
  if (step.explanation) return step.explanation;
  if (step.event === 'call')
    return step.func === '<module>'
      ? 'Begin program execution.'
      : `Enter ${step.func} — a new frame joins the call stack.`;
  if (step.event === 'return')
    return step.func === '<module>'
      ? 'Program complete. Review the captured steps.'
      : `Return from ${step.func} to the calling frame.`;
  if (step.event === 'output') return 'Write to the output console.';
  const vars = step.callStack.at(-1)?.locals ?? step.globals;
  const prev = previous?.callStack.at(-1)?.locals ?? previous?.globals ?? {};
  const changed = Object.keys(vars).filter(
    (k) =>
      JSON.stringify(vars[k]) !== JSON.stringify(prev[k]) ||
      (typeof vars[k] === 'object' &&
        vars[k] !== null &&
        JSON.stringify(step.heap[(vars[k] as { ref: string }).ref]) !==
          JSON.stringify(previous?.heap[(vars[k] as { ref: string }).ref])),
  );
  return changed.length
    ? `${changed
        .slice(0, 3)
        .map((k) => `${k} = ${displayValue(vars[k], step.heap, language)}`)
        .join(' · ')}. Next: line ${step.line}.`
    : `Execute line ${step.line}${step.func !== '<module>' ? ` in ${step.func}` : ''}.`;
}
