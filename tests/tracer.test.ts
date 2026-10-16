import { limits } from "../src/shared/limits";
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { readFileSync } from 'node:fs';
import { examples } from "../src/lib/examples";
import { traceSchema, type TraceResult } from "../src/shared/trace";
let py: PyodideInterface;
beforeAll(async () => {
  py = await loadPyodide();
  py.globals.set('_codelens_limits_json', JSON.stringify(limits));
  py.runPython('import json as _limits_json; _codelens_limits = _limits_json.loads(_codelens_limits_json)');
  py.globals.delete('_codelens_limits_json');
  py.runPython(readFileSync('public/tracer.py', 'utf8'));
});
function run(code: string, stdin = '', maxSteps = 5000): TraceResult {
  py.globals.set('_request_json', JSON.stringify({ code, stdin, maxSteps }));
  return traceSchema.parse(JSON.parse(py.runPython('run_trace(_request_json)')));
}
describe('real Python execution snapshots', () => {
  it('truncates repeated real snapshots at an aggregate serialized-size budget', () => {
    const r = run('values = ["x" * 200] * 80\nfor i in range(1800):\n    values[0] = "x" * 200');
    expect(r.error).toBeNull();
    expect(r.truncated).toBe(true);
    expect(r.steps.length).toBeLessThan(5000);
    expect(new TextEncoder().encode(JSON.stringify(r)).length).toBeLessThanOrEqual(
      16 * 1024 * 1024,
    );
    expect(r.steps.at(-1)?.explanation).toContain('serialized-size');
  });
  it('marks a swallowed private step-limit exception as truncated', () => {
    const r = run(
      'try:\n    while True:\n        pass\nexcept BaseException:\n    swallowed = True\nprint("continued")',
      '',
      100,
    );
    expect(r.truncated).toBe(true);
    expect(r.error).toBeNull();
    expect(r.steps).toHaveLength(100);
    expect(r.steps.at(-1)?.event).toBe('exception');
    expect(r.steps.at(-1)?.explanation).toContain('safety limit');
  });
  it('captures Queue, LifoQueue and PriorityQueue without their synchronization internals', () => {
    const r = run(
      'from queue import Queue, LifoQueue, PriorityQueue\nq = Queue()\nq.put(4)\nq.put(2)\nst = LifoQueue()\nst.put(3)\npq = PriorityQueue()\npq.put(5)\npq.put(1)\nprint(q.qsize())',
    );
    expect(r.error).toBeNull();
    const step = r.steps.at(-1)!;
    for (const name of ['q', 'st', 'pq']) {
      const obj = step.heap[(step.globals[name] as { ref: string }).ref];
      expect(obj.items).toBeDefined();
      expect(obj.fields).toBeUndefined();
    }
    expect(step.heap[(step.globals.q as { ref: string }).ref].items).toEqual([4, 2]);
  });
  it('captures linked fields on slotted node classes', () => {
    const r = run(
      'class Node:\n    __slots__ = ("value", "next")\n    def __init__(self, value, next=None):\n        self.value = value\n        self.next = next\nhead = Node(1, Node(2))\nprint(head.value)',
    );
    const last = r.steps.at(-1)!;
    const obj = last.heap[(last.globals.head as { ref: string }).ref];
    expect(obj.fields?.value).toBe(1);
    expect(obj.fields?.next).toHaveProperty('ref');
  });
  it('records line order and cumulative output', () => {
    const r = run('x = 2\ny = x + 3\nprint(y)');
    expect(r.error).toBeNull();
    expect(r.steps.filter((s) => s.event === 'line').map((s) => s.line)).toEqual([1, 2, 3]);
    expect(r.steps.at(-1)?.stdout).toBe('5\n');
    expect(r.steps.at(-1)?.globals.y).toBe(5);
  });
  it('preserves aliases and captures mutations', () => {
    const r = run('a = [1, 2]\nb = a\na[0] = 9\nprint(b)');
    const last = r.steps.at(-1)!;
    expect(last.globals.a).toEqual(last.globals.b);
    const ref = (last.globals.a as { ref: string }).ref;
    expect(last.heap[ref].items).toEqual([9, 2]);
    const prior = r.steps.find((s) => s.line === 3 && s.event === 'line')!;
    expect(prior.heap[ref].items).toEqual([1, 2]);
  });
  it('records recursion calls, local arguments, and return values', () => {
    const r = run(examples[2].code);
    expect(r.steps.filter((s) => s.event === 'call' && s.func === 'fibonacci')).toHaveLength(15);
    expect(Math.max(...r.steps.map((s) => s.callStack.length))).toBe(6);
    expect(r.steps.at(-1)?.stdout).toBe('Fibonacci: 5\n');
  });
  it('ends an infinite loop with a bounded trace', () => {
    const r = run('while True:\n    pass', '', 100);
    expect(r.truncated).toBe(true);
    expect(r.steps).toHaveLength(100);
    expect(r.steps.at(-1)?.event).toBe('exception');
  });
  it('captures runtime and syntax error lines', () => {
    const runtime = run('x = 1\ny = 1 / 0');
    expect(runtime.error).toContain('ZeroDivisionError');
    expect(runtime.steps.at(-1)?.line).toBe(2);
    expect(runtime.steps.at(-1)?.event).toBe('exception');
    const syntax = run('x =');
    expect(syntax.error).toContain('SyntaxError');
    expect(syntax.steps.at(-1)?.line).toBe(1);
  });
  it('reads supplied stdin and isolates successive runs', () => {
    expect(run('name = input()\nprint(name)', 'Ada\n').steps.at(-1)?.stdout).toBe('Ada\n');
    expect(run('print("fresh")').steps.at(-1)?.globals).toEqual({});
  });
  it('limits large lists and strings', () => {
    const r = run('a = list(range(200))\ns = "x" * 500');
    const last = r.steps.at(-1)!;
    expect(last.heap[(last.globals.a as { ref: string }).ref].items).toHaveLength(80);
    expect(last.heap[(last.globals.a as { ref: string }).ref].truncated).toBe(true);
    expect((last.globals.s as string).length).toBe(201);
  });
  it('blocks the direct browser bridge import', () => {
    expect(run('import js').error).toContain('ImportError');
  });
  it.each(examples)('runs EX.$id $title', (example) => {
    const r = run(example.code);
    expect(r.error).toBeNull();
    expect(r.truncated).toBe(false);
    expect(r.steps.at(-1)?.stdout.length).toBeGreaterThan(0);
    if (example.expected) expect(r.steps.at(-1)?.stdout).toContain(example.expected.python);
  });
});
