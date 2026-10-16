import { limits } from "@/shared/limits";
import { z } from 'zod';
export const implementationSchema = z.object({
  id: z.string(),
  algorithmId: z.string(),
  name: z.string(),
  language: z.literal('python'),
  variant: z.enum(['reference', 'featured']),
  revision: z.number().int().positive(),
  code: z.string().min(1).max(limits.code),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  sourceFile: z.string(),
  entryPoint: z.string(),
  notes: z.array(z.string()),
  fixture: z.object({
    stdin: z.string(),
    expectedStdout: z.string(),
    matchMode: z.enum(['exact', 'contains']),
  }),
});
export type LibraryImplementation = z.infer<typeof implementationSchema>;
