const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';

export function decompressBounded(encoded: string, maxLength: number): string | null {
  if (!encoded || !Number.isSafeInteger(maxLength) || maxLength < 1) return null;
  const input = encoded.replace(/ /g, '+');
  if (/[^A-Za-z0-9+\-$]/.test(input)) return null;
  let offset = 0;
  let position = 32;
  const read = (count: number) => {
    let value = 0;
    for (let power = 0; power < count; power++) {
      if (offset >= input.length) throw new Error('Incomplete compressed share.');
      if (alphabet.indexOf(input[offset]) & position) value += 2 ** power;
      position >>= 1;
      if (!position) {
        position = 32;
        offset++;
      }
    }
    return value;
  };
  try {
    const first = read(2);
    if (first === 2) return '';
    if (first !== 0 && first !== 1) return null;
    let previous = String.fromCharCode(read(first === 0 ? 8 : 16));
    const dictionary = ['', '', '', previous];
    const output = [previous];
    let length = previous.length;
    let remaining = 4;
    let width = 3;
    const enlarge = () => {
      if (!remaining) {
        remaining = 2 ** width;
        width++;
      }
    };
    while (offset < input.length) {
      let code = read(width);
      if (code === 2) return output.join('');
      if (code === 0 || code === 1) {
        dictionary.push(String.fromCharCode(read(code === 0 ? 8 : 16)));
        code = dictionary.length - 1;
        remaining--;
      }
      enlarge();
      const entry =
        dictionary[code] || (code === dictionary.length ? previous + previous[0] : null);
      if (!entry || length + entry.length > maxLength) return null;
      length += entry.length;
      output.push(entry);
      dictionary.push(previous + entry[0]);
      remaining--;
      previous = entry;
      enlarge();
    }
  } catch {
    return null;
  }
  return null;
}
