import type { Language } from './breakdown';
export type LanguageMode = Language | 'auto';
export type SourceOrigin = 'draft' | 'sample' | 'library' | 'share';
export const DETECTION_MIN_CHARS = 32;
export const DETECTION_CONFIDENCE = 0.65;
export const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  cpp: 'C++',
  java: 'Java',
};
export type Detection =
  | { kind: 'supported'; language: Language; confidence: number }
  | { kind: 'unsupported'; languageId: string; confidence: number }
  | { kind: 'ambiguous' };
const supported: Record<string, Language> = {
  py: 'python',
  js: 'javascript',
  ts: 'javascript',
  cpp: 'cpp',
  c: 'cpp',
  java: 'java',
};

export function modelDetection(results: { languageId: string; confidence: number }[]): Detection {
  const ranked = results
    .filter((r) => Number.isFinite(r.confidence) && r.confidence >= 0 && r.confidence <= 1)
    .toSorted((a, b) => b.confidence - a.confidence);
  const best = ranked[0];
  if (
    !best ||
    best.confidence < DETECTION_CONFIDENCE ||
    (ranked[1] && best.confidence - ranked[1].confidence < 0.15)
  )
    return { kind: 'ambiguous' };
  return Object.hasOwn(supported, best.languageId)
    ? { kind: 'supported', language: supported[best.languageId], confidence: best.confidence }
    : { kind: 'unsupported', languageId: best.languageId, confidence: best.confidence };
}

export function heuristicDetection(source: string): Detection {
  if (source.replace(/\s/g, '').length < DETECTION_MIN_CHARS) return { kind: 'ambiguous' };
  const firstLine = source.trimStart().split('\n')[0];
  if (firstLine.startsWith('#!')) {
    if (/\bpython(?:\d(?:\.\d+)?)?\b/.test(firstLine))
      return { kind: 'supported', language: 'python', confidence: 1 };
    if (/\b(node|nodejs|deno|bun)\b/.test(firstLine))
      return { kind: 'supported', language: 'javascript', confidence: 1 };
    if (/\b(bash|sh|ruby|perl|php)\b/.test(firstLine))
      return { kind: 'unsupported', languageId: 'shebang', confidence: 1 };
  }

  const code = source.replace(
    /(['"`])(?:\\[\s\S]|(?!\1)[^\\])*?\1|\/\/[^\n]*|\/\*[\s\S]*?\*\/|^[\t ]*#(?!\s*include\b)[^\n]*/gm,
    '',
  );
  const signals: [Language, boolean][] = [
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
  if (hits.length === 1) return { kind: 'supported', language: hits[0][0], confidence: 0.98 };
  if (
    !hits.length &&
    (/\bfn\s+main\s*\(/.test(code) || /\bpackage\s+main\b/.test(code) || /<\?php/.test(code))
  )
    return { kind: 'unsupported', languageId: 'other', confidence: 0.98 };
  return { kind: 'ambiguous' };
}

export function canAutoSwitch(state: {
  languageMode: LanguageMode;
  languageChosenManually: boolean;
  sourceOrigin: SourceOrigin;
  autoSwitchEligible: boolean;
  status: string;
}) {
  return (
    state.languageMode === 'auto' &&
    !state.languageChosenManually &&
    state.sourceOrigin === 'draft' &&
    state.autoSwitchEligible &&
    !['loading', 'running'].includes(state.status)
  );
}
