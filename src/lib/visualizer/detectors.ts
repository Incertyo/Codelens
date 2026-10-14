import { detectStructures, isSequence, objectFields, type Structure } from '../structures';
import type { Step, Value } from '../trace';

export const CELL_CAP = 80;
export const VIEW_CAP = 6;
const pointerNames = ['left', 'right', 'i', 'j', 'lo', 'hi', 'mid', 'start', 'end', 'p1', 'p2'];
type Base = { id: string; name: string; truncated?: boolean };
export type WindowModel = Base & {
  kind: 'sliding_window';
  targetCollectionId: string;
  startIndex: number;
  endIndex: number;
  windowLength: number;
};
export type SequenceModel = Base & {
  kind: 'sequence';
  elements: Value[];
  activePointers: Record<string, number>;
  window?: WindowModel;
};
export type StringModel = Base & {
  kind: 'string_buffer';
  chars: string[];
  indices: number[];
  activePointers: Record<string, number>;
  window?: WindowModel;
};
export type StackModel = Base & { kind: 'stack'; elements: Value[]; topIndex: number };
export type QueueModel = Base & {
  kind: 'queue' | 'deque';
  elements: Value[];
  frontIndex: number;
  rearIndex: number;
  isCircular: boolean;
};
export type IntervalModel = Base & {
  kind: 'interval_set';
  intervals: { start: number; end: number; id: string; active: boolean }[];
};
export type HashModel = Base & {
  kind: 'hash_table';
  capacity: number;
  buckets: { key: string; value: Value }[][];
  loadFactor: number;
};
export type SetModel = Base & {
  kind: 'set_pool';
  items: Value[];
  operation?: 'union' | 'intersection' | 'difference';
};
export type HeapModel = Base & {
  kind: 'binary_heap';
  elements: Value[];
  heapType: 'min' | 'max';
  parentChildMap: Map<number, { left?: number; right?: number }>;
};
export type TrieModel = Base & {
  kind: 'trie';
  rootId: string;
  nodes: Map<string, { char: string; isTerminal: boolean; children: Record<string, string> }>;
  activePath: string[];
};
export type DSUModel = Base & {
  kind: 'dsu';
  parent: number[];
  rank?: number[];
  size?: number[];
  sets: Map<number, number[]>;
  invalidParents: number[];
};
export type SegmentModel = Base & {
  kind: 'segment_tree';
  variant: 'segment' | 'fenwick';
  tree: number[];
  rangeMap: { left: number; right: number; val: number; index: number; parent?: number }[];
  activeIndex?: number;
};
export type BitModel = Base & {
  kind: 'bitmask';
  intValue: number;
  decimalValue: string;
  bitLength: 32 | 64;
  bits: string;
  activeMasks: string[];
  shift?: 'left' | 'right';
};
export type DPModel = Base & {
  kind: 'dp_matrix';
  rows: number;
  cols: number;
  cells: Value[][];
  activeCell?: [number, number];
  sourceCells: [number, number][];
};
export type LegacyModel = Base & { kind: 'legacy'; structure: Structure };
export type ScalarModel = Base & { kind: 'scalar'; values: { name: string; value: Value }[] };
export type VisualModel =
  | SequenceModel
  | StringModel
  | StackModel
  | QueueModel
  | IntervalModel
  | HashModel
  | SetModel
  | HeapModel
  | TrieModel
  | DSUModel
  | SegmentModel
  | BitModel
  | DPModel
  | LegacyModel
  | ScalarModel
  | WindowModel;
type Access = { row: string; col: string };
type DPAccess = Access & { line: number; name: string; sources: Access[] };
export type DetectionHints = {
  language: string;
  lines: string[];
  methods: Map<string, Set<string>>;
  indexed: Set<string>;
  heaps: Set<string>;
  bitwise: Set<string>;
  segments: Set<string>;
  fenwick: boolean;
  dp: DPAccess[];
};

