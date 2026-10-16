import { z } from 'zod';
import { fitGrowthModel, growthModels, type GrowthFit } from './complexity';

export const measurementSizes = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128] as const;
export const measurementOptionsSchema = z
  .object({
    eventBudget: z.number().int().min(10).max(3_000_000).default(3_000_000),
    timeoutMs: z.number().int().min(50).max(10_000).default(10_000),
    sampleEvery: z.number().int().min(1).max(16).default(16),
    maxObjects: z.number().int().min(1).max(20_000).default(20_000),
    maxDepth: z.number().int().min(1).max(256).default(256),
    maxVisits: z.number().int().min(1).max(100_000).default(100_000),
  })
  .strict();
export type MeasurementOptions = z.infer<typeof measurementOptionsSchema>;
export type MeasurementArgument =
  null | boolean | number | string | MeasurementArgument[] | { [key: string]: MeasurementArgument };
const argumentSchema: z.ZodType<MeasurementArgument> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(argumentSchema),
    z
      .preprocess(
        (input) =>
          input && typeof input === 'object' && !Array.isArray(input)
            ? Object.entries(input)
            : null,
        z.array(z.tuple([z.string(), argumentSchema])),
      )
      .transform((entries) => Object.fromEntries(entries)),
  ]),
);
export const measurementRequestSchema = z
  .object({
    code: z.string().max(30_000),
    entry: z.string().min(1).max(100),
    n: z.number().int().positive().max(1_000_000),
    args: z.array(argumentSchema).max(16),
    options: measurementOptionsSchema,
  })
  .strict();
export type MeasurementRequest = z.infer<typeof measurementRequestSchema>;
const counter = z.number().int().nonnegative().safe().nullable();
export const measurementSizeSchema = z
  .object({
    n: z.number().int().positive(),
    status: z.enum(['complete', 'partial', 'budget-exceeded', 'error']),
    lineEvents: counter,
    events: counter,
    totalPeak: counter,
    auxiliaryPeak: counter,
    inputUnits: counter,
    samples: counter,
    reason: z.string().max(600).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.status !== 'budget-exceeded' &&
      [
        value.lineEvents,
        value.events,
        value.totalPeak,
        value.auxiliaryPeak,
        value.inputUnits,
        value.samples,
      ].some((item) => item === null)
    )
      context.addIssue({
        code: 'custom',
        message: 'Completed and partial measurements require counters.',
      });
    if (
      value.status === 'complete' &&
      (value.lineEvents === null ||
        value.events === null ||
        value.totalPeak === null ||
        value.auxiliaryPeak === null ||
        value.inputUnits === null ||
        value.samples === null ||
        value.reason !== null)
    )
      context.addIssue({
        code: 'custom',
        message: 'Complete measurement requires counters and no failure reason.',
      });
    if (
      value.totalPeak !== null &&
      value.inputUnits !== null &&
      value.auxiliaryPeak !== null &&
      value.auxiliaryPeak !== Math.max(0, value.totalPeak - value.inputUnits)
    )
      context.addIssue({
        code: 'custom',
        message: 'Auxiliary peak does not match the input baseline.',
      });
  });
export type MeasurementSize = z.infer<typeof measurementSizeSchema>;
export type MeasurementFit = GrowthFit & {
  runnerUp: GrowthFit;
  inconclusive: boolean;
  alternatives: string;
  validPoints: number;
  maxN: number;
};
export type MeasurementSeries = {
  sizes: MeasurementSize[];
  time: MeasurementFit | null;
  space: MeasurementFit | null;
  totalSpace: MeasurementFit | null;
  reduced: boolean;
};
export const MEASUREMENT_MEMORY_DEFINITION =
  'Memory units count each reachable data object once as 1 plus its elements, entries or own fields, all initialized user variable bindings in live functions and globals, strings by length capped at 10,000 per distinct immutable value, and live user call frames. Modules, functions, classes and runtime internals are opaque; generated driver bindings and synthetic this are excluded. This is an object-count model, not bytes.';
export const MEASUREMENT_SAMPLING_NOTE =
  'Sampled peak: memory is sampled at every user call and return, on the first 16 user-function line events, and at least every 16 line events thereafter. Short-lived allocations between samples and native/imported internals can be missed. Auxiliary peak is total peak minus the argument data units at the first entry call; input bindings remain part of auxiliary overhead. Traversal is bounded to 20,000 objects, depth 256 and 100,000 visited values per sample; a bound makes the size partial and excludes it from fitting.';

export function fitMeasurement(
  sizes: MeasurementSize[],
  metric: 'lineEvents' | 'auxiliaryPeak' | 'totalPeak',
): MeasurementFit | null {
  const valid = sizes.filter(
    (size) => size.status === 'complete' && size[metric] !== null && size[metric]! > 0,
  );
  if (valid.length < 4 || new Set(valid.map((size) => size.n)).size !== valid.length) return null;
  const samples = valid.map((size) => ({ n: size.n, steps: size[metric]! }));
  const ranked = growthModels
    .map((model) => fitGrowthModel(model.id, samples, true))
    .sort((a, b) => a.error - b.error);
  const best = ranked[0];
  const runnerUp = ranked[1];
  return {
    ...best,
    runnerUp,
    validPoints: valid.length,
    maxN: Math.max(...valid.map((size) => size.n)),
    inconclusive: valid.length < 6 || runnerUp.error - best.error < 0.02,
    alternatives: `Runner-up: ${runnerUp.label} (${(runnerUp.error * 100).toFixed(1)}% normalized RMS error). A fit is a local estimate at the tested sizes, never proof of asymptotic complexity.`,
  };
}

export function measurementSeries(
  sizes: MeasurementSize[],
  planned: number = measurementSizes.length,
): MeasurementSeries {
  return {
    sizes,
    time: fitMeasurement(sizes, 'lineEvents'),
    space: fitMeasurement(sizes, 'auxiliaryPeak'),
    totalSpace: fitMeasurement(sizes, 'totalPeak'),
    reduced: sizes.length < planned || sizes.some((size) => size.status !== 'complete'),
  };
}

export function deadlineMeasurement(n: number): MeasurementSize {
  return {
    n,
    status: 'budget-exceeded',
    lineEvents: null,
    events: null,
    totalPeak: null,
    auxiliaryPeak: null,
    inputUnits: null,
    samples: null,
    reason: 'Absolute parent deadline exceeded; no complete counters were returned.',
  };
}
