import { z } from 'zod';

export const snapshotRecord = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (input) => input && typeof input === 'object' && !Array.isArray(input) ? Object.entries(input) : null,
    z.array(z.tuple([z.string(), schema])),
  ).transform((entries) => {
    const output: Record<string, z.output<T>> = Object.create(null);
    for (const [key, entry] of entries) output[String(key)] = entry as z.output<T>;
    return output;
  });
