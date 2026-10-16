import { describe, expect, it } from 'vitest';
import { editorLanguage, editorSourceIssue, editorDetection, unsupportedShareLanguage } from '../src/lib/editor-language';
import { heuristicDetection } from '../src/lib/language-detection';
import { decodeShare, encodeShare } from '../src/lib/share';
import catalog from '../src/generated/library.json';

describe('Python-only editor boundary', () => {
  it('keeps Python as the sole editor runtime', () => {
    expect(editorLanguage).toBe('python');
    expect(editorSourceIssue('def algorithm(n):\n    return n + 1\nprint(algorithm(2))')).toBeNull();
  });
  it('admits every frozen Python catalog implementation', () => {
    for (const entry of catalog.index.implementations.filter((row) => row.language === 'python')) {
      const implementation = catalog.implementations.find((row) => row.id === entry.id)!;
      expect(editorSourceIssue(implementation.code), entry.id).toBeNull();
    }
  });
  it.each([
    'const values = [1, 2, 3];\nconsole.log(values.length);',
    'public class Main { public static void main(String[] args) {} }',
    '#include <iostream>\nint main() { std::cout << 2; }',
    'function algorithm(n: number): number { return n + 1; }',
  ])('rejects recognized non-Python source without changing text', (source) => {
    expect(editorSourceIssue(source)).toBe('Only Python can run in this editor.');
  });
  it('maps real JavaScript detection to unsupported at the editor boundary', () => {
    const detection = editorDetection(heuristicDetection('function algorithm(n) { return n + 1; }'));
    expect(detection.kind).toBe('unsupported');
    if (detection.kind === 'unsupported') expect(detection.languageId).toBe('js');
  });
  it.each(['python', 'javascript', 'cpp', 'java'] as const)('keeps %s share source and input intact', (language) => {
    const share = decodeShare(encodeShare('preserve exact source', 'preserve stdin', language))!;
    expect(share.code).toBe('preserve exact source');
    expect(share.stdin).toBe('preserve stdin');
    expect(unsupportedShareLanguage(share.language)).toBe(language === 'python' ? null : language);
  });
});
