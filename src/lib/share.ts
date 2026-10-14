import lz from 'lz-string';
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = lz;
import { MAX_CODE_LENGTH } from './trace';
import type { Language } from './breakdown';
export function encodeShare(code: string, stdin: string, language: string): string {
  return '#code=' + compressToEncodedURIComponent(JSON.stringify({ code, stdin, language }));
}
export function decodeShare(
  hash: string,
): { code: string; stdin: string; language: Language } | null {
  try {
    if (!hash.startsWith('#code=') || hash.length > 100000) return null;
    const data: unknown = JSON.parse(decompressFromEncodedURIComponent(hash.slice(6)) || 'null');
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    if (
      typeof d.code !== 'string' ||
      d.code.length > MAX_CODE_LENGTH ||
      typeof d.stdin !== 'string' ||
      d.stdin.length > 10000 ||
      !['python', 'javascript', 'cpp', 'java'].includes(String(d.language))
    )
      return null;
    return { code: d.code, stdin: d.stdin, language: d.language as Language };
  } catch {
    return null;
  }
}
