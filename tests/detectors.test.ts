import { describe, expect, it } from 'vitest';
import { detectVisualModels, sourceHints, type VisualModel } from "../src/features/visualizer/public/detectors";
import type { HeapObject, Step, Value } from "../src/shared/trace";
const frame = (
  globals: Record<string, Value>,
  heap: Record<string, HeapObject> = {},
  line = 1,
): Step => ({
  index: 0,
  event: 'line',
  line,
  func: '<module>',
  globals,
  heap,
  callStack: [],
  stdout: '',
});
function detect(step: Step, code = '') {
  return detectVisualModels(step, sourceHints(code));
}
type Matching<K, T = VisualModel> = T extends { kind: infer Kind }
  ? K extends Kind
    ? T
    : never
  : never;
function kind<K extends VisualModel['kind']>(models: VisualModel[], k: K) {
  const model = models.find((m) => m.kind === k);
  expect(model, `Expected ${k}`).toBeDefined();
  return model as Matching<K>;
}
const sequence = (name: string, values: Value[]) =>
  frame({ [name]: { ref: 'a' } }, { a: { type: 'list', items: values } });
describe('bounded algorithmic frame detection', () => {
  it('uses language-correct string indices, pop semantics and comma-separated allocation evidence', () => {
    const step = frame({ s: '😀a', i: 1 });
    expect(
      kind(detectVisualModels(step, sourceHints('s[i]', 'python')), 'string_buffer').chars,
    ).toEqual(['😀', 'a']);
    expect(
      kind(detectVisualModels(step, sourceHints('s[i]', 'javascript')), 'string_buffer').chars,
    ).toHaveLength(3);
    expect(
      detectVisualModels(
        sequence('buffer', [1, 2]),
        sourceHints('buffer.push(1); buffer.pop(0);', 'javascript'),
      ).some((m) => m.kind === 'stack'),
    ).toBe(true);
    expect(
      detect(sequence('buffer', [1, 2]), 'buffer.append(1)\nbuffer.pop(1)').some(
        (m) => m.kind === 'stack',
      ),
    ).toBe(false);
    expect(
      detect(sequence('buffer', [1, 2]), 'buffer.append(1)\nbuffer.pop()\nbuffer[0] = 3').some(
        (m) => m.kind === 'stack',
      ),
    ).toBe(false);
    expect(
      sourceHints('let n=16,tree=Array(4*n).fill(0);', 'javascript').segments.has('tree'),
    ).toBe(true);
  });
  it('caps collision entries and detects unnamed explicit empty bucket arrays', () => {
    const step = frame(
      { table: { ref: 'a' } },
      {
        a: { type: 'list', items: [{ ref: 'b' }, { ref: 'c' }] },
        b: { type: 'list', items: [] },
        c: { type: 'list', items: [] },
      },
    );
    expect(kind(detect(step), 'hash_table').capacity).toBe(2);
    step.globals = { buckets: { ref: 'a' } };
    step.heap.b.items = Array(80).fill(1);
    step.heap.c.items = Array(80).fill(2);
    const model = kind(detect(step), 'hash_table');
    expect(model.buckets.flat()).toHaveLength(80);
    expect(model.truncated).toBe(true);
    expect(model.loadFactor).toBe(80);
  });
  it('binds palindrome character cells and both pointer pins', () => {
    const models = detect(
      frame({ s: 'racecar', left: 0, right: 6 }),
      'while left < right:\n    if s[left] != s[right]: break',
    );
    expect(kind(models, 'string_buffer')).toMatchObject({
      name: 's',
      chars: ['r', 'a', 'c', 'e', 'c', 'a', 'r'],
      indices: [0, 1, 2, 3, 4, 5, 6],
      activePointers: { left: 0, right: 6 },
    });
    expect(kind(models, 'sliding_window')).toMatchObject({
      startIndex: 0,
      endIndex: 6,
      windowLength: 7,
    });
  });
  it('detects unnamed append/pop stacks and rejects mixed mutation evidence', () => {
    expect(kind(detect(sequence('buffer', [1]), 'buffer.append(1)'), 'sequence').elements).toEqual([
      1,
    ]);
    expect(kind(detect(sequence('buffer', [1]), 'buffer.pop()'), 'stack').elements).toEqual([1]);
    expect(
      kind(detect(sequence('buffer', [1, 2]), 'buffer.append(1)\nbuffer.pop()'), 'stack').topIndex,
    ).toBe(1);
    expect(
      detect(sequence('buffer', [1, 2]), 'buffer.append(1)\nbuffer.sort()\nbuffer.pop()').some(
        (m) => m.kind === 'stack',
      ),
    ).toBe(false);
    expect(kind(detect(sequence('st', [])), 'stack').topIndex).toBe(-1);
    expect(
      kind(detect(sequence('buffer', [1]), 'buffer.push(1); buffer.pop();'), 'stack').elements,
    ).toEqual([1]);
  });
  it('detects front removals and distinguishes deque and Queue instances', () => {
    expect(kind(detect(sequence('pending', [1, 2]), 'pending.pop(0)'), 'queue')).toMatchObject({
      frontIndex: 0,
      rearIndex: 1,
      isCircular: false,
    });
    expect(kind(detect(sequence('pending', [1]), 'pending.shift()'), 'queue').elements).toEqual([
      1,
    ]);
    expect(
      kind(detect(frame({ pending: { ref: 'a' } }, { a: { type: 'deque', items: [1] } })), 'deque')
        .elements,
    ).toEqual([1]);
    expect(
      kind(
        detect(
          frame(
            { q: { ref: 'a' } },
            {
              a: { type: 'Queue', fields: { queue: { ref: 'b' } } },
              b: { type: 'deque', items: [2] },
            },
          ),
        ),
        'queue',
      ).elements,
    ).toEqual([2]);
  });
  it('detects numeric interval pairs and their active range', () => {
    const model = kind(
      detect(
        frame(
          { meetings: { ref: 'a' }, i: 1 },
          {
            a: { type: 'list', items: [{ ref: 'b' }, { ref: 'c' }] },
            b: { type: 'list', items: [0, 3] },
            c: { type: 'list', items: [2, 4] },
          },
        ),
      ),
      'interval_set',
    );
    expect(model.intervals).toEqual([
      { start: 0, end: 3, id: 'a:0', active: false },
      { start: 2, end: 4, id: 'a:1', active: true },
    ]);
  });
  it('attaches sliding windows to arrays and excludes invalid bounds', () => {
    const step = sequence('nums', [1, 2, 3]);
    step.globals.start = 1;
    step.globals.end = 2;
    expect(kind(detect(step), 'sliding_window')).toMatchObject({
      targetCollectionId: 'a',
      windowLength: 2,
    });
    step.globals.end = 3;
    expect(detect(step).some((m) => m.kind === 'sliding_window')).toBe(false);
  });
  it('detects explicit chained hash bucket arrays and dictionary buckets', () => {
    const step = frame(
      { buckets: { ref: 'a' } },
      {
        a: { type: 'list', items: [{ ref: 'b' }, { ref: 'c' }] },
        b: { type: 'list', items: [{ ref: 'pair' }] },
        c: { type: 'list', items: [] },
        pair: { type: 'tuple', items: ['cat', 3] },
      },
    );
    expect(kind(detect(step), 'hash_table')).toMatchObject({
      capacity: 2,
      loadFactor: 0.5,
      buckets: [[{ key: 'cat', value: 3 }], []],
    });
    step.heap.a = {
      type: 'dict',
      entries: [
        [0, { ref: 'b' }],
        [1, { ref: 'c' }],
      ],
    };
    expect(kind(detect(step), 'hash_table').capacity).toBe(2);
  });
  it('recognizes native sets and their current operation', () => {
    const model = kind(
      detect(
        frame({ seen: { ref: 'a' } }, { a: { type: 'set', items: [1, 2] } }),
        'seen.intersection(other)',
      ),
      'set_pool',
    );
    expect(model.items).toEqual([1, 2]);
    expect(model.operation).toBe('intersection');
  });
  it('uses heapq evidence on arbitrary variable names and class storage', () => {
    const model = kind(
      detect(sequence('best', [1, 3, 2]), 'heapq.heappush(best, 2)'),
      'binary_heap',
    );
    expect(model.heapType).toBe('min');
    expect(model.parentChildMap.get(0)).toEqual({ left: 1, right: 2 });
    const custom = kind(
      detect(
        frame(
          { pq: { ref: 'a' } },
          {
            a: { type: 'MaxHeap', fields: { data: { ref: 'b' } } },
            b: { type: 'array', items: [5, 3, 1] },
          },
        ),
      ),
      'binary_heap',
    );
    expect(custom.heapType).toBe('max');
  });
  it('detects prefix nodes, terminal markers, active paths, and cycles safely', () => {
    const step = frame(
      { root: { ref: 'a' }, node: { ref: 'c' } },
      {
        a: { type: 'dict', entries: [['c', { ref: 'b' }]] },
        b: { type: 'object', fields: { a: { ref: 'c' } } },
        c: { type: 'dict', entries: [['$', true]] },
      },
    );
    const trie = kind(detect(step), 'trie');
    expect(trie.nodes.get('c')?.isTerminal).toBe(true);
    expect(new Set(trie.activePath)).toEqual(new Set(['a', 'b', 'c']));
    step.heap.c.entries!.push(['x', { ref: 'a' }]);
    expect(kind(detect(step), 'trie').nodes.size).toBe(3);
    expect(
      detect(frame({ obj: { ref: 'a' } }, { a: { type: 'object', fields: { a: 1, b: 2 } } })).some(
        (m) => m.kind === 'trie',
      ),
    ).toBe(false);
  });
  it('groups correlated parent/rank arrays with cycle and invalid-index guards', () => {
    const step = frame(
      { parent: { ref: 'p' }, rank: { ref: 'r' } },
      { p: { type: 'list', items: [0, 0, 2, 2] }, r: { type: 'list', items: [1, 0, 1, 0] } },
    );
    const model = kind(detect(step), 'dsu');
    expect([...model.sets]).toEqual([
      [0, [0, 1]],
      [2, [2, 3]],
    ]);
    step.heap.p.items = [1, 0, 8, 3];
    expect(kind(detect(step), 'dsu').invalidParents).toEqual([0, 1, 2]);
  });
  it('detects segment range layouts from allocation evidence and Fenwick jumps', () => {
    const step = sequence('tree', [0, 10, 3, 7, 1, 2, 3, 4]);
    step.globals.n = 4;
    const segment = kind(detect(step, 'tree = [0] * (2 * n)'), 'segment_tree');
    expect(segment.variant).toBe('segment');
    expect(segment.rangeMap.find((r) => r.index === 1)).toMatchObject({ left: 0, right: 3 });
    const fenwick = kind(detect(step, 'i += i & -i\ntree[i] += value'), 'segment_tree');
    expect(fenwick.variant).toBe('fenwick');
    expect(fenwick.rangeMap.find((r) => r.index === 4)).toMatchObject({ left: 1, right: 4 });
    expect(detect(step).some((m) => m.kind === 'segment_tree')).toBe(false);
  });
  it('preserves signed 32/64-bit binary registers and active masks', () => {
    const model = kind(detect(frame({ result: 6, n: 3 }), 'result ^= n'), 'bitmask');
    expect(model.name).toBe('result');
    expect(model.bits).toBe('00000000000000000000000000000110');
    expect(model.activeMasks).toEqual(['n = 3']);
    expect(kind(detect(frame({ x: -1 }), 'x = ~x'), 'bitmask').bits).toBe('1'.repeat(32));
    const large = kind(
      detect(
        frame(
          { x: { ref: 'a' } },
          { a: { type: 'bigint', fields: { value: '9223372036854775807' } } },
        ),
        'x = x << 1',
      ),
      'bitmask',
    );
    expect(large.bitLength).toBe(64);
    expect(large.decimalValue).toBe('9223372036854775807');
    expect(large.shift).toBe('left');
  });
  it('extracts bounded DP cells and prerequisite coordinates from nested-loop writes', () => {
    const code =
      'for i in range(1,3):\n    for j in range(1,3):\n        dp[i][j] = dp[i-1][j] + dp[i][j-1] + dp[i-1][j-1]';
    const model = kind(
      detect(
        frame(
          { dp: { ref: 'a' }, i: 1, j: 1 },
          {
            a: { type: 'list', items: [{ ref: 'r0' }, { ref: 'r1' }] },
            r0: { type: 'list', items: [1, 2] },
            r1: { type: 'list', items: [3, 4] },
          },
          3,
        ),
        code,
      ),
      'dp_matrix',
    );
    expect(model.activeCell).toEqual([1, 1]);
    expect(model.sourceCells).toEqual([
      [0, 1],
      [1, 0],
      [0, 0],
    ]);
    expect(model.cells).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
  it('reads all frames with nearest-scope pointer bindings and deduplicates aliases', () => {
    const step = frame({ nums: { ref: 'a' } }, { a: { type: 'array', items: [1, 2] } });
    step.callStack = [
      { id: 'outer', func: 'outer', line: 1, locals: { s: 'ab', i: 1 } },
      { id: 'inner', func: 'inner', line: 1, locals: { alias: { ref: 'a' }, x: 3 } },
    ];
    const models = detect(step);
    expect(kind(models, 'string_buffer').activePointers.i).toBe(1);
    expect(models.filter((m) => m.kind === 'sequence')).toHaveLength(1);
  });
  it('promotes scalars, keeps unindexed strings and empty sequences, and never invents data', () => {
    expect(kind(detect(frame({ x: 7, ok: true, empty: null })), 'scalar').values).toHaveLength(3);
    expect(kind(detect(frame({ s: 'a' })), 'string_buffer').chars).toEqual(['a']);
    expect(kind(detect(sequence('values', [])), 'sequence').elements).toEqual([]);
    expect(detect(frame({}))).toEqual([]);
  });
  it('ignores operators and mutations inside comments and literals', () => {
    const hints = sourceHints('message = "fake ^= x; arr.pop(0)"\n# heapq.heappush(arr, 1)\nx = 3');
    expect(hints.bitwise.size).toBe(0);
    expect(hints.methods.size).toBe(0);
    expect(hints.heaps.size).toBe(0);
  });
  it('caps string/DP/node views and visible structures without mutating the frame', () => {
    const step = frame({ s: 'x'.repeat(200), left: 0, right: 199 });
    const before = JSON.stringify(step);
    expect(kind(detect(step), 'string_buffer').chars).toHaveLength(80);
    expect(JSON.stringify(step)).toBe(before);
    const many = frame(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`s${i}`, 'abc'])));
    expect(detect(many).filter((m) => m.kind !== 'sliding_window')).toHaveLength(6);
  });
});
