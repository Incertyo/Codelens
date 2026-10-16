import { limits } from '../src/shared/limits';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { readFileSync } from 'node:fs';
import { analyzeJavaScript } from '../src/lib/javascript/ast';
import { normalizePythonOutline } from '../src/lib/breakdown';
import { examples } from '../src/lib/examples';
import { exampleCode } from '../src/lib/javascript-examples';
let py: PyodideInterface;
beforeAll(async () => {
  py = await loadPyodide();
  py.globals.set('_codelens_limits_json', JSON.stringify(limits));
  py.runPython('import json as _limits_json; _codelens_limits = _limits_json.loads(_codelens_limits_json)');
  py.globals.delete('_codelens_limits_json');
  py.runPython(readFileSync('public/tracer.py', 'utf8'));
  py.runPython(readFileSync('public/outline.py', 'utf8'));
});
function python(code: string) {
  py.globals.set('_request_json', JSON.stringify({ code }));
  return normalizePythonOutline(JSON.parse(py.runPython('outline_code(_request_json)')));
}
describe('AST structure and offline descriptions', () => {
  it('describes expression-bodied functions and avoids unproved sorting labels', () => {
    expect(analyzeJavaScript('const double = x => x * 2;').functions[0].returns).toEqual(['x * 2']);
    expect(python('double = lambda x: x * 2').functions[0].returns).toEqual(['x * 2']);
    expect(
      analyzeJavaScript(
        'const numbers=[1]; for(let i=0;i<1;i++){for(let j=0;j<1;j++){console.log(numbers[j]);}}',
      ).pattern,
    ).toBe('Nested array traversal');
  });
  it.each(examples)('reads both languages in EX.$id without executing', (example) => {
    for (const data of [
      python(example.code),
      analyzeJavaScript(exampleCode(example, 'javascript')),
    ]) {
      expect(data.diagnostic).toBeNull();
      expect(data.summary).not.toBe('');
      expect(data.outline.length).toBeGreaterThan(0);
    }
  });
  it('extracts nested functions, parameters, returns, and recursion', () => {
    const data = analyzeJavaScript(
      'function outer(a){\n function inner(n){\n if(n===0)return 0;\n return inner(n-1);\n }\n return inner(a);\n}',
    );
    expect(data.functions.map((f) => f.name)).toEqual(['outer', 'inner']);
    expect(data.functions[1]).toMatchObject({ parameters: ['n'], line: 2, recursive: true });
    expect(data.outline.find((n) => n.label.startsWith('inner'))?.depth).toBe(1);
    expect(data.functions[0].returns).toEqual(['inner(a)']);
  });
  it('does not invent loops from comments or strings', () => {
    for (const data of [
      analyzeJavaScript('// for while function\nconst text = "while(true)";'),
      python('# for while def\ntext = "while True"'),
    ])
      expect(data.outline).toEqual([]);
  });
  it('parses Python without running dangerous or invalid runtime statements', () => {
    const data = python('raise RuntimeError("must not run")\nfor i in range(3):\n    print(i)');
    expect(data.diagnostic).toBeNull();
    expect(data.outline[0].kind).toBe('loop');
  });
  it('returns useful syntax diagnostics in both languages', () => {
    expect(analyzeJavaScript('const =').diagnostic).toContain('Unexpected token');
    expect(python('def broken(').diagnostic).toContain('SyntaxError');
  });
});
