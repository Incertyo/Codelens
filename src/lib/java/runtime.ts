const checked = <T>(value: T | null): T => {
  if (value === null) throw new Error('NullPointerException');
  return value;
};
const indexOf = (value: unknown[], index: number) => {
  checked(value);
  if (!Number.isInteger(index) || index < 0 || index >= value.length)
    throw new Error(`ArrayIndexOutOfBoundsException: index ${index}, length ${value.length}`);
  return index;
};
export function createJavaRuntime(stdin: string, output: (text: string) => void) {
  const scanners = new WeakSet<object>();
  const scannerState = new WeakMap<object, number>();
  const position = (scanner: object) => {
    checked(scanner);
    if (!scanners.has(scanner)) throw new Error('IllegalStateException: Scanner is closed.');
    return scannerState.get(scanner) ?? 0;
  };
  const parseInteger = (value: string) => {
    checked(value);
    if (
      !/^[+-]?\d+$/.test(value) ||
      !Number.isInteger(Number(value)) ||
      Number(value) < -2147483648 ||
      Number(value) > 2147483647
    )
      throw new Error('NumberFormatException: expected a signed 32-bit integer.');
    return Number(value) | 0;
  };
  const token = (scanner: object) => {
    const offset = position(scanner),
      match = /^\s*(\S+)/.exec(stdin.slice(offset));
    return match ? { value: match[1], end: offset + match[0].length } : null;
  };
  const next = (scanner: object) => {
    const value = token(scanner);
    if (!value) throw new Error('NoSuchElementException: no more stdin tokens.');
    scannerState.set(scanner, value.end);
    return value.value;
  };
  return Object.freeze({
    integer(operator: string, a: number, b: number) {
      switch (operator) {
        case '+':
          return (a + b) | 0;
        case '-':
          return (a - b) | 0;
        case '*':
          return Math.imul(a, b);
        case '/':
          if (b === 0) throw new Error('ArithmeticException: / by zero');
          return Math.trunc(a / b) | 0;
        case '%':
          if (b === 0) throw new Error('ArithmeticException: / by zero');
          return (a % b) | 0;
        case '&':
          return a & b;
        case '|':
          return a | b;
        case '^':
          return a ^ b;
        case '<<':
          return a << b;
        case '>>':
          return a >> b;
        case '>>>':
          return (a >>> b) | 0;
        default:
          throw new Error('Unsupported integer operation.');
      }
    },
    array(size: number, value: unknown) {
      if (size < 0) throw new Error('NegativeArraySizeException');
      if (!Number.isInteger(size) || size > 100_000)
        throw new Error('Java subset array limit: 100,000 elements.');
      return Array(size).fill(value);
    },
    get(array: unknown[], index: number) {
      return array[indexOf(array, index)];
    },
    set(array: unknown[], index: number, value: unknown) {
      array[indexOf(array, index)] = value;
      return value;
    },
    length(value: unknown[] | string) {
      return checked(value).length;
    },
    equals(value: string, other: string | null) {
      return checked(value) === other;
    },
    substring(value: string, start: number, end?: number) {
      checked(value);
      if (start < 0 || (end ?? value.length) > value.length || start > (end ?? value.length))
        throw new Error('StringIndexOutOfBoundsException');
      return value.slice(start, end);
    },
    concat(a: unknown, b: unknown) {
      const value = String(a) + String(b);
      if (value.length > 100_000) throw new Error('Java subset string limit: 100,000 characters.');
      return value;
    },
    math(name: string, a: number, b?: number) {
      return (
        (name === 'abs' ? Math.abs(a) : name === 'min' ? Math.min(a, b!) : Math.max(a, b!)) | 0
      );
    },
    arrayString(array: unknown[] | null) {
      return array === null ? 'null' : `[${array.map(String).join(', ')}]`;
    },
    print(value: unknown, newline: boolean) {
      output(String(value) + (newline ? '\n' : ''));
    },
    scanner() {
      const value = Object.create(null) as object;
      scanners.add(value);
      scannerState.set(value, 0);
      return value;
    },
    next,
    nextInt(scanner: object) {
      const value = token(scanner);
      if (!value) throw new Error('NoSuchElementException: no more stdin tokens.');
      let parsed: number;
      try {
        parsed = parseInteger(value.value);
      } catch {
        throw new Error('InputMismatchException: expected an int.');
      }
      scannerState.set(scanner, value.end);
      return parsed;
    },
    nextLine(scanner: object) {
      const offset = position(scanner);
      if (offset >= stdin.length) throw new Error('NoSuchElementException: no more stdin lines.');
      const match = /\r\n|[\r\n]/.exec(stdin.slice(offset));
      const end = match ? offset + match.index : stdin.length;
      scannerState.set(scanner, end + (match?.[0].length ?? 0));
      return stdin.slice(offset, end);
    },
    hasNextInt(scanner: object) {
      const value = token(scanner);
      if (!value) return false;
      try {
        parseInteger(value.value);
        return true;
      } catch {
        return false;
      }
    },
    hasNextLine(scanner: object) {
      return position(scanner) < stdin.length;
    },
    close(scanner: object) {
      position(scanner);
      scanners.delete(scanner);
    },
    parseInt: parseInteger,
  });
}
