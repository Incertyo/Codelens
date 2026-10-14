import { analyzeRequestSchema, enrichCode, providerStatus, aiReadiness } from '@/lib/ai/analyze';
import { takeSharedLimit, requireAllowed } from '@/lib/ai/rate-limit';
import { AIControlError } from '@/lib/ai/control-error';
import {
  adviceRequestSchema,
  simulationRequestSchema,
  analyzeAdvice,
  simulate,
  validateIdentity,
} from '@/lib/ai/phase3';
export const runtime = 'nodejs';

export const maxDuration = 25;
const MAX_BODY_BYTES = 200000;
const json = (body: unknown, status = 200, extra?: Record<string, string>) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
const clientKey = (request?: Request) =>
  request?.headers.get('x-forwarded-for')?.split(',')[0].trim().slice(0, 100) || 'local';
export async function GET(request: Request) {
  return json(await aiReadiness(clientKey(request)));
}
export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json'))
    return json({ error: 'Use an application/json request.' }, 415);
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES)
    return json({ error: 'Request exceeds the size limit.' }, 413);
  const key = clientKey(request);
  if (!request.body) return json({ error: 'Provide a code snippet.' }, 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return json({ error: 'Request exceeds the size limit.' }, 413);
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    const body: unknown = JSON.parse(new TextDecoder().decode(buffer));
    const mode = body && typeof body === 'object' && 'mode' in body ? body.mode : undefined;
    const schema =
      mode === 'analysis'
        ? adviceRequestSchema
        : mode === 'simulate'
          ? simulationRequestSchema
          : analyzeRequestSchema;
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return json(
        { error: 'Invalid analysis request. Check the code length and source references.' },
        400,
      );
    if ('identity' in parsed.data) {
      try {
        validateIdentity(parsed.data);
      } catch {
        return json({ error: 'Source hash does not match the submitted code.' }, 400);
      }
    }
    const readiness = providerStatus();
    if (!readiness.configured) throw new AIControlError(readiness.code!, readiness.reason!);

    requireAllowed(await takeSharedLimit(key));
    if ('mode' in parsed.data)
      return json(
        parsed.data.mode === 'analysis'
          ? await analyzeAdvice(parsed.data, request.signal)
          : await simulate(parsed.data, request.signal),
      );
    return json(await enrichCode(parsed.data, request.signal));
  } catch (error) {
    if (error instanceof AIControlError)
      return json(
        { source: 'static', code: error.code, reason: error.message, error: error.message },
        error.status,
        error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : undefined,
      );
    return json({ error: 'Could not read the analysis request.' }, 400);
  }
}
