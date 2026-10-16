import { describe, it, expect } from 'vitest';
import { detectStructures, buildCallTree } from "../src/features/visualizer/public/structures";
import type { Step } from "../src/shared/trace";
const base: Step = {
  index: 0,
  line: 1,
  event: 'line',
  func: '<module>',
  callStack: [],
  globals: {},
  heap: {},
  stdout: '',
};
describe('snapshot structure detection', () => {
  it('recognizes matrices, queue/stack conventions, sets, maps, heaps, and aliases', () => {
    const step: Step = {
      ...base,
      globals: {
        a: { ref: 'a' },
        alias: { ref: 'a' },
        dp: { ref: 'm' },
        queue: { ref: 'q' },
        stack: { ref: 's' },
        minHeap: { ref: 'h' },
        seen: { ref: 'set' },
        lookup: { ref: 'd' },
      },
      heap: {
        a: { type: 'array', items: [1, 2] },
        m: { type: 'list', items: [{ ref: 'a' }] },
        q: { type: 'array', items: [3] },
        s: { type: 'list', items: [2] },
        h: { type: 'array', items: [1, 3, 4] },
        set: { type: 'set', items: [1] },
        d: { type: 'map', entries: [['x', 2]] },
      },
    };
    const results = detectStructures(step);
    expect(results.map((s) => s.kind)).toEqual([
      'array',
      'matrix',
      'queue',
      'stack',
      'heap',
      'set',
      'map',
    ]);
    expect(results[0].names).toEqual(['a', 'alias']);
  });
  it('renders a cyclic linked list without infinite traversal', () => {
    const result = detectStructures({
      ...base,
      globals: { head: { ref: 'a' } },
      heap: {
        a: { type: 'Node', fields: { value: 1, next: { ref: 'b' } } },
        b: { type: 'Node', fields: { value: 2, next: { ref: 'a' } } },
      },
    })[0];
    expect(result.kind).toBe('linked-list');
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes?.[1].links[0].target).toBe('a');
  });
  it('recognizes binary leaves and dictionary-backed nodes', () => {
    const result = detectStructures({
      ...base,
      globals: { root: { ref: 'a' } },
      heap: {
        a: {
          type: 'dict',
          entries: [
            ['value', 5],
            ['left', null],
            ['right', null],
          ],
        },
      },
    })[0];
    expect(result.kind).toBe('binary-tree');
    expect(result.nodes?.[0].label).toBe(5);
  });
  it('recognizes adjacency dictionaries and object neighbors', () => {
    const adjacency = detectStructures({
      ...base,
      globals: { graph: { ref: 'g' } },
      heap: {
        g: { type: 'object', fields: { A: { ref: 'a' }, B: { ref: 'b' } } },
        a: { type: 'array', items: ['B'] },
        b: { type: 'array', items: [] },
      },
    })[0];
    expect(adjacency.kind).toBe('graph');
    expect(adjacency.nodes?.[0].links[0].target).toBe('B');
    const nodes = detectStructures({
      ...base,
      globals: { node: { ref: 'n' } },
      heap: {
        n: { type: 'object', fields: { value: 'A', neighbors: { ref: 'list' } } },
        list: { type: 'array', items: [{ ref: 'n' }] },
      },
    })[0];
    expect(nodes.nodes).toHaveLength(1);
  });
  it('tracks each recursive invocation and its own return', () => {
    const steps: Step[] = [
      { ...base, event: 'call', callStack: [{ id: 'c1', func: 'fib', line: 1, locals: { n: 2 } }] },
      {
        ...base,
        index: 1,
        event: 'call',
        callStack: [
          { id: 'c1', func: 'fib', line: 1, locals: { n: 2 } },
          { id: 'c2', func: 'fib', line: 1, locals: { n: 1 } },
        ],
      },
      {
        ...base,
        index: 2,
        event: 'return',
        callStack: [
          { id: 'c1', func: 'fib', line: 1, locals: { n: 2 } },
          { id: 'c2', func: 'fib', line: 2, locals: { n: 1, '↳ return': 1 } },
        ],
      },
    ];
    expect(buildCallTree(steps)[1]).toMatchObject({
      id: 'c2',
      parent: 'c1',
      start: 1,
      end: 2,
      returned: 1,
    });
  });
});
