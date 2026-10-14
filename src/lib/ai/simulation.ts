import { z } from 'zod';
import type { TraceResult, Value } from '../trace';
const value = z.union([
  z.null(),
  z.boolean(),
  z
    .number()
    .finite()
    .refine((n) => !Number.isInteger(n) || Number.isSafeInteger(n), {
      message: 'Large integers must use decimal strings, not rounded JSON numbers.',
    }),
  z.string().max(200),
  z.object({ ref: z.string().max(100) }).strict(),
]);
const record = z.record(z.string().max(100), value).refine((v) => Object.keys(v).length <= 80);
const frame = z
  .object({
    id: z.string().min(1).max(100),
    func: z.string().max(100),
    line: z.number().int().positive(),
    locals: record,
  })
  .strict();
const heapObject = z
  .object({
    type: z.string().max(100),
    items: z.array(value).max(80).optional(),
    entries: z
      .array(z.tuple([value, value]))
      .max(80)
      .optional(),
    fields: record.optional(),
    truncated: z.boolean().optional(),
  })
  .strict();
export const simulatedTraceSchema = z
  .object({
    steps: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative(),
            line: z.number().int().positive(),
            event: z.enum(['line', 'call', 'return', 'exception', 'output']),
            func: z.string().max(100),
            callStack: z.array(frame).max(80),
            globals: record,
            heap: z
              .record(z.string().max(100), heapObject)
              .refine((h) => Object.keys(h).length <= 128),
            stdout: z.string().max(20000),
            explanation: z.string().max(400).optional(),
          })
          .strict(),
      )
      .min(2)
      .max(5000),
    truncated: z.boolean(),
    error: z.string().max(2000).nullable(),
    elapsed: z.literal(0),
  })
  .strict();
export function validateSimulation(output: unknown, code: string, cap: number): TraceResult {
  const trace = simulatedTraceSchema.parse(output),
    lines = code.split('\n').length;
  if (trace.steps.length > cap) throw new Error('Simulated trace exceeds the requested step cap.');
  let expected: { id: string; func: string }[] = [];
  let previousOutput = '';
  const seen = new Set<string>();
  for (const [i, s] of trace.steps.entries()) {
    if (s.index !== i || s.line > lines || s.callStack.some((f) => f.line > lines))
      throw new Error('Invalid simulated source location or step index.');
    if (s.event === 'call') {
      const added = s.callStack.at(-1);
      if (!added || seen.has(added.id)) throw new Error('Invalid simulated frame push.');
      seen.add(added.id);
      expected = [...expected, { id: added.id, func: added.func }];
    }
    if (
      s.callStack.length !== expected.length ||
      s.callStack.some((f, j) => f.id !== expected[j].id || f.func !== expected[j].func) ||
      s.func !== s.callStack.at(-1)?.func
    )
      throw new Error('Inconsistent simulated call stack.');
    if (!s.stdout.startsWith(previousOutput))
      throw new Error('Simulated stdout must be cumulative.');
    previousOutput = s.stdout;
    const ref = (v: Value) => {
      if (v && typeof v === 'object' && !Object.hasOwn(s.heap, v.ref))
        throw new Error('Dangling simulated heap reference.');
    };
    Object.values(s.globals).forEach(ref);
    s.callStack.forEach((f) => Object.values(f.locals).forEach(ref));
    Object.values(s.heap).forEach((h) => {
      h.items?.forEach(ref);
      h.entries?.forEach((e) => e.forEach(ref));
      if (h.fields) Object.values(h.fields).forEach(ref);
    });
    if (s.event === 'return') expected = expected.slice(0, -1);
    if (!expected.length && i < trace.steps.length - 1)
      throw new Error('Simulated trace continues after the root returns.');
  }
  if (
    trace.steps[0].event !== 'call' ||
    trace.steps[0].func !== '<module>' ||
    (!trace.truncated && expected.length !== 0)
  )
    throw new Error('Simulated trace has no balanced root frame.');
  return { ...trace, origin: 'ai-simulated' };
}
