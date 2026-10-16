import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileJavaSubset } from '../src/lib/java/compiler';
import { createJavaRuntime } from '../src/lib/java/runtime';
import { analyzeJavaSubset, inspectJavaSubset, javaTestHarness } from '../src/lib/java/analysis';
import { executeJavaSubsetMeasurement } from '../src/lib/java/measurement';
import { instrumentJavaScript } from '../src/lib/javascript/instrument';
import { JavaScriptTrace } from '../src/lib/javascript/runtime';
import { traceSchema } from '../src/lib/trace';
import { javaExample } from '../src/lib/java/example';
import { detectVisualModels, sourceHints } from '../src/lib/visualizer/detectors';

function run(source: string, stdin = '', maxSteps = 5000) {
  const trace = new JavaScriptTrace(maxSteps);
  try {
    const compiled = compileJavaSubset(source);
    const instrumented = instrumentJavaScript('', compiled.root);
    new Function(instrumented.hookName, '__java', `"use strict";${instrumented.code}`)(
      trace,
      createJavaRuntime(stdin, trace.writeOutput),
    );
    return traceSchema.parse(trace.result());
  } catch (error) {
    return traceSchema.parse(trace.result(error));
  }
}
const program = (body: string) =>
  `public class Main { public static void main(String[] args) { ${body} } }`;
