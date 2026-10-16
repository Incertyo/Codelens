import { limits } from "../src/shared/limits";
import { describe, it, expect, beforeAll } from 'vitest';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { readFileSync } from 'node:fs';
import { normalizePythonOutline } from "../src/shared/breakdown";
import { examples } from "../src/lib/examples";
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
    expect(python('double = lambda x: x * 2').functions[0].returns).toEqual(['x * 2']);
  });
  it.each(examples)('reads Python in EX.$id without executing', (example) => {
    const data = python(example.code);
    expect(data.diagnostic).toBeNull();
    expect(data.summary).not.toBe('');
    expect(data.outline.length).toBeGreaterThan(0);
  });
  it('extracts nested functions, parameters, returns, and recursion', () => {
    const data = python(
      'def outer(a):\n    def inner(n):\n        if n == 0:\n            return 0\n        return inner(n - 1)\n    return inner(a)',
    );
    expect(data.functions.map((f) => f.name)).toEqual(['outer', 'inner']);
    expect(data.functions[1]).toMatchObject({ parameters: ['n'], line: 2, recursive: true });
    expect(data.outline.find((n) => n.label.startsWith('inner'))?.depth).toBe(1);
    expect(data.functions[0].returns).toEqual(['inner(a)']);
  });
  it('does not invent loops from comments or strings', () => {
    const data = python('# for while def\ntext = "while True"');
    expect(data.outline).toEqual([]);
  });
  it('parses Python without running dangerous or invalid runtime statements', () => {
    const data = python('raise RuntimeError("must not run")\nfor i in range(3):\n    print(i)');
    expect(data.diagnostic).toBeNull();
    expect(data.outline[0].kind).toBe('loop');
  });
  it('returns useful syntax diagnostics', () => {
    expect(python('def broken(').diagnostic).toContain('SyntaxError');
  });
});
