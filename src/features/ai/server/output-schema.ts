import { jsonSchema } from 'ai';
import { z } from 'zod';

export function providerOutputSchema<T>(schema: z.ZodType<T>) {
  if (process.env.LLM_PROVIDER?.toLowerCase() !== 'google') return schema;
  const bounds = new Set([
    'minimum',
    'maximum',
    'exclusiveMinimum',
    'exclusiveMaximum',
    'multipleOf',
    'minLength',
    'maxLength',
    'minItems',
    'maxItems',
  ]);
  function shape(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(shape);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !bounds.has(key))
          .map(([key, v]) => [key, shape(v)]),
      );
    return value;
  }
  return jsonSchema<T>(shape(z.toJSONSchema(schema)) as Parameters<typeof jsonSchema>[0], {
    validate(value) {
      const result = schema.safeParse(value);
      return result.success
        ? { success: true, value: result.data }
        : { success: false, error: result.error };
    },
  });
}