export function sourceHints(code = '', language: string = 'python'): DetectionHints {
  const clean = code.replace(
    language === 'python'
      ? /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*)/g
      : /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g,
    (s) => s.replace(/[^\n]/g, ' '),
  );
  const lines = clean.split('\n');
  const methods = new Map<string, Set<string>>();
  const indexed = new Set<string>(),
    heaps = new Set<string>(),
    bitwise = new Set<string>(),
    segments = new Set<string>();
  for (const m of clean.matchAll(
    /\b([A-Za-z_$]\w*)\s*\.\s*(append|pop|push|shift|unshift|popleft|appendleft|sort|splice|extend|insert|reverse)\s*\(([^)]*)\)/g,
  )) {
    const op =
      m[2] === 'pop' && language === 'python'
        ? /^\s*0\s*$/.test(m[3])
          ? 'pop_front'
          : m[3].trim() && m[3].trim() !== '-1'
            ? 'pop_index'
            : 'pop'
        : m[2];
    if (!methods.has(m[1])) methods.set(m[1], new Set());
    methods.get(m[1])!.add(op);
  }
  for (const m of clean.matchAll(/\b([A-Za-z_$]\w*)\s*\[/g)) indexed.add(m[1]);
  for (const m of clean.matchAll(/\b([A-Za-z_$]\w*)\s*\[[^\]\n]+\]\s*(?:[+\-*/]?=)(?!=)/g)) {
    if (!methods.has(m[1])) methods.set(m[1], new Set());
    methods.get(m[1])!.add('indexed_write');
  }
  for (const m of clean.matchAll(
    /\b(?:heappush|heappop|heapify|heapreplace|heappushpop)\s*\(\s*([A-Za-z_$]\w*)/g,
  ))
    heaps.add(m[1]);
  for (const line of lines) {
    if (/(?:<<|>>|(?<![&])&(?![&])|(?<![|])\|(?![|])|\^|~)/.test(line))
      for (const m of line.matchAll(/\b[A-Za-z_$]\w*\b/g)) bitwise.add(m[0]);
    for (const statement of line.split(';')) {
      const alloc = statement.match(
        /\b([A-Za-z_$]\w*)\s*=[^,;\n]*(?:\*\s*[24]\s*\*|\*\s*\(?[24]\s*\*|(?:Array|zeros)\s*\(\s*[24]\s*\*)/,
      );
      if (alloc) segments.add(alloc[1]);
    }
  }
  const dp: DPAccess[] = [];
  const nested = (clean.match(/\b(?:for|while)\b/g)?.length ?? 0) >= 2;
  if (nested)
    lines.forEach((line, index) => {
      const match = line.match(/\b([A-Za-z_$]\w*)\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*=(?!=)(.*)/);
      if (!match) return;
      const sources = [
        ...match[4].matchAll(
          new RegExp(`\\b${match[1]}\\s*\\[([^\\]]+)\\]\\s*\\[([^\\]]+)\\]`, 'g'),
        ),
      ].map((m) => ({ row: m[1], col: m[2] }));
      if (sources.some((s) => /-\s*\d|\b(?:w|weight)\b/.test(s.row + s.col)))
        dp.push({ name: match[1], row: match[2], col: match[3], line: index + 1, sources });
    });
  return {
    language,
    lines,
    methods,
    indexed,
    heaps,
    bitwise,
    segments,
    dp,
    fenwick: /\b(\w+)\s*&\s*-\s*\1\b/.test(clean),
  };
}
const emptyHints = sourceHints();
const refOf = (v: Value | undefined) => (v && typeof v === 'object' ? v.ref : undefined);
function items(v: Value | undefined, step: Step): Value[] | undefined {
  const ref = refOf(v);
  return ref && isSequence(step.heap[ref]) ? step.heap[ref].items : undefined;
}
function hashModel(base: Base, chains: Value[][], step: Step): HashModel {
  let remaining = CELL_CAP;
  const count = chains.reduce((n, c) => n + c.length, 0),
    buckets: HashModel['buckets'] = [];
  for (const chain of chains) {
    const bucket: HashModel['buckets'][number] = [];
    for (const [i, v] of chain.entries()) {
      if (remaining <= 0) break;
      const pair = items(v, step);
      bucket.push({ key: String(pair?.[0] ?? i), value: pair?.[1] ?? v });
      remaining--;
    }
    buckets.push(bucket);
  }
  return {
    ...base,
    kind: 'hash_table',
    capacity: chains.length,
    buckets,
    loadFactor: count / (chains.length || 1),
    truncated: base.truncated || count > CELL_CAP,
  };
}
function pointers(vars: Record<string, Value>, length: number) {
  return Object.fromEntries(
    pointerNames
      .filter(
        (name) =>
          typeof vars[name] === 'number' &&
          Number.isInteger(vars[name]) &&
          Number(vars[name]) >= 0 &&
          Number(vars[name]) <= length,
      )
      .map((name) => [name, Number(vars[name])]),
  );
}
function windowFor(
  id: string,
  name: string,
  pins: Record<string, number>,
  length: number,
): WindowModel | undefined {
  const pair = [
    ['left', 'right'],
    ['start', 'end'],
  ].find(([a, b]) => a in pins && b in pins);
  if (!pair) return;
  const [a, b] = pair,
    startIndex = pins[a],
    endIndex = pins[b];
  if (startIndex > endIndex || endIndex >= length) return;
  return {
    kind: 'sliding_window',
    id: `${id}:window`,
    name,
    targetCollectionId: id,
    startIndex,
    endIndex,
    windowLength: endIndex - startIndex + 1,
  };
}
function integerExpr(expression: string, vars: Record<string, Value>): number | undefined {
  const match = expression
    .trim()
    .match(/^([A-Za-z_$]\w*|-?\d+)(?:\s*([+-])\s*([A-Za-z_$]\w*|\d+))?$/);
  if (!match) return;
  const atom = (s: string) =>
    /^-?\d+$/.test(s) ? Number(s) : typeof vars[s] === 'number' ? Number(vars[s]) : NaN;
  const value = atom(match[1]) + (match[2] ? (match[2] === '+' ? 1 : -1) * atom(match[3]) : 0);
  return Number.isSafeInteger(value) ? value : undefined;
}
function trieFor(rootId: string, step: Step, vars: Record<string, Value>): TrieModel | undefined {
  const rootObject = step.heap[rootId],
    rootFields = objectFields(rootObject);
  if (
    !/trienode/i.test(rootObject?.type ?? '') &&
    !refOf(rootFields.children) &&
    !Object.entries(rootFields).some(([key, v]) => key.length === 1 && key !== '$' && refOf(v))
  )
    return;
  const nodes: TrieModel['nodes'] = new Map(),
    parents = new Map<string, string>();
  const todo = [{ id: rootId, char: '∅' }];
  let terminalEvidence = false,
    classEvidence = false;
  while (todo.length && nodes.size < CELL_CAP) {
    const { id, char } = todo.shift()!;
    if (nodes.has(id) || !step.heap[id]) continue;
    const obj = step.heap[id],
      fields = objectFields(obj);
    classEvidence ||= /trienode/i.test(obj.type);
    const terminal = ['is_end', 'isEnd', 'is_word', 'isWord', 'terminal', 'end', '$'].find(
      (k) => k in fields,
    );
    terminalEvidence ||= !!terminal;
    const childRef = refOf(fields.children);
    const childFields = childRef ? objectFields(step.heap[childRef]) : fields;
    const children: Record<string, string> = {};
    for (const [key, value] of Object.entries(childFields)) {
      const target = refOf(value);
      if (key.length === 1 && key !== '$' && target && step.heap[target]) {
        children[key] = target;
        if (!parents.has(target) && target !== rootId) parents.set(target, id);
        todo.push({ id: target, char: key });
      }
    }
    nodes.set(id, { char, isTerminal: !!terminal && !!fields[terminal], children });
  }
  if (
    !classEvidence &&
    (!terminalEvidence || ![...nodes.values()].some((n) => Object.keys(n.children).length))
  )
    return;
  const active = new Set<string>();
  for (const value of Object.values(vars)) {
    let id = refOf(value);
    const seen = new Set<string>();
    while (id && nodes.has(id) && !seen.has(id)) {
      seen.add(id);
      active.add(id);
      id = parents.get(id);
    }
  }
  return {
    kind: 'trie',
    id: rootId,
    name: '',
    rootId,
    nodes,
    activePath: [...active],
    truncated: todo.length > 0,
  };
}

export function detectVisualModels(step: Step, hints: DetectionHints = emptyHints): VisualModel[] {
  const scopes = step.callStack
    .filter((f) => f.func !== '<module>')
    .slice()
    .reverse()
    .map((f, i) => ({
      key: f.id ?? `frame${i}`,
      vars: { ...step.globals, ...f.locals },
      own: f.locals,
    }));
  scopes.push({ key: 'global', vars: step.globals, own: step.globals });
  const models: VisualModel[] = [],
    claimed = new Set<string>();
  const allVars: Record<string, Value> = {};
  for (const scope of scopes)
    for (const [name, value] of Object.entries(scope.own)) {
      allVars[`${scope.key}.${name}`] = value;
    }
  for (const scope of scopes) {
    const { vars, own } = scope;
    for (const parentName of ['parent', 'p']) {
      const parent = items(own[parentName], step),
        rank = items(vars.rank, step),
        size = items(vars.size, step);
      if (
        !parent?.length ||
        !(rank?.length === parent.length || size?.length === parent.length) ||
        !parent.every((v) => typeof v === 'number' && Number.isInteger(v))
      )
        continue;
      const id = refOf(own[parentName])!;
      if (claimed.has(id)) continue;
      const p = parent as number[],
        sets = new Map<number, number[]>(),
        invalidParents: number[] = [];
      p.forEach((_, i) => {
        let root = i;
        const visited = new Set<number>();
        while (root >= 0 && root < p.length && p[root] !== root && !visited.has(root)) {
          visited.add(root);
          root = p[root];
        }
        if (root < 0 || root >= p.length || p[root] !== root) {
          invalidParents.push(i);
          return;
        }
        sets.set(root, [...(sets.get(root) ?? []), i]);
      });
      models.push({
        kind: 'dsu',
        id,
        name: parentName,
        parent: p,
        rank: rank?.every((v) => typeof v === 'number') ? (rank as number[]) : undefined,
        size: size?.every((v) => typeof v === 'number') ? (size as number[]) : undefined,
        sets,
        invalidParents,
      });
      claimed.add(id);
      if (rank) claimed.add(refOf(vars.rank)!);
      if (size) claimed.add(refOf(vars.size)!);
    }
    for (const [name, value] of Object.entries(own)) {
      if (name === '…' || name.startsWith('↳')) continue;
      const ref = refOf(value),
        id = ref ?? `${scope.key}:${name}`,
        object = ref ? step.heap[ref] : undefined;
      if (claimed.has(id)) continue;
      const base: Base = { id, name, truncated: object?.truncated };
      const numeric =
        typeof value === 'number' && Number.isSafeInteger(value)
          ? String(value)
          : typeof value === 'string' && /^-?\d+$/.test(value)
            ? value
            : object?.type === 'bigint'
              ? String(object.fields?.value)
              : undefined;
      if (numeric && hints.bitwise.has(name)) {
        try {
          const integer = BigInt(numeric),
            bitLength =
              integer > 0xffffffffn || integer < -2147483648n || object?.type === 'bigint'
                ? 64
                : 32;
          const line = hints.lines[step.line - 1] ?? '';
          const masks = [
            ...line.matchAll(/(?:&|\||\^)\s*=?\s*(0x[\da-f]+|0b[01]+|\d+|[A-Za-z_$]\w*)/gi),
          ].map((m) => `${m[1]}${m[1] in vars ? ` = ${String(vars[m[1]])}` : ''}`);
          models.push({
            ...base,
            kind: 'bitmask',
            intValue: Number(integer),
            decimalValue: numeric,
            bitLength,
            bits: BigInt.asUintN(bitLength, integer).toString(2).padStart(bitLength, '0'),
            activeMasks: masks,
            shift: /<</.test(line) ? 'left' : />>/.test(line) ? 'right' : undefined,
          });
          claimed.add(id);
          continue;
        } catch {}
      }
      if (typeof value === 'string') {
        const fullChars = hints.language === 'python' ? Array.from(value) : value.split('');
        const chars = fullChars.slice(0, CELL_CAP),
          pins = pointers(vars, chars.length);
        models.push({
          ...base,
          kind: 'string_buffer',
          chars,
          indices: chars.map((_, i) => i),
          activePointers: value.length >= 2 ? pins : {},
          window: windowFor(id, name, pins, chars.length),
          truncated: fullChars.length > CELL_CAP,
        });
        claimed.add(id);
        continue;
      }
      if (!object) continue;
      const fields = objectFields(object);
      const root = refOf(fields.root) ?? ref;
      const trie = root ? trieFor(root, step, vars) : undefined;
      if (trie) {
        models.push({ ...trie, id, name });
        claimed.add(id);
        for (const node of trie.nodes.keys()) claimed.add(node);
        continue;
      }
      if (['set', 'frozenset'].includes(object.type)) {
        const line = hints.lines[step.line - 1] ?? '';
        models.push({
          ...base,
          kind: 'set_pool',
          items: (object.items ?? []).slice(0, CELL_CAP),
          operation: /intersection/.test(line)
            ? 'intersection'
            : /difference/.test(line)
              ? 'difference'
              : /union/.test(line)
                ? 'union'
                : undefined,
        });
        claimed.add(id);
        continue;
      }
      if (!fields.buckets && (object.entries || object.fields)) {
        const chains = Object.entries(fields).map(([key, v]) => ({ key, chain: items(v, step) }));
        const hasPairs = chains.some((c) => c.chain?.some((v) => items(v, step)?.length === 2));
        const bucketEvidence =
          /bucket|hashtable/i.test(name + object.type) ||
          (hasPairs && chains.every((c) => c.chain?.every((v) => items(v, step)?.length === 2)));
        if (bucketEvidence && chains.length && chains.every((c) => c.chain)) {
          models.push(
            hashModel(
              base,
              chains.map((c) => c.chain!),
              step,
            ),
          );
          claimed.add(id);
          continue;
        }
      }
      const storage =
        ['items', 'heap', 'data', 'queue', 'elements', 'buckets', 'values', 'arr', 'array', '_heap']
          .map((k) => fields[k])
          .find((v) => items(v, step)) ??
        (/Heap|Queue|Deque/i.test(object.type)
          ? Object.values(fields).find((v) => items(v, step))
          : undefined);
      const elements = (
        isSequence(object) || ['Queue', 'LifoQueue', 'PriorityQueue'].includes(object.type)
          ? (object.items ?? items(storage, step))
          : items(storage, step)
      )?.slice(0, CELL_CAP);
      if (!elements) continue;
      const operations = hints.methods.get(name) ?? new Set<string>();
      const heapEvidence =
        hints.heaps.has(name) ||
        /(?:MinHeap|MaxHeap|PriorityQueue)/i.test(object.type) ||
        /heap|priorityqueue/i.test(name);
      if (heapEvidence) {
        const parentChildMap: HeapModel['parentChildMap'] = new Map();
        elements.forEach((_, i) =>
          parentChildMap.set(i, {
            left: 2 * i + 1 < elements.length ? 2 * i + 1 : undefined,
            right: 2 * i + 2 < elements.length ? 2 * i + 2 : undefined,
          }),
        );
        models.push({
          ...base,
          kind: 'binary_heap',
          elements,
          heapType: /max/i.test(object.type + name) ? 'max' : 'min',
          parentChildMap,
        });
        claimed.add(id);
        continue;
      }
      if (
        object.type === 'deque' ||
        (/Queue|Deque/i.test(object.type) && object.type !== 'LifoQueue') ||
        /queue|deque/i.test(name) ||
        ['pop_front', 'shift', 'popleft', 'appendleft', 'unshift'].some((k) => operations.has(k))
      ) {
        const kind =
          object.type === 'deque' ||
          /deque/i.test(name) ||
          operations.has('appendleft') ||
          operations.has('unshift')
            ? 'deque'
            : 'queue';
        models.push({
          ...base,
          kind,
          elements,
          frontIndex: 0,
          rearIndex: elements.length - 1,
          isCircular: /circular/i.test(object.type + name),
        });
        claimed.add(id);
        continue;
      }
      if (
        object.type === 'LifoQueue' ||
        /^(stack|st)$/i.test(name) ||
        (operations.size > 0 &&
          !hints.dp.some((h) => h.name === name) &&
          [...operations].every((k) => ['append', 'push', 'pop'].includes(k)))
      ) {
        models.push({ ...base, kind: 'stack', elements, topIndex: elements.length - 1 });
        claimed.add(id);
        continue;
      }
      if (
        elements.every((v) => typeof v === 'number') &&
        (hints.segments.has(name) || (hints.fenwick && /^(?:tree|bit|fenwick|ft)$/i.test(name)))
      ) {
        const tree = elements as number[],
          variant =
            hints.fenwick && /^(?:tree|bit|fenwick|ft)$/i.test(name) ? 'fenwick' : 'segment';
        const rangeMap: SegmentModel['rangeMap'] = [];
        if (variant === 'fenwick')
          tree.forEach((val, i) => {
            if (i)
              rangeMap.push({
                left: i - (i & -i) + 1,
                right: i,
                val,
                index: i,
                parent: i + (i & -i) < tree.length ? i + (i & -i) : undefined,
              });
          });
        else {
          const n =
            typeof vars.n === 'number'
              ? vars.n
              : typeof vars.N === 'number'
                ? vars.N
                : tree.length / 2;
          const capacity = tree.length;
          if (capacity === 2 * n)
            for (let i = 1; i < capacity; i++) {
              let a = i,
                b = i;
              while (a < n) a *= 2;
              while (b < n) b = b * 2 + 1;
              rangeMap.push({
                index: i,
                left: a - n,
                right: b - n,
                val: tree[i],
                parent: i > 1 ? Math.floor(i / 2) : undefined,
              });
            }
          else {
            const todo = [
              {
                index: 1,
                left: 0,
                right: Math.max(0, n - 1),
                parent: undefined as number | undefined,
              },
            ];
            while (todo.length && rangeMap.length < CELL_CAP) {
              const r = todo.shift()!;
              if (r.index >= tree.length) continue;
              rangeMap.push({ ...r, val: tree[r.index] });
              const mid = Math.floor((r.left + r.right) / 2);
              if (r.left < r.right)
                todo.push(
                  { index: r.index * 2, left: r.left, right: mid, parent: r.index },
                  { index: r.index * 2 + 1, left: mid + 1, right: r.right, parent: r.index },
                );
            }
          }
        }
        models.push({
          ...base,
          kind: 'segment_tree',
          variant,
          tree,
          rangeMap,
          activeIndex: typeof vars.i === 'number' ? vars.i : undefined,
        });
        claimed.add(id);
        continue;
      }
      const rows = elements.map((v) => items(v, step));
      const dpHint =
        hints.dp.find((h) => h.name === name && h.line === step.line) ??
        hints.dp.find((h) => h.name === name);
      if (rows.length && rows.every((r) => r !== undefined) && dpHint) {
        const cells: Value[][] = [];
        let budget = CELL_CAP;
        for (const row of rows) {
          if (budget <= 0) break;
          const visible = row!.slice(0, budget);
          cells.push(visible);
          budget -= visible.length;
        }
        const row = integerExpr(dpHint.row, vars),
          col = integerExpr(dpHint.col, vars);
        const valid = (r: number | undefined, c: number | undefined): r is number =>
          r !== undefined &&
          c !== undefined &&
          r >= 0 &&
          r < cells.length &&
          c >= 0 &&
          c < cells[r].length;
        const activeCell: [number, number] | undefined = valid(row, col) ? [row, col!] : undefined;
        const sourceCells: [number, number][] = [];
        if (activeCell)
          for (const access of dpHint.sources) {
            const r = integerExpr(access.row, vars),
              c = integerExpr(access.col, vars);
            if (valid(r, c)) sourceCells.push([r, c!]);
          }
        models.push({
          ...base,
          kind: 'dp_matrix',
          rows: rows.length,
          cols: rows[0]?.length ?? 0,
          cells,
          activeCell,
          sourceCells,
          truncated:
            cells.length < rows.length || rows.some((r, i) => r!.length !== cells[i]?.length),
        });
        claimed.add(id);
        continue;
      }
      if (
        rows.length &&
        rows.every((r) => r?.length === 2 && r.every((v) => typeof v === 'number')) &&
        !/matrix|grid|dp|bucket|hashtable/i.test(name + object.type) &&
        !hints.dp.some((h) => h.name === name)
      ) {
        const intervals = rows.map((r, i) => ({
          start: Number(r![0]),
          end: Number(r![1]),
          id: `${id}:${i}`,
          active: vars.i === i || refOf(vars.current) === refOf(elements[i]),
        }));
        if (intervals.every((r) => r.start <= r.end)) {
          models.push({ ...base, kind: 'interval_set', intervals });
          claimed.add(id);
          continue;
        }
      }
      if (
        rows.length &&
        rows.every((r) => !!r) &&
        (/bucket|hashtable/i.test(name + object.type) || rows.every((r) => r!.length === 0))
      ) {
        models.push(hashModel(base, rows as Value[][], step));
        claimed.add(id);
        continue;
      }
      if (!rows.some(Boolean)) {
        const pins = pointers(vars, elements.length);
        models.push({
          ...base,
          kind: 'sequence',
          elements,
          activePointers: pins,
          window: windowFor(id, name, pins, elements.length),
        });
        claimed.add(id);
      }
    }
  }

  const legacy = detectStructures({ ...step, globals: allVars, callStack: [] }).filter(
    (s) => !claimed.has(s.ref),
  );
  for (const structure of legacy)
    models.push({
      kind: 'legacy',
      id: structure.ref,
      name: structure.names.map((n) => n.slice(n.indexOf('.') + 1)).join(' / '),
      structure: { ...structure, names: structure.names.map((n) => n.slice(n.indexOf('.') + 1)) },
    });
  const scalarValues: ScalarModel['values'] = [];
  for (const scope of scopes)
    for (const [name, value] of Object.entries(scope.own)) {
      const id = refOf(value) ?? `${scope.key}:${name}`;
      if (
        !claimed.has(id) &&
        !name.startsWith('↳') &&
        (!refOf(value) ||
          ['undefined', 'number', 'bigint'].includes(step.heap[refOf(value)!]?.type))
      )
        scalarValues.push({
          name: `${name}${scope.key === 'global' ? '' : ` (${scope.key})`}`,
          value,
        });
    }
  const primary = models.filter((m) => m.kind !== 'sliding_window');

  primary.sort(
    (a, b) =>
      Number(['sequence', 'string_buffer', 'legacy'].includes(a.kind)) -
      Number(['sequence', 'string_buffer', 'legacy'].includes(b.kind)),
  );
  if (!primary.length && scalarValues.length)
    primary.push({
      kind: 'scalar',
      id: 'scalars',
      name: 'Scalar State Monitor',
      values: scalarValues.slice(0, CELL_CAP),
    });
  const visible = primary.slice(0, VIEW_CAP);
  return [...visible, ...visible.flatMap((m) => ('window' in m && m.window ? [m.window] : []))];
}
