import type { Inspection } from '../analysis';
import type { BreakdownData } from '../breakdown';
import { analyzeJavaScript } from '../javascript/ast';
import { inspectJavaScript } from '../javascript/analysis';
import { compileJavaSubset } from './compiler';

export function analyzeJavaSubset(code: string): BreakdownData {
  try {
    const compiled = compileJavaSubset(code, false);
    const data = analyzeJavaScript(code, compiled.root);
    return { ...data, summary: `Java subset compiled locally. ${data.summary}` };
  } catch (error) {
    return {
      summary: 'Java source is outside the supported subset or has a syntax error.',
      pattern: 'Not analyzed',
      functions: [],
      outline: [],
      annotations: [],
      concepts: [],
      diagnostic: error instanceof Error ? error.message : 'Java subset compilation failed.',
    };
  }
}
export function inspectJavaSubset(code: string): Inspection {
  try {
    const compiled = compileJavaSubset(code, false);
    const inspection = inspectJavaScript(code, compiled.root);
    return {
      ...inspection,
      moduleCode: code,
      entries: inspection.entries.map((entry) => {
        const method = compiled.methods.find((candidate) => candidate.name === entry.name)!;
        const parameter = method.parameters[0];
        const kinds: typeof entry.kinds =
          method.parameters.length !== 1
            ? []
            : parameter.type === 'int' && parameter.name === 'n'
              ? ['int']
              : parameter.type === 'int[]'
                ? ['list']
                : parameter.type === 'String'
                  ? ['string']
                  : [];
        return {
          ...entry,
          kinds,
          reason: kinds.length
            ? null
            : 'Choose a static method with one int n, int[] or String parameter. main is not a measurement entry.',
          evidence: `${entry.evidence} Java subset compiler operations are counted at their original source lines; runtime helpers are excluded.`,
        };
      }),
    };
  } catch (error) {
    return {
      entries: [],
      moduleCode: '',
      diagnostic: error instanceof Error ? error.message : 'Java subset compilation failed.',
      preparationReason: null,
    };
  }
}
export function javaTestHarness(
  code: string,
  entry: string,
  argument: number | number[] | string,
): string {
  const compiled = compileJavaSubset(code, false);
  const method = compiled.methods.find((candidate) => candidate.name === entry);
  if (!method || method.parameters.length !== 1)
    throw new Error('Choose a Java method with one parameter.');
  const literal = Array.isArray(argument)
    ? `new int[]{${argument.join(',')}}`
    : JSON.stringify(argument);
  const call = `${entry}(${literal})`;
  const body =
    method.type === 'void'
      ? `{${call};}`
      : `{System.out.println(${method.type.endsWith('[]') ? `Arrays.toString(${call})` : call});}`;
  const main = compiled.methods.find((candidate) => candidate.name === 'main');
  let result = main
    ? code.slice(0, main.bodyStart) + body + code.slice(main.bodyEnd)
    : code.slice(0, code.lastIndexOf('}')) + `public static void main(String[] args)${body}}`;
  if (method.type.endsWith('[]') && !/import\s+java\.util\.Arrays\s*;/.test(result))
    result = `import java.util.Arrays;\n${result}`;
  if (result.length > 30_000)
    throw new Error('The generated Java driver exceeds the source limit.');
  compileJavaSubset(result);
  return result;
}
