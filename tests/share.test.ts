import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare } from '../src/lib/share';
describe('share links', () => {
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
});
