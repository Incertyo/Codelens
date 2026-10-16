import { z } from 'zod';
export type Language = 'python' | 'javascript' | 'cpp' | 'java';
export const outlineNodeSchema = z.object({
  id: z.string(),
  kind: z.enum(['function', 'loop', 'branch', 'class', 'try']),
  label: z.string(),
  line: z.number().int().positive(),
  endLine: z.number().int().positive(),
  depth: z.number().int().nonnegative(),
});
export const functionSchema = z.object({
  name: z.string(),
  line: z.number().int().positive(),
  endLine: z.number().int().positive(),
  parameters: z.array(z.string()),
  returns: z.array(z.string()),
  recursive: z.boolean(),
  purpose: z.string(),
});
export const annotationSchema = z.object({
  line: z.number().int().positive(),
  text: z.string(),
  code: z.string(),
});
export const breakdownSchema = z.object({
  summary: z.string(),
  pattern: z.string(),
  functions: z.array(functionSchema),
  outline: z.array(outlineNodeSchema),
  annotations: z.array(annotationSchema),
  concepts: z.array(z.string()),
  diagnostic: z.string().nullable(),
});
export type BreakdownData = z.infer<typeof breakdownSchema>;
export const CONCEPTS: Record<string, string> = {
  Iteration: 'Repeat a block of statements while advancing through data.',
  Branching: 'Choose the next path based on a condition.',
  Recursion: 'A function solves a problem by calling itself on smaller subproblems.',
  Arrays: 'Store values in an ordered sequence addressed by index.',
  Hashing: 'Look up keys or membership using a dictionary, map, or set.',
  Sorting: 'Rearrange values into a defined order.',
  'Two pointers': 'Move two indexes through the same sequence to narrow the search.',
  'Dynamic programming': 'Reuse solutions to smaller subproblems in a table.',
  Queues: 'Process values in first-in, first-out order.',
  Stacks: 'Process values in last-in, first-out order.',
  Graphs: 'Connect nodes through edges and traverse their neighbors.',
  'Linked structures': 'Connect objects using references such as next, left, or right.',
  Functions: 'Name a reusable sequence of operations with parameters and a return value.',
};
export type StaticFacts = {
  names: string[];
  loops: number;
  maxLoopDepth: number;
  branches: number;
  arrays: boolean;
  hashing: boolean;
  linked: boolean;
  recursive: boolean;
  sorting?: boolean;
};
export const pythonOutlineSchema = z.object({
  facts: z.object({
    names: z.array(z.string()),
    loops: z.number(),
    maxLoopDepth: z.number(),
    branches: z.number(),
    arrays: z.boolean(),
    hashing: z.boolean(),
    linked: z.boolean(),
    recursive: z.boolean(),
    sorting: z.boolean().optional(),
  }),
  functions: z.array(functionSchema),
  outline: z.array(outlineNodeSchema),
  annotations: z.array(annotationSchema),
  diagnostic: z.string().nullable(),
});
export function normalizePythonOutline(data: unknown): BreakdownData {
  const full = breakdownSchema.safeParse(data);
  if (full.success) return full.data;
  const parsed = pythonOutlineSchema.parse(data);
  const summary = describeProgram(parsed.facts);
  if (parsed.functions.length) summary.concepts.push('Functions');
  return {
    ...summary,
    functions: parsed.functions,
    outline: parsed.outline,
    annotations: parsed.annotations,
    diagnostic: parsed.diagnostic,
  };
}
export function describeProgram(f: StaticFacts): {
  pattern: string;
  summary: string;
  concepts: string[];
} {
  const names = new Set(f.names);
  const has = (...values: string[]) => values.some((v) => names.has(v));
  let pattern = 'Straight-line program';
  let description =
    'Executes statements in order, updating values and producing any requested output.';
  if (f.linked && f.loops && has('prev', 'previous') && has('current', 'curr')) {
    pattern = 'Linked list reversal';
    description =
      'Walks a chain of nodes and reverses each next reference while keeping track of the remaining chain.';
  } else if (has('dp', 'memo', 'table') && f.maxLoopDepth >= 2) {
    pattern = 'Dynamic programming';
    description =
      'Builds a table of smaller subproblem results and reuses those values to compute a larger solution.';
  } else if (has('lo', 'low') && has('hi', 'high') && has('mid')) {
    pattern = 'Binary search';
    description =
      'Repeatedly narrows an ordered search interval around a midpoint until it finds the target or exhausts the interval.';
  } else if (has('queue') && has('graph', 'neighbors', 'adjacency')) {
    pattern = 'Breadth-first search';
    description =
      'Visits graph nodes through a queue and tracks which nodes have already been reached.';
  } else if (f.recursive && has('fibonacci', 'fib')) {
    pattern = 'Recursive Fibonacci';
    description =
      'Computes a Fibonacci value by recursively combining two smaller calls until a base case is reached.';
  } else if (f.maxLoopDepth >= 2 && f.arrays) {
    pattern = 'Nested array traversal';
    description =
      'Uses nested loops to inspect or update array values. Neighbor comparisons and swaps can implement bubble sort.';
    if (f.sorting) {
      pattern = 'Bubble-sort pattern';
      description = 'Uses nested loops to compare neighbors and swap values into order.';
    }
  } else if (f.loops && has('i', 'left') && has('j', 'right')) {
    pattern = 'Two pointers';
    description =
      'Moves two indexes through a sequence, using comparisons to decide which index advances next.';
  } else if (f.recursive) {
    pattern = 'Recursion';
    description =
      'Calls a function recursively and combines or returns smaller subproblem results.';
  } else if (f.loops) {
    pattern = 'Iterative traversal';
    description = 'Repeats a block of operations over values or until a condition changes.';
  }
  const concepts = [
    f.loops ? 'Iteration' : null,
    f.branches ? 'Branching' : null,
    f.arrays ? 'Arrays' : null,
    f.hashing ? 'Hashing' : null,
    f.recursive ? 'Recursion' : null,
    f.linked ? 'Linked structures' : null,
    has('queue') ? 'Queues' : null,
    has('stack') ? 'Stacks' : null,
    has('graph', 'neighbors') ? 'Graphs' : null,
    pattern === 'Two pointers' ? 'Two pointers' : null,
    pattern === 'Dynamic programming' ? 'Dynamic programming' : null,
    pattern === 'Bubble-sort pattern' ? 'Sorting' : null,
  ].filter((v): v is string => v !== null);
  return {
    pattern,
    summary:
      description +
      ' This is an AST-based reading; use the execution trace to verify the behavior for your input.',
    concepts,
  };
}
export const enrichmentSchema = z
  .object({
    summary: z.string().min(1).max(1200),
    pattern: z.string().min(1).max(100),
    functions: z
      .array(
        z
          .object({
            name: z.string().min(1).max(100),
            line: z.number().int().positive().max(30000),
            purpose: z.string().max(600),
            returns: z.string().max(500),
          })
          .strict(),
      )
      .max(40),
    annotations: z
      .array(
        z
          .object({ line: z.number().int().positive().max(30000), text: z.string().max(500) })
          .strict(),
      )
      .max(100),
    stepNotes: z
      .array(
        z
          .object({ index: z.number().int().nonnegative().max(4999), text: z.string().max(400) })
          .strict(),
      )
      .max(32),
    timeComplexity: z.string().max(50).optional(),
    spaceComplexity: z.string().max(50).optional(),
    suggestions: z
      .array(
        z
          .object({
            type: z.enum(['optimization', 'bug', 'edge-case', 'style']),
            message: z.string().max(600),
            line: z.number().int().positive().max(30000).optional(),
          })
          .strict(),
      )
      .max(10)
      .optional(),
    visualMapping: z
      .object({
        primaryStructure: z.string().max(50).optional(),
        highlights: z
          .array(
            z
              .object({
                step: z.number().int().nonnegative().max(4999),
                variable: z.string().max(100),
                reason: z.string().max(200),
              })
              .strict(),
          )
          .max(20)
          .optional(),
        keyOperations: z
          .array(
            z
              .object({
                line: z.number().int().positive().max(30000),
                type: z.string().max(50),
                description: z.string().max(200),
              })
              .strict(),
          )
          .max(20)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type Enrichment = z.infer<typeof enrichmentSchema>;
