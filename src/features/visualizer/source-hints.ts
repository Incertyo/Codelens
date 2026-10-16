import type { DetectionHints, DPAccess } from './models';
export function sourceHints(
  code = '',
  language: string = 'python',
  visualMapping?: {
    primaryStructure?: string;
    highlights?: Array<{ step: number; variable: string; reason: string }>;
    keyOperations?: Array<{ line: number; type: string; description: string }>;
  },
): DetectionHints {
  const clean = code.replace(
    language === 'python'
      ? /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*)/g
      : /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g,
    (s) => s.replace(/[^\n]/g, ' '),
  );
  const lines = clean.split('\n');
  const methods = new Map<string, Set<string>>();
  const indexed = new Set<string>(),
    heaps = new Set<string>(),
    bitwise = new Set<string>(),
    segments = new Set<string>();
  for (const m of clean.matchAll(
    /\b([A-Za-z_$]\w*)\s*\.\s*(append|pop|push|shift|unshift|popleft|appendleft|sort|splice|extend|insert|reverse)\s*\(([^)]*)\)/g,
  )) {
    const op =
      m[2] === 'pop' && language === 'python'
        ? /^\s*0\s*$/.test(m[3])
          ? 'pop_front'
          : m[3].trim() && m[3].trim() !== '-1'
            ? 'pop_index'
            : 'pop'
        : m[2];
    if (!methods.has(m[1])) methods.set(m[1], new Set());
    methods.get(m[1])!.add(op);
  }
  for (const m of clean.matchAll(/\b([A-Za-z_$]\w*)\s*\[/g)) indexed.add(m[1]);
  for (const m of clean.matchAll(/\b([A-Za-z_$]\w*)\s*\[[^\]\n]+\]\s*(?:[+\-*/]?=)(?!=)/g)) {
    if (!methods.has(m[1])) methods.set(m[1], new Set());
    methods.get(m[1])!.add('indexed_write');
  }
  for (const m of clean.matchAll(
    /\b(?:heappush|heappop|heapify|heapreplace|heappushpop)\s*\(\s*([A-Za-z_$]\w*)/g,
  ))
    heaps.add(m[1]);
  for (const line of lines) {
    if (/(?:<<|>>|(?<![&])&(?![&])|(?<![|])\|(?![|])|\^|~)/.test(line))
      for (const m of line.matchAll(/\b[A-Za-z_$]\w*\b/g)) bitwise.add(m[0]);
    for (const statement of line.split(';')) {
      const alloc = statement.match(
        /\b([A-Za-z_$]\w*)\s*=[^,;\n]*(?:\*\s*[24]\s*\*|\*\s*\(?[24]\s*\*|(?:Array|zeros)\s*\(\s*[24]\s*\*)/,
      );
      if (alloc) segments.add(alloc[1]);
    }
  }
  const dp: DPAccess[] = [];
  const nested = (clean.match(/\b(?:for|while)\b/g)?.length ?? 0) >= 2;
  if (nested)
    lines.forEach((line, index) => {
      const match = line.match(/\b([A-Za-z_$]\w*)\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*=(?!=)(.*)/);
      if (!match) return;
      const sources = [
        ...match[4].matchAll(
          new RegExp(`\\b${match[1]}\\s*\\[([^\\]]+)\\]\\s*\\[([^\\]]+)\\]`, 'g'),
        ),
      ].map((m) => ({ row: m[1], col: m[2] }));
      if (sources.some((s) => /-\s*\d|\b(?:w|weight)\b/.test(s.row + s.col)))
        dp.push({ name: match[1], row: match[2], col: match[3], line: index + 1, sources });
    });
  if (visualMapping?.primaryStructure) {
    const ps = visualMapping.primaryStructure.toLowerCase();
    if (ps.includes('heap')) heaps.add(visualMapping.primaryStructure);
    if (ps.includes('tree') || ps.includes('segment')) segments.add(visualMapping.primaryStructure);
    if (ps.includes('bit') || ps.includes('mask')) bitwise.add(visualMapping.primaryStructure);
  }
  if (visualMapping?.keyOperations) {
    for (const op of visualMapping.keyOperations) {
      const t = op.type.toLowerCase();
      if (t.includes('heap') && visualMapping.primaryStructure) heaps.add(visualMapping.primaryStructure);
      if ((t.includes('bit') || t.includes('mask')) && visualMapping.primaryStructure)
        bitwise.add(visualMapping.primaryStructure);
    }
  }
  return {
    language,
    lines,
    methods,
    indexed,
    heaps,
    bitwise,
    segments,
    dp,
    primaryStructure: visualMapping?.primaryStructure,
    fenwick: /\b(\w+)\s*&\s*-\s*\1\b/.test(clean),
  };
}
