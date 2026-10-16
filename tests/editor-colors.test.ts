import { expect, it } from 'vitest';
import { monacoTokenColor } from "../src/features/editor/public/colors";
it.each([
  ['#111', '111111'],
  ['#abc', 'aabbcc'],
  ['#0e0e0e', '0e0e0e'],
  [' #ABCD ', 'AABBCCDD'],
  ['#ffffff00', 'ffffff00'],
])('expands production CSS token color %s for Monaco', (css, expected) => {
  expect(monacoTokenColor(css)).toBe(expected);
});