const fixtures = [
  javaExample,
  program(
    'int max = 2147483647; max++; System.out.println(max); System.out.println(-7 / 3); System.out.println(-7 % 3); System.out.println(-2147483648 / -1); System.out.println(65536 * 65536); System.out.println(-1 >>> 0);',
  ),
  `public class Main {
static int factorial(int n) {
if (n <= 1) return 1;
return n * factorial(n - 1);
}
public static void main(String[] args) { System.out.println(factorial(6)); }
}`,
  program(
    'int[] values = {5,1,4,2,8}; for (int i=0; i<values.length; i++) { for (int j=0; j<values.length-1; j++) { if(values[j]>values[j+1]) { int tmp=values[j]; values[j]=values[j+1]; values[j+1]=tmp; } } } System.out.println(java.util.Arrays.toString(values));',
  )
    .replace('java.util.Arrays', 'Arrays')
    .replace('public class', 'import java.util.Arrays; public class'),
  program(
    'String text = "hello"; System.out.print(text.substring(1,4)); System.out.println(text.equals("hello")); System.out.println("value=" + (2+3)); System.out.println(Math.abs(-2147483648)); int i=0; while(i<4){i++;if(i==2)continue; if(i==4)break; System.out.println(i);}',
  ),
];
describe('deterministic Java subset compiler and real instrumenter', () => {
  it.each(fixtures.map((source, index) => ({ source, index })))(
    'runs accepted fixture $index',
    ({ source }) => {
      const trace = run(source);
      expect(trace.error).toBeNull();
      expect(trace.truncated).toBe(false);
      expect(trace.steps.at(-1)?.stdout).not.toBe('');
    },
  );
  const jdk = spawnSync('javac', ['-version'], { windowsHide: true, encoding: 'utf8' });
  it.skipIf(jdk.status !== 0).each(fixtures.map((source, index) => ({ source, index })))(
    'matches javac/JVM stdout for trusted fixture $index',
    ({ source }) => {
      const directory = mkdtempSync(join(tmpdir(), 'codelens-java-'));
      try {
        writeFileSync(join(directory, 'Main.java'), source);
        execFileSync('javac', ['-encoding', 'UTF-8', 'Main.java'], {
          cwd: directory,
          windowsHide: true,
          timeout: 20000,
          stdio: 'pipe',
        });
        const expected = execFileSync('java', ['-cp', directory, 'Main'], {
          encoding: 'utf8',
          windowsHide: true,
          timeout: 20000,
        });
        expect(run(source).steps.at(-1)?.stdout).toBe(expected.replaceAll('\r\n', '\n'));
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
    30000,
  );
  it('keeps original source lines, recursion, return values and heatmap events', () => {
    const trace = run(fixtures[2]);
    expect(
      trace.steps.filter((step) => step.func === 'factorial' && step.event === 'call'),
    ).toHaveLength(6);
    expect(trace.steps.filter((step) => step.event === 'line' && step.line === 4)).toHaveLength(5);
    expect(
      trace.steps.some(
        (step) => step.event === 'return' && step.callStack.at(-1)?.locals['↳ return'] === 720,
      ),
    ).toBe(true);
    expect(trace.steps.every((step) => step.line <= fixtures[2].split('\n').length)).toBe(true);
    expect(trace.steps.every((step) => !Object.keys(step.globals).includes('__java'))).toBe(true);
  });
  it('feeds real array snapshots into the existing visualization models', () => {
    const trace = run(javaExample);
    const arrayStep = trace.steps.find(
      (step) =>
        step.callStack.at(-1)?.locals.values &&
        step.heap[(step.callStack.at(-1)!.locals.values as { ref: string }).ref]?.items?.length ===
          5,
    )!;
    expect(arrayStep).toBeDefined();
    expect(
      detectVisualModels(arrayStep, sourceHints(javaExample, 'java')).some(
        (model) => model.kind === 'sequence',
      ),
    ).toBe(true);
  });
  it('preserves Scanner token/line boundaries and print without added newlines', () => {
    const source =
      'import java.util.Scanner; ' +
      program(
        'Scanner scanner = new Scanner(System.in); int n=scanner.nextInt(); String rest=scanner.nextLine(); String line=scanner.nextLine(); System.out.print(n);System.out.print(rest);System.out.println(line);scanner.close();',
      );
    expect(run(source, '42 trailing\r\nnext\n').steps.at(-1)?.stdout).toBe('42 trailingnext\n');
  });
  it.each([
    ['int[] a={1}; System.out.println(a[1]);', 'ArrayIndexOutOfBoundsException'],
    ['int[] a=null; System.out.println(a.length);', 'NullPointerException'],
    ['int zero=0; System.out.println(1/zero);', 'ArithmeticException'],
    ['String text=null; System.out.println(text.length());', 'NullPointerException'],
    ['int[] a=new int[-1];', 'NegativeArraySizeException'],
  ])('reports checked runtime errors for %s', (body, error) => {
    expect(run(program(body)).error).toContain(error);
  });
  it('bounds actual infinite loops using the existing sticky trace cap', () => {
    const trace = run(program('while(true){}'), '', 100);
    expect(trace.truncated).toBe(true);
    expect(trace.steps.length).toBeLessThanOrEqual(100);
  });
  it.each([
    'class Main { static void main(String[] args){ double x=1.5; } }',
    'class Main { static void main(String[] args){ int x=true; } }',
    'class Main { static void main(String[] args){ int x; System.out.println(x); } }',
    'class Main { int field=1; }',
    'class Main { static int f(int n){ if(n>0)return n; } }',
    'class Main { static void main(String[] args){ Runtime.getRuntime().exec("x"); } }',
    'class Main { static void main(String[] args){ String a="x"; System.out.println(a=="x"); } }',
    'class Main { static int f(int n){return n;} static int f(String n){return 1;} }',
    'class Main { static void main(String[] args){ int __java=1; } }',
    'class Main { static void main(String[] args){ int[] a={1}; a[0]++; } }',
    'class Main { static void main(String[] args){ 1+2; } }',
    'class Main { static void main(String[] args){ for(1;true;2){} } }',
    'class Main { static void main(String[] args){ System.out.println(null); } }',
    'class Main { static void main(String[] args){ int const=1; } }',
    'class System { public static void main(String[] args){ System.out.println(1); } }',
    String.raw`class Main { static void main(String[] args){ int n=1; /* \u002a\u002f System.out.println(2); \u002f\u002a */ } }`,
  ])('rejects unsupported or ill-typed input: %s', (source) => {
    expect(() => compileJavaSubset(source, false)).toThrow('Java subset');
  });
  it('uses typed entry signatures and original source for analysis and generated tests', () => {
    const inspection = inspectJavaSubset(javaExample);
    expect(inspection.diagnostic).toBeNull();
    expect(inspection.entries.find((entry) => entry.name === 'sum')).toMatchObject({
      line: 2,
      kinds: ['list'],
      reason: null,
    });
    expect(inspection.entries.find((entry) => entry.name === 'main')?.reason).toContain(
      'measurement',
    );
    expect(analyzeJavaSubset(javaExample).functions.find((fn) => fn.name === 'sum')?.line).toBe(2);
    expect(run(javaTestHarness(javaExample, 'sum', [1, 2, 3])).steps.at(-1)?.stdout).toBe('6\n');
  });
  it('measures real compiled execution without running main or storing snapshots', () => {
    const source = javaExample.replace('System.out.println(sum(values));', 'while(true){}');
    const small = executeJavaSubsetMeasurement({
      code: source,
      entry: 'sum',
      n: 4,
      args: [[4, 3, 2, 1]],
      options: {} as never,
    });
    const large = executeJavaSubsetMeasurement({
      code: source,
      entry: 'sum',
      n: 8,
      args: [[8, 7, 6, 5, 4, 3, 2, 1]],
      options: {} as never,
    });
    expect(small.status).toBe('complete');
    expect(large.status).toBe('complete');
    expect(large.lineEvents).toBeGreaterThan(small.lineEvents!);
    expect(small.auxiliaryPeak).toBe(large.auxiliaryPeak);
    expect(small).not.toHaveProperty('steps');
  });
});
