import { describe, it, expect } from 'vitest';
import { instrumentJavaScript } from '../src/lib/javascript/instrument';
import { JavaScriptTrace } from '../src/lib/javascript/runtime';
import { traceSchema } from '../src/lib/trace';
import { examples } from '../src/lib/examples';
import { exampleCode } from '../src/lib/javascript-examples';
import { detectVisualModels, sourceHints } from '../src/lib/visualizer/detectors';
function run(code: string, maxSteps = 5000) {
  const engine = new JavaScriptTrace(maxSteps);
  try {
    const instrumented = instrumentJavaScript(code);
    new Function(instrumented.hookName, 'console', `"use strict";${instrumented.code}`)(engine, {
      log: engine.output,
    });
    return traceSchema.parse(engine.result());
  } catch (error) {
    return traceSchema.parse(engine.result(error));
  }
}
describe('JavaScript instrumented execution', () => {
  it('truncates a real trace at an aggregate serialized-size budget', () => {
    const r = run(
      'const values=Array.from({length:80},()=>"x".repeat(200));\nfor(let i=0;i<2000;i++){values[0]="x".repeat(200);}',
    );
    expect(r.error).toBeNull();
    expect(r.truncated).toBe(true);
    expect(r.steps.length).toBeLessThan(5000);
    expect(new TextEncoder().encode(JSON.stringify(r)).length).toBeLessThanOrEqual(
      16 * 1024 * 1024,
    );
    expect(r.steps.at(-1)?.explanation).toContain('serialized-size');
  });
  it('composes real serialized BigInt XOR values into a BitmaskView model', () => {
    const invalidConst = 'const mask = 123n; mask ^= 7n;';
    const failed = run(invalidConst);
    expect(failed.error).toContain('TypeError');
    expect(
      detectVisualModels(failed.steps.at(-1)!, sourceHints(invalidConst, 'javascript')).find(
        (model) => model.kind === 'bitmask',
      ),
    ).toMatchObject({ kind: 'bitmask', decimalValue: '123', bitLength: 64 });
    const code = 'let mask = 123n; mask ^= 7n;';
    const r = run(code);
    expect(r.error).toBeNull();
    expect(
      detectVisualModels(r.steps.at(-1)!, sourceHints(code, 'javascript')).find(
        (model) => model.kind === 'bitmask',
      ),
    ).toMatchObject({
      kind: 'bitmask',
      name: 'mask',
      decimalValue: '124',
      bitLength: 64,
      bits: '1111100'.padStart(64, '0'),
    });
  });
  it('keeps append-only output arrays generic until removal evidence exists', () => {
    const code = 'const values=[]; values.push(1); values.push(2);';
    const r = run(code);
    expect(
      detectVisualModels(r.steps.at(-1)!, sourceHints(code, 'javascript')).find(
        (model) => model.name === 'values',
      )?.kind,
    ).toBe('sequence');
  });
  it('instruments callbacks nested in default parameter patterns', () => {
    const r = run('function f(g=()=>{return 7;}){return g();}\nconsole.log(f());');
    expect(r.error).toBeNull();
    expect(r.steps.filter((s) => s.event === 'call')).toHaveLength(3);
    expect(
      r.steps.filter((s) => s.event === 'return' && s.callStack.at(-1)?.locals['↳ return'] === 7),
    ).toHaveLength(2);
    expect(r.steps.at(-1)?.stdout).toBe('7\n');
  });
  it('reports instances and explicit object returns for plain function constructors', () => {
    for (const body of ['this.value=value;', 'this.value=value; return 4;', 'return {value};']) {
      const r = run(`function Node(value){${body}}\nconst node=new Node(7);`);
      expect(r.error).toBeNull();
      expect(
        r.steps.find((s) => s.event === 'return' && s.func === 'Node')?.callStack.at(-1)?.locals[
          '↳ return'
        ],
      ).toEqual(r.steps.at(-1)?.globals.node);
    }
  });
  it('preserves own prototype-shaped fields and variable names through schema validation', () => {
    const r = run(
      'const __proto__=7;\nconst constructor=8;\nconst obj=JSON.parse(\'{"__proto__":{"value":1},"constructor":2,"toString":3,"ok":4}\');',
    );
    expect(r.error).toBeNull();
    const last = r.steps.at(-1)!;
    expect(Object.hasOwn(last.globals, '__proto__')).toBe(true);
    expect(last.globals.__proto__).toBe(7);
    const fields = last.heap[(last.globals.obj as { ref: string }).ref].fields!;
    expect(Object.keys(fields).sort()).toEqual(['__proto__', 'constructor', 'ok', 'toString']);
    expect(Object.hasOwn(fields, '__proto__')).toBe(true);
  });
  it('restores the caller source line after a returned function', () => {
    const r = run('function f(){ return null; }\nconst value = f().x;');
    expect(r.error).toContain('TypeError');
    expect(r.steps.at(-1)?.line).toBe(2);
  });
  it('attributes output to the caller statement after nested calls', () => {
    const r = run('function f(){ return 3; }\nconsole.log(f());');
    expect(r.steps.find((s) => s.event === 'output')?.line).toBe(2);
  });
  it('retains the exception origin through finally cleanup', () => {
    const r = run(
      'function f(){\n try {\n  const x = null;\n  return x.value;\n } finally {\n  console.log("cleanup");\n }\n}\nf();',
    );
    expect(r.error).toContain('TypeError');
    expect(r.steps.at(-1)?.line).toBe(4);
    expect(r.steps.at(-1)?.stdout).toBe('cleanup\n');
  });
  it('represents a thrown undefined value as an exception', () => {
    const r = run('throw undefined;');
    expect(r.error).toBe('Thrown: undefined');
    expect(r.steps.at(-1)?.event).toBe('exception');
  });
  it('preserves primitive kinds and constructor results', () => {
    const r = run(
      'class Node {constructor(value){this.value=value;}}\nconst node=new Node(3);\nlet empty;\nconst large=123n;\nconst infinite=Infinity;',
    );
    const last = r.steps.at(-1)!;
    expect(last.heap[(last.globals.empty as { ref: string }).ref].type).toBe('undefined');
    expect(last.heap[(last.globals.large as { ref: string }).ref].type).toBe('bigint');
    expect(last.heap[(last.globals.infinite as { ref: string }).ref].fields?.value).toBe(
      'Infinity',
    );
    expect(
      r.steps.find((s) => s.event === 'return' && s.func === 'constructor')?.callStack.at(-1)
        ?.locals['↳ return'],
    ).toEqual(last.globals.node);
  });
  it.each(examples)('runs EX.$id $title', (example) => {
    const r = run(exampleCode(example, 'javascript'));
    expect(r.error).toBeNull();
    expect(r.truncated).toBe(false);
    expect(r.steps.at(-1)?.stdout).not.toBe('');
    if (example.expected) expect(r.steps.at(-1)?.stdout).toContain(example.expected.javascript);
  });
  it('records source lines, globals, and cumulative output', () => {
    const r = run('let x = 2;\nx += 3;\nconsole.log(x);');
    expect(r.error).toBeNull();
    expect(r.steps.filter((s) => s.event === 'line').map((s) => s.line)).toEqual([1, 2, 3]);
    expect(r.steps.at(-1)?.globals.x).toBe(5);
    expect(r.steps.at(-1)?.stdout).toBe('5\n');
  });
  it('preserves aliases across mutations, cycles, Map and Set', () => {
    const r = run(
      'const a = [1, 2];\nconst b = a;\na[0] = 9;\nconst node = {value: 3};\nnode.next = node;\nconst map = new Map([["x", a]]);\nconst set = new Set([1, 2]);',
    );
    const last = r.steps.at(-1)!;
    expect(last.globals.a).toEqual(last.globals.b);
    expect(last.heap[(last.globals.a as { ref: string }).ref].items).toEqual([9, 2]);
    expect(last.heap[(last.globals.node as { ref: string }).ref].fields?.next).toEqual(
      last.globals.node,
    );
    expect(Object.values(last.heap).map((v) => v.type)).toContain('map');
    expect(Object.values(last.heap).map((v) => v.type)).toContain('set');
  });
  it('captures actual recursion arguments, return values, and stable call ids', () => {
    const r = run(
      'function fibonacci(n) {\n if(n<=1)return n;\n return fibonacci(n-1)+fibonacci(n-2);\n}\nconsole.log(fibonacci(5));',
    );
    const calls = r.steps.filter((s) => s.event === 'call' && s.func === 'fibonacci');
    expect(calls).toHaveLength(15);
    expect(new Set(calls.map((s) => s.callStack.at(-1)?.id)).size).toBe(15);
    expect(r.steps.at(-1)?.stdout).toBe('5\n');
    expect(
      r.steps.find((s) => s.event === 'return' && s.callStack.at(-1)?.locals['↳ return'] === 5),
    ).toBeTruthy();
  });
  it('bounds infinite loops, including empty for loops', () => {
    for (const code of ['while (true) {}', 'for (;;) ;']) {
      const r = run(code, 100);
      expect(r.truncated).toBe(true);
      expect(r.steps).toHaveLength(100);
      expect(r.steps.at(-1)?.event).toBe('exception');
    }
  });
  it('reports errors at the original source line and rejects unsupported async syntax', () => {
    const r = run('function f() {\n const a = null;\n return a.value;\n}\nf();');
    expect(r.error).toContain('TypeError');
    expect(r.steps.at(-1)?.line).toBe(3);
    expect(r.steps.at(-1)?.callStack.at(-1)?.func).toBe('f');
    expect(run('async function f(){ await fetch("/"); }').error).toContain('synchronous');
  });
  it('keeps labeled continue and destructuring semantics', () => {
    const r = run(
      'let total = 0;\nouter: for (let i=0;i<3;i++){\n const [a,b]=[i,1];\n if(a===1)continue outer;\n total+=a+b;\n}\nconsole.log(total);',
    );
    expect(r.error).toBeNull();
    expect(r.steps.at(-1)?.stdout).toBe('4\n');
  });
});
