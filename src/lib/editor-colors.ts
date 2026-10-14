export function monacoTokenColor(cssHex: string): string {
  const hex = cssHex.trim().replace(/^#/, '');
  return hex.length === 3 || hex.length === 4
    ? [...hex].map((digit) => digit + digit).join('')
    : hex;
}
