import { z } from 'zod';
import { getLibraryImplementation, getLibraryIndex } from '@/lib/library-repository';
export const runtime = 'nodejs';
const querySchema = z.object({
  id: z.string().min(1).max(240),
  language: z.enum(['python', 'javascript']).default('python'),
  variant: z.enum(['reference', 'featured']).default('reference'),
  revision: z.coerce.number().int().positive().optional(),
});
export function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  try {
    if (!query.size) return Response.json(getLibraryIndex());
    const parsed = querySchema.safeParse(Object.fromEntries(query));
    if (!parsed.success)
      return Response.json({ error: 'Invalid library selection.' }, { status: 400 });
    const { id, language, variant, revision } = parsed.data;
    const implementation = getLibraryImplementation(id, language, variant, revision);
    if (!implementation)
      return Response.json(
        { error: 'This implementation is unavailable in the selected language.' },
        { status: 404 },
      );
    return Response.json(implementation, {
      headers: {
        'Cache-Control': 'no-cache',
        ETag: `"${implementation.id}:${implementation.sourceHash}"`,
      },
    });
  } catch (error) {
    console.error(
      'Library database could not be read',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json(
      { error: 'The code library is temporarily unavailable. Please retry.' },
      { status: 503 },
    );
  }
}
