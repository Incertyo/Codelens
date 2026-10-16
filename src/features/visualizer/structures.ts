import { limits } from "@/shared/limits";
import { displayValue, type HeapObject, type Step, type Value } from "../../shared/trace";
export type StructureKind =
  | 'array'
  | 'matrix'
  | 'map'
  | 'set'
  | 'stack'
  | 'queue'
  | 'heap'
  | 'linked-list'
  | 'binary-tree'
  | 'graph';
export type StructureNode = {
  id: string;
  label: Value;
  links: { target: string; label: string }[];
};
export type Structure = {
  kind: StructureKind;
  names: string[];
  ref: string;
  object: HeapObject;
  nodes?: StructureNode[];
};
export function objectFields(object: HeapObject | undefined): Record<string, Value> {
  if (!object) return {};
  if (object.fields) return object.fields;
  return Object.fromEntries(
    (object.entries ?? [])
      .filter(([key]) => typeof key === 'string' || typeof key === 'number')
      .map(([key, value]) => [String(key), value]),
  );
}
export const isSequence = (object: HeapObject | undefined) =>
  !!object && ['list', 'array', 'tuple', 'deque'].includes(object.type);
function nodeKind(fields: Record<string, Value>): 'linked-list' | 'binary-tree' | 'graph' | null {
  if ('left' in fields || 'right' in fields) return 'binary-tree';
  if ('neighbors' in fields || 'children' in fields) return 'graph';
  if ('next' in fields) return 'linked-list';
  return null;
}
function linkedNodes(kind: StructureKind, root: string, step: Step): StructureNode[] {
  const todo = [root];
  const seen = new Set<string>();
  const nodes: StructureNode[] = [];

  for (const v of Object.values({ ...step.globals, ...step.callStack.at(-1)?.locals }))
    if (v && typeof v === 'object' && nodeKind(objectFields(step.heap[v.ref])) === kind)
      todo.push(v.ref);
  while (todo.length && nodes.length < limits.graphNodes) {
    const id = todo.shift()!;
    if (seen.has(id) || !step.heap[id]) continue;
    seen.add(id);
    const fields = objectFields(step.heap[id]);
    const links: StructureNode['links'] = [];
    for (const key of kind === 'binary-tree'
      ? ['left', 'right']
      : kind === 'linked-list'
        ? ['next']
        : ['neighbors', 'children']) {
      const v = fields[key];
      if (v && typeof v === 'object') {
        const targets = step.heap[v.ref]?.items ?? [v];
        for (const target of targets)
          if (target && typeof target === 'object' && step.heap[target.ref]) {
            links.push({ target: target.ref, label: key });
            todo.push(target.ref);
          }
      }
    }
    nodes.push({
      id,
      label: fields.value ?? fields.val ?? fields.data ?? fields.name ?? id,
      links,
    });
  }
  return nodes;
}
function adjacencyNodes(object: HeapObject, step: Step): StructureNode[] | null {
  const fields = objectFields(object);
  const entries = Object.entries(fields);
  if (
    !entries.length ||
    !entries.every(([, v]) => v && typeof v === 'object' && isSequence(step.heap[v.ref]))
  )
    return null;
  const nodes = new Map<string, StructureNode>();
  const add = (name: string) => {
    if (!nodes.has(name) && nodes.size < limits.graphNodes) nodes.set(name, { id: name, label: name, links: [] });
  };
  entries.forEach(([name]) => add(name));
  for (const [name, v] of entries) {
    const node = nodes.get(name);
    if (!node) continue;
    for (const neighbor of step.heap[(v as { ref: string }).ref].items ?? []) {
      if (typeof neighbor === 'string' || typeof neighbor === 'number') {
        const target = String(neighbor);
        add(target);
        if (nodes.has(target)) node.links.push({ target, label: '' });
      }
    }
  }
  return [...nodes.values()];
}
export function detectStructures(step: Step): Structure[] {
  const vars = { ...step.globals, ...step.callStack.at(-1)?.locals };
  const aliases = new Map<string, string[]>();
  for (const [name, v] of Object.entries(vars))
    if (v && typeof v === 'object' && step.heap[v.ref])
      aliases.set(v.ref, [...(aliases.get(v.ref) ?? []), name]);
  const result: Structure[] = [];
  const diagramKeys = new Set<string>();
  for (const [ref, names] of aliases) {
    const object = step.heap[ref];
    const fields = objectFields(object);
    const linked = nodeKind(fields);
    const adjacency = object.entries || object.fields ? adjacencyNodes(object, step) : null;
    if (['undefined', 'number', 'bigint'].includes(object.type)) continue;
    let kind: StructureKind;
    let nodes: StructureNode[] | undefined;
    if (linked) {
      kind = linked;
      nodes = linkedNodes(kind, ref, step);
      const key =
        kind +
        ':' +
        nodes
          .map((n) => n.id)
          .sort()
          .join(',');
      if (diagramKeys.has(key)) continue;
      diagramKeys.add(key);
    } else if (adjacency) {
      kind = 'graph';
      nodes = adjacency;
    } else if (isSequence(object)) {
      if (
        object.items?.length &&
        object.items.every((v) => v && typeof v === 'object' && isSequence(step.heap[v.ref]))
      )
        kind = 'matrix';
      else if (names.some((n) => /heap/i.test(n))) kind = 'heap';
      else if (object.type === 'deque' || names.some((n) => /queue/i.test(n))) kind = 'queue';
      else if (names.some((n) => /stack/i.test(n))) kind = 'stack';
      else kind = 'array';
    } else if (['set', 'frozenset'].includes(object.type)) kind = 'set';
    else if (object.entries || object.fields) kind = 'map';
    else continue;
    result.push({ kind, names, ref, object, nodes });
  }
  return result;
}
export type CallNode = {
  id: string;
  parent: string | null;
  func: string;
  args: Record<string, Value>;
  argsLabels?: Record<string, string>;
  start: number;
  end?: number;
  returned?: Value;
  returnedLabel?: string;
};
export function buildCallTree(steps: Step[], language: string = 'python'): CallNode[] {
  const calls = new Map<string, CallNode>();
  for (const step of steps) {
    const frame = step.callStack.at(-1);
    if (!frame?.id) continue;
    if (step.event === 'call')
      calls.set(frame.id, {
        id: frame.id,
        parent: step.callStack.at(-2)?.id ?? null,
        func: frame.func,
        args: { ...frame.locals },
        argsLabels: Object.fromEntries(
          Object.entries(frame.locals).map(([name, v]) => [
            name,
            displayValue(v, step.heap, language),
          ]),
        ),
        start: step.index,
      });
    if (step.event === 'return') {
      const call = calls.get(frame.id);
      if (call) {
        call.end = step.index;
        call.returned = frame.locals['↳ return'];
        call.returnedLabel = displayValue(frame.locals['↳ return'], step.heap, language);
      }
    }
  }
  return [...calls.values()];
}
