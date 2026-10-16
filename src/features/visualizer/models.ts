import type { Structure } from './structures';
import type { Value } from '@/shared/trace';
export type Base = { id: string; name: string; truncated?: boolean };
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
export type Access = { row: string; col: string };
export type DPAccess = Access & { line: number; name: string; sources: Access[] };
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
  primaryStructure?: string;
};

