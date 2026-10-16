import { limits } from '@/shared/limits';
import type { Language } from "../../shared/breakdown";
export type LanguageMode = Language | 'auto';
export type SourceOrigin = 'draft' | 'sample' | 'library' | 'share';
export const DETECTION_MIN_CHARS = limits.detectionMinCharacters;
export const LANGUAGE_LABELS: Record<string, string> = {
  python: 'Python',
};
export type Detection =
  | { kind: 'supported'; language: Language; confidence: number }
  | { kind: 'unsupported'; languageId: string; confidence: number }
  | { kind: 'ambiguous' };

export function heuristicDetection(source: string): Detection {
  if (source.replace(/\s/g, '').length < DETECTION_MIN_CHARS) return { kind: 'ambiguous' };
  const firstLine = source.trimStart().split('\n')[0];
  if (firstLine.startsWith('#!')) {
    if (/\bpython(?:\d(?:\.\d+)?)?\b/.test(firstLine))
      return { kind: 'supported', language: 'python', confidence: 1 };
    if (/\b(node|nodejs|deno|bun)\b/.test(firstLine))
      return { kind: 'unsupported', languageId: 'js', confidence: 1 };
    if (/\b(bash|sh|ruby|perl|php)\b/.test(firstLine))
      return { kind: 'unsupported', languageId: 'shebang', confidence: 1 };
  }

  const code = source.replace(
    /(['"`])(?:\\[\s\S]|(?!\1)[^\\])*?\1|\/\/[^\n]*|\/\*[\s\S]*?\*\/|^[\t ]*#(?!\s*include\b)[^\n]*/gm,
    '',
  );
  if (
    /\b(?:const|let|var)\s+\w+\s*:\s*[A-Za-z_$][\w$]*(?:\[\])?\s*=|\b(?:interface|type)\s+\w+\s*(?:\{|=)|\bfunction\s+\w+\s*\([^)]*\w+\s*:\s*(?:number|string|boolean)\b/.test(
      code,
    )
  )
    return { kind: 'unsupported', languageId: 'ts', confidence: 0.98 };
  const signals: ['python' | 'javascript' | 'cpp' | 'java', boolean][] = [
    [
      'python',
      /(^|\n)\s*(?:async\s+)?def\s+\w+\s*\([^\n]*\)\s*(?:->[^\n:]+)?\s*:/.test(code) ||
        /(^|\n)\s*(?:from\s+\w+\s+import\s+|class\s+\w+[^\n]*:)/.test(code),
    ],
    [
      'javascript',
      /\bfunction\s+\w*\s*\(/.test(code) ||
        /\b(?:const|let)\s+\w+\s*=/.test(code) ||
        /\bconsole\.(?:log|error)\s*\(/.test(code),
    ],
    ['cpp', /(^|\n)\s*#\s*include\b/.test(code) || /\bstd::|\b(?:cout|cin)\s*(?:<<|>>)/.test(code)],
    ['java', /\bSystem\.out\.|\bpublic\s+(?:static\s+)?(?:class|void|int|String)\b/.test(code)],
  ];
  const hits = signals.filter(([, present]) => present);
  if (hits.length === 1) {
    const language = hits[0][0];
    return language === 'python'
      ? { kind: 'supported', language: 'python', confidence: 0.98 }
      : { kind: 'unsupported', languageId: language === 'javascript' ? 'js' : language, confidence: 0.98 };
  }
  if (
    !hits.length &&
    (/\bfn\s+main\s*\(/.test(code) || /\bpackage\s+main\b/.test(code) || /<\?php/.test(code))
  )
    return { kind: 'unsupported', languageId: 'other', confidence: 0.98 };
  return { kind: 'ambiguous' };
}

