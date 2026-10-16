import { limits } from "@/shared/limits";
import { analyzeRequestSchema, enrichCode, providerStatus, aiReadiness } from "@/features/ai/server/analyze";
import { takeSharedLimit, requireAllowed } from "@/features/ai/server/rate-limit";
import { AIControlError } from "@/features/ai/server/control-error";
import { hashText } from '@/shared/server/hashing';
import { getStoredAnalysis, saveStoredAnalysis, type StoredAnalysis } from "@/features/library/public/server/analysis-repository";
import { adviceRequestSchema, analyzeAdvice, validateIdentity } from "@/features/ai/server/advice-generation";
const MAX_BODY_BYTES = limits.aiBodyBytes;
const json = (body: unknown, status = 200, extra?: Record<string, string>) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
const clientKey = (request?: Request) =>
  request?.headers.get('x-forwarded-for')?.split(',')[0].trim().slice(0, 100) || 'local';
export async function getAnalysis(request: Request) {
  const url = new URL(request.url);
  const sourceHash = url.searchParams.get('sourceHash');
  const implementationId = url.searchParams.get('implementationId');
  const language = url.searchParams.get('language') || 'python';
  if (language !== 'python')
    return json({ error: 'Only Python is supported.' }, 400);
  if (sourceHash || implementationId) {
    const stored = getStoredAnalysis({
      sourceHash: sourceHash || undefined,
      implementationId: implementationId || undefined,
      language,
    });
    if (stored) {
      return json({ cached: true, analysis: stored.data, record: stored });
    }
    return json({ cached: false }, 404);
  }
  return json(await aiReadiness(clientKey(request)));
}
export async function postAnalysis(request: Request) {
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
    if (mode === 'simulate')
      return json({ error: 'AI-simulated traces have been removed. Run Python locally.' }, 410);
    if (mode === 'save_complexity' || mode === 'save_analysis') {
      const saveBody = body as Record<string, unknown>;
      const sHash = typeof saveBody.sourceHash === 'string' ? saveBody.sourceHash : '';
      const lang = typeof saveBody.language === 'string' ? saveBody.language : 'python';
      if (lang !== 'python')
        return json({ error: 'Only Python is supported.' }, 400);
      if (sHash) {
        const saved = saveStoredAnalysis({
          implementationId:
            typeof saveBody.implementationId === 'string' ? saveBody.implementationId : undefined,
          sourceHash: sHash,
          language: lang,
          data: {
            ...(typeof saveBody.data === 'object' && saveBody.data !== null
              ? (saveBody.data as StoredAnalysis)
              : {}),
            ...(saveBody.bigOFit !== undefined
              ? { bigOFit: saveBody.bigOFit as StoredAnalysis['bigOFit'] }
              : {}),
            ...(typeof saveBody.timeComplexity === 'string'
              ? { timeComplexity: saveBody.timeComplexity }
              : {}),
            ...(typeof saveBody.spaceComplexity === 'string'
              ? { spaceComplexity: saveBody.spaceComplexity }
              : {}),
          },
        });
        if (!saved) return json({ error: 'Failed to persist analysis.' }, 500);
        return json({ saved: true });
      }
      return json({ error: 'Missing sourceHash' }, 400);
    }
    const requestedLang = body && typeof body === 'object' && 'language' in body ? (body as Record<string, unknown>).language : undefined;
    if (requestedLang !== undefined && requestedLang !== 'python') {
      return json({ error: 'Only Python is supported.' }, 400);
    }
    const schema = mode === 'analysis' ? adviceRequestSchema : analyzeRequestSchema;
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
    const checkCache = (parsed.data as Record<string, unknown>).checkCache === true;
    if (checkCache) {
      const sourceHash = hashText(parsed.data.code);
      const cached = getStoredAnalysis({
        implementationId: (parsed.data as Record<string, unknown>).implementationId as string | undefined,
        sourceHash,
        language: parsed.data.language,
      });
      if (cached?.data?.enrichment) {
        return json({ source: 'ai', enrichment: cached.data.enrichment, cached: true });
      }
    }

    const readiness = providerStatus();
    if (!readiness.configured) throw new AIControlError(readiness.code!, readiness.reason!);

    requireAllowed(await takeSharedLimit(key));
    if ('mode' in parsed.data) return json(await analyzeAdvice(parsed.data, request.signal));

    const enrichmentResult = await enrichCode(parsed.data, request.signal);
    if (enrichmentResult.source === 'ai') {
      const sourceHash = hashText(parsed.data.code);
      saveStoredAnalysis({
        implementationId: parsed.data.implementationId,
        sourceHash,
        language: parsed.data.language,
        data: {
          timeComplexity: enrichmentResult.enrichment.timeComplexity,
          spaceComplexity: enrichmentResult.enrichment.spaceComplexity,
          suggestions: enrichmentResult.enrichment.suggestions,
          visualMapping: enrichmentResult.enrichment.visualMapping,
          enrichment: enrichmentResult.enrichment,
        },
      });
    }
    return json(enrichmentResult);
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
