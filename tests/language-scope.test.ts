import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { POST } from '../src/app/api/analyze/route';
import { analyzeRequestSchema } from '../src/lib/ai/analyze';
import { adviceRequestSchema } from '../src/lib/ai/phase3';
import { heuristicDetection, modelDetection } from '../src/lib/language-detection';
import { decodeShare, encodeShare, encodeShortShare } from '../src/lib/share';
import type { Language } from '../src/lib/breakdown';

describe('Python and JavaScript execution scope', () => {
  it('narrows the execution language contract', () => {
    expectTypeOf<Language>().toEqualTypeOf<'python' | 'javascript'>();
  });

  it.each(['c', 'cpp', 'java', 'ts'])('keeps model winner %s unsupported', (languageId) => {
    expect(
      modelDetection([
        { languageId, confidence: 0.99 },
        { languageId: 'py', confidence: 0.01 },
      ]),
    ).toEqual({ kind: 'unsupported', languageId, confidence: 0.99 });
  });

  it.each([
    ['cpp', '#include <iostream>\nint main() { std::cout << 42 << std::endl; }'],
    [
      'java',
      'public class Main { public static void main(String[] args) { System.out.println(42); } }',
    ],
    ['ts', 'const values: number[] = [1,2,3];\nconsole.log(values);'],
  ])('reports heuristic %s as unsupported', (languageId, source) => {
    expect(heuristicDetection(source)).toMatchObject({ kind: 'unsupported', languageId });
  });

  it.each(['cpp', 'java'])('retains exact legacy %s share source and stdin', (language) => {
    const source = language === 'cpp' ? 'int main() { return 0; }' : 'class Main {}';
    for (const encode of [encodeShare, encodeShortShare])
      expect(decodeShare(encode(source, 'private stdin', language))).toEqual({
        code: source,
        stdin: 'private stdin',
        language,
      });
  });

  it.each(['cpp', 'java'])(
    'rejects removed simulation for %s before any service call',
    async (language) => {
      const fetch = vi.spyOn(globalThis, 'fetch');
      const code = language === 'cpp' ? 'int main(){}' : 'class Main {}';
      try {
        const response = await POST(
          new Request('http://localhost/api/analyze', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              mode: 'simulate',
              language,
              code,
              consent: true,
              identity: {
                implementationId: `draft:${language}`,
                sourceHash: createHash('sha256').update(code).digest('hex'),
              },
              maxSteps: 100,
            }),
          }),
        );
        expect(response.status).toBe(410);
        expect(await response.json()).toEqual({
          error: 'AI-simulated traces have been removed. Run Python or JavaScript locally.',
        });
        expect(fetch).not.toHaveBeenCalled();
      } finally {
        fetch.mockRestore();
      }
    },
  );

  it.each(['cpp', 'java'])('rejects unsupported %s notes and advice schemas', (language) => {
    const code = 'class Main {}';
    expect(
      analyzeRequestSchema.safeParse({ code, language, functions: [], steps: [] }).success,
    ).toBe(false);
    expect(
      adviceRequestSchema.safeParse({
        mode: 'analysis',
        code,
        language,
        identity: {
          implementationId: 'draft',
          sourceHash: createHash('sha256').update(code).digest('hex'),
        },
        entries: [],
      }).success,
    ).toBe(false);
  });
});
