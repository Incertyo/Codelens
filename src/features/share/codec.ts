import { limits } from "@/shared/limits";
import lz from 'lz-string';
const { compressToEncodedURIComponent } = lz;
import { decompressBounded } from "./bounded-lz";
import { MAX_CODE_LENGTH } from "../../shared/trace";
import type { Language } from "../../shared/breakdown";

export const MAX_SHARE_FRAGMENT_LENGTH = limits.shareFragment;
export const MAX_SHARE_JSON_LENGTH = limits.shareJson;

export type ShareLanguage = Language | 'javascript' | 'cpp' | 'java';

const LANG_CODE_MAP: Record<string, ShareLanguage> = {
  p: 'python',
  j: 'javascript',
  c: 'cpp',
  y: 'java',
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  java: 'java',
};

const LANG_TO_CODE: Record<ShareLanguage, string> = {
  python: 'p',
  javascript: 'j',
  cpp: 'c',
  java: 'y',
};

/**
 * Universal fast 64-bit deterministic hash / fingerprint of source code and metadata.
 */
export function computeCodeHash(code: string, language = 'python'): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  const str = `${language}:${code}`;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(36);
  const part2 = (h2 >>> 0).toString(36);
  return `${part1}${part2}`;
}

/**
 * Standard share encoder (compatible with existing URLs and tests).
 */
export function encodeShare(code: string, stdin: string, language: string): string {
  return '#code=' + compressToEncodedURIComponent(JSON.stringify({ code, stdin, language }));
}

/**
 * Modern compact short share URL encoder.
 * Packs fields into a minimal tuple [langCode, stdin?, code] without JSON field overhead.
 */
export function encodeShortShare(code: string, stdin: string, language: string): string {
  const langKey = (LANG_TO_CODE[language as ShareLanguage] ?? language) as string;
  const payload = stdin ? [langKey, stdin, code] : [langKey, code];
  return '#s=' + compressToEncodedURIComponent(JSON.stringify(payload));
}

/**
 * Universal share decoder that accepts:
 * - `#code=<payload>` (legacy compressed object)
 * - `#s=<payload>` (compact compressed tuple or object)
 * - Query strings `?code=...` or `?s=...`
 * - Full URLs containing any of the above
 */
export function decodeShare(
  input: string,
): { code: string; stdin: string; language: ShareLanguage } | null {
  try {
    if (!input || typeof input !== 'string') return null;

    let fragment = input.trim();

    // Extract fragment from full URL if provided
    if (fragment.includes('#')) {
      fragment = fragment.slice(fragment.indexOf('#'));
    } else if (fragment.includes('?')) {
      const query = fragment.slice(fragment.indexOf('?'));
      const params = new URLSearchParams(query);
      if (params.has('s')) fragment = '#s=' + params.get('s')!;
      else if (params.has('code')) fragment = '#code=' + params.get('code')!;
    }

    if (fragment.length > MAX_SHARE_FRAGMENT_LENGTH) return null;

    let rawPayload = '';

    if (fragment.startsWith('#code=')) {
      rawPayload = fragment.slice(6);
    } else if (fragment.startsWith('#s=')) {
      rawPayload = fragment.slice(3);
    } else {
      return null;
    }

    if (!rawPayload) return null;

    const decompressed = decompressBounded(rawPayload, MAX_SHARE_JSON_LENGTH);
    if (!decompressed) return null;

    const data: unknown = JSON.parse(decompressed);
    if (!data) return null;

    // Handle compact tuple format: [lang, code] or [lang, stdin, code]
    if (Array.isArray(data)) {
      if (data.length < 2 || data.length > 3) return null;
      const langStr = String(data[0]);
      const mappedLang = LANG_CODE_MAP[langStr] ?? (langStr as ShareLanguage);
      if (!['python', 'javascript', 'cpp', 'java'].includes(mappedLang)) return null;

      const stdin = data.length === 3 ? String(data[1]) : '';
      const code = data.length === 3 ? String(data[2]) : String(data[1]);

      if (code.length > MAX_CODE_LENGTH || stdin.length > limits.stdin) return null;
      return { code, stdin, language: mappedLang };
    }

    // Handle standard object format { code, stdin, language }
    if (typeof data === 'object') {
      const d = data as Record<string, unknown>;
      const code = typeof d.code === 'string' ? d.code : typeof d.c === 'string' ? d.c : null;
      const stdin = typeof d.stdin === 'string' ? d.stdin : typeof d.s === 'string' ? d.s : '';
      const rawLang =
        typeof d.language === 'string' ? d.language : typeof d.l === 'string' ? d.l : null;

      if (!code || code.length > MAX_CODE_LENGTH) return null;
      if (typeof stdin !== 'string' || stdin.length > limits.stdin) return null;
      if (!rawLang) return null;

      const mappedLang = LANG_CODE_MAP[rawLang] ?? (rawLang as ShareLanguage);
      if (!['python', 'javascript', 'cpp', 'java'].includes(mappedLang)) return null;

      return { code, stdin, language: mappedLang };
    }

    return null;
  } catch {
    return null;
  }
}
