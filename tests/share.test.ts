import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare } from '../src/lib/share';
import lz from 'lz-string';
import { decompressBounded } from '../src/lib/bounded-lz';
describe('share links', () => {
  it('bounds expansion during LZ decoding and preserves valid UTF-16 payloads', () => {
    let seed = 71431;
    const corpus = [1, 2, 3, 7, 32, 257, 4096, 30000].map((length) =>
      Array.from({ length }, () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return String.fromCharCode(seed >>> 16);
      }).join(''),
    );
    for (const text of ['', 'abcabcabc', '😀你好\u0000\n', '\u0001'.repeat(40000), ...corpus]) {
      const compressed = lz.compressToEncodedURIComponent(text);
      expect(decompressBounded(compressed, Math.max(1, text.length))).toBe(text);
      if (text.length > 1) expect(decompressBounded(compressed, text.length - 1)).toBeNull();
    }
    expect(decodeShare('#code=' + 'A'.repeat(100000))).toBeNull();
    expect(
      decodeShare(encodeShare('\u0001'.repeat(30000), '\u0002'.repeat(10000), 'python')),
    ).toEqual({ code: '\u0001'.repeat(30000), stdin: '\u0002'.repeat(10000), language: 'python' });
  });
  it('rejects expanded JSON over budget even when its source fields are valid', () => {
    const expanded = JSON.stringify({
      code: 'print(1)',
      stdin: '',
      language: 'python',
      padding: 'x'.repeat(250000),
    });
    expect(decodeShare('#code=' + lz.compressToEncodedURIComponent(expanded))).toBeNull();
  });
  it('round-trips JavaScript and stdin', () => {
    const code = 'const x=input();\nconsole.log(x);';
    expect(decodeShare(encodeShare(code, 'Ada\n', 'javascript'))).toEqual({
      code,
      stdin: 'Ada\n',
      language: 'javascript',
    });
  });
  it('round-trips unicode and multiline code with stdin', () => {
    const code = 'print("你好")\nx = input()';
    expect(decodeShare(encodeShare(code, 'hello\n', 'python'))).toEqual({
      code,
      stdin: 'hello\n',
      language: 'python',
    });
  });
  it('rejects corrupted and invalid payloads', () => {
    expect(decodeShare('#code=broken')).toBeNull();
    expect(decodeShare(encodeShare('x'.repeat(30001), '', 'python'))).toBeNull();
    expect(decodeShare(encodeShare('print(1)', '', 'ruby'))).toBeNull();
  });
  it.each(['cpp', 'java'])('shares %s source without consent or execution state', (language) => {
    expect(decodeShare(encodeShare('source only', '', language))).toEqual({
      code: 'source only',
      stdin: '',
      language,
    });
  });
  it('generates compact short URLs and universally decodes hashes, query params, and full URLs', async () => {
    const { encodeShortShare, computeCodeHash } = await import('../src/lib/share');
    const code = 'def binary_search(arr, target):\n    return 42';
    const shortHash = encodeShortShare(code, 'input\n', 'python');
    expect(shortHash.startsWith('#s=')).toBe(true);
    expect(shortHash.length).toBeLessThan(encodeShare(code, 'input\n', 'python').length);

    // Round-trip short share
    expect(decodeShare(shortHash)).toEqual({
      code,
      stdin: 'input\n',
      language: 'python',
    });

    // Universal full URL decoding
    expect(decodeShare(`https://codelens.dev/${shortHash}`)).toEqual({
      code,
      stdin: 'input\n',
      language: 'python',
    });

    // Query parameter decoding
    const queryUrl = `https://codelens.dev/?s=${shortHash.slice(3)}`;
    expect(decodeShare(queryUrl)).toEqual({
      code,
      stdin: 'input\n',
      language: 'python',
    });

    // Universal hash generation
    const hash1 = computeCodeHash(code, 'python');
    const hash2 = computeCodeHash(code, 'python');
    const hash3 = computeCodeHash(code, 'javascript');
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBeGreaterThan(6);
  });
});
