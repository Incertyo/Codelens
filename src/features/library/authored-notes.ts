import { algorithms } from "../../lib/algorithm-catalog";
import { presetAnalyses } from "./preset-analyses";
import type { Enrichment } from "../../shared/breakdown";

export type EnrichedAlgorithmData = {
  algorithmId: string;
  name: string;
  timeComplexity: string;
  spaceComplexity: string;
  pattern: string;
  summary: string;
  suggestions: NonNullable<Enrichment['suggestions']>;
  visualMapping: NonNullable<Enrichment['visualMapping']>;
};

// Algorithmic specific overrides for individual algorithms
const algorithmOverrides: Record<
  string,
  Partial<{
    timeComplexity: string;
    spaceComplexity: string;
    pattern: string;
    summary: string;
    primaryStructure: string;
  }>
> = {
  'arrays-sequences/two-pointers/two-pointer-pair-sum': {
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    pattern: 'Two pointers (converging)',
    summary: 'Traverses inward from left and right boundaries of a sorted list to find a target sum in linear time.',
    primaryStructure: 'numbers',
  },
  'arrays-sequences/two-pointers/three-sum': {
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    pattern: 'Sorted two pointers with fixed pivot',
    summary: 'Sorts the array and iterates over each element as a fixed anchor, using two pointers on the remaining suffix to identify zero-sum triplets without duplicates.',
    primaryStructure: 'numbers',
  },
  'arrays-sequences/two-pointers/container-with-most-water': {
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    pattern: 'Greedy two pointers',
    summary: 'Maintains left and right wall pointers, calculating container capacity and moving the shorter vertical line inward to seek taller boundaries.',
    primaryStructure: 'heights',
  },
  'arrays-sequences/two-pointers/dutch-national-flag': {
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    pattern: 'Three-way partitioning',
    summary: 'Partitions an array into three discrete segments (e.g. 0s, 1s, and 2s) in a single pass using low, mid, and high pointers.',
    primaryStructure: 'array',
  },
  'arrays-sequences/two-pointers/sorted-deduplication': {
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    pattern: 'Fast and slow pointers',
    summary: 'Removes duplicates in-place from a sorted array by advancing a read pointer and overwriting only unique values at the slow write pointer.',
    primaryStructure: 'numbers',
  },
  'arrays-sequences/two-pointers/move-zeroes': {
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    pattern: 'In-place write pointer',
    summary: 'Shifts all non-zero elements to the front of the array while maintaining their original relative order, then fills the remaining positions with zeros.',
    primaryStructure: 'numbers',
  },
  'arrays-sequences/two-pointers/partition-around-a-pivot': {
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    pattern: 'Lomuto / Hoare partition',
    summary: 'Reorganizes array elements so that values less than the pivot precede values greater than or equal to the pivot.',
    primaryStructure: 'numbers',
  },
  'arrays-sequences/sliding-windows/fixed-size-window-sum': {
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    pattern: 'Fixed sliding window',
    summary: 'Computes sums across all contiguous subarrays of length k in linear time by adding the arriving element and discarding the departing one.',
    primaryStructure: 'window',
  },
  'arrays-sequences/sliding-windows/longest-unique-substring': {
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(min(n, m))',
    pattern: 'Variable sliding window with hash map',
    summary: 'Expands a dynamic right boundary while maintaining a character-to-index map, skipping the left boundary past repeating characters.',
    primaryStructure: 'seenMap',
  },
  'arrays-sequences/sliding-windows/minimum-window-substring': {
    timeComplexity: 'O(n + m)',
    spaceComplexity: 'O(Σ)',
    pattern: 'Two-pointer window with frequency counts',
    summary: 'Finds the shortest substring containing all characters of a target alphabet by expanding until valid, then contracting from the left to minimize span.',
    primaryStructure: 'charCounts',
  },
  'sorting/quadratic-sorts/bubble-sort': {
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    pattern: 'Comparison bubble sort',
    summary: 'Repeatedly sweeps adjacent elements, swapping any inverted pairs until the largest unsorted value bubbles to its final terminal position.',
    primaryStructure: 'numbers',
  },
  'sorting/quadratic-sorts/selection-sort': {
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    pattern: 'Extremum selection',
    summary: 'Divides the collection into sorted and unsorted regions, repeatedly scanning the unsorted region for the minimum element and placing it at the front.',
    primaryStructure: 'numbers',
  },
  'sorting/quadratic-sorts/insertion-sort': {
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    pattern: 'Incremental insertion',
    summary: 'Considers elements one at a time, sliding each into its correct ordered location among earlier inspected items.',
    primaryStructure: 'numbers',
  },
  'sorting/divide-conquer-sorts/merge-sort': {
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(n)',
    pattern: 'Divide and conquer',
    summary: 'Recursively divides the array into halves until singletons remain, then merges sorted sibling halves into a combined sorted sequence.',
    primaryStructure: 'recursionTree',
  },
  'sorting/divide-conquer-sorts/quicksort-lomuto': {
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(log n)',
    pattern: 'Divide and conquer partitioning',
    summary: 'Selects the last element as pivot, partitions smaller values to the left and larger to the right, and recursively sorts both partitions.',
    primaryStructure: 'partitions',
  },
  'sorting/divide-conquer-sorts/quicksort-hoare': {
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(log n)',
    pattern: 'Bidirectional partitioning',
    summary: 'Uses two pointers moving inward to partition around a pivot with fewer swaps on average than Lomuto partitioning.',
    primaryStructure: 'partitions',
  },
  'sorting/divide-conquer-sorts/heap-sort': {
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(1)',
    pattern: 'Heapify and extract-max',
    summary: 'Builds a max-heap in-place in linear time, then repeatedly extracts the root to the back of the array and sifts down.',
    primaryStructure: 'heapArray',
  },
  'searching/binary-search-variants/binary-search': {
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    pattern: 'Logarithmic interval halving',
    summary: 'Locates a target value in a sorted sequence by comparing against the midpoint and halving the viable search range on every iteration.',
    primaryStructure: 'sortedNumbers',
  },
  'searching/binary-search-variants/lower-bound': {
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    pattern: 'Binary search predicate boundary',
    summary: 'Finds the first index where elements are greater than or equal to the query value using half-open intervals.',
    primaryStructure: 'sortedNumbers',
  },
  'searching/binary-search-variants/upper-bound': {
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    pattern: 'Binary search predicate boundary',
    summary: 'Finds the first index where elements strictly exceed the query value in a sorted array.',
    primaryStructure: 'sortedNumbers',
  },
  'graphs/shortest-paths/dijkstra-s-algorithm': {
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    pattern: 'Greedy priority queue relaxation',
    summary: 'Finds shortest paths from a source vertex in non-negatively weighted graphs by greedily settling the closest tentative vertex.',
    primaryStructure: 'distances',
  },
  'graphs/shortest-paths/bellman-ford-algorithm': {
    timeComplexity: 'O(V · E)',
    spaceComplexity: 'O(V)',
    pattern: 'Dynamic edge relaxation',
    summary: 'Relaxes all edges V-1 times to find shortest paths in graphs with negative weights and detects negative weight cycles.',
    primaryStructure: 'distances',
  },
  'graphs/shortest-paths/floyd-warshall-algorithm': {
    timeComplexity: 'O(V³)',
    spaceComplexity: 'O(V²)',
    pattern: 'All-pairs dynamic programming',
    summary: 'Computes shortest paths between every pair of vertices by considering each vertex as an intermediate transit candidate in turn.',
    primaryStructure: 'distanceMatrix',
  },
  'graphs/graph-traversals/breadth-first-search': {
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    pattern: 'Queue-based level-order search',
    summary: 'Explores vertices outward in concentric distance rings using a FIFO queue, guaranteeing shortest hop counts on unweighted graphs.',
    primaryStructure: 'visited',
  },
  'graphs/graph-traversals/depth-first-search': {
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    pattern: 'Recursive / Stack backtracking search',
    summary: 'Explores deeply along each branch until dead ends or cycles are hit before backtracking to explore remaining alternatives.',
    primaryStructure: 'visited',
  },
  'graphs/minimum-spanning-trees/kruskal-s-algorithm': {
    timeComplexity: 'O(E log E)',
    spaceComplexity: 'O(V)',
    pattern: 'Greedy edge sorting with Union-Find',
    summary: 'Builds a minimum spanning forest by considering edges in ascending order of weight and adding non-cyclical edges via Disjoint Sets.',
    primaryStructure: 'dsu',
  },
  'graphs/minimum-spanning-trees/prim-s-algorithm': {
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    pattern: 'Greedy priority queue cut expansion',
    summary: 'Grows a single minimum spanning tree from an arbitrary root by repeatedly including the minimum-weight edge connecting the tree to an unvisited vertex.',
    primaryStructure: 'pq',
  },
  'dynamic-programming/1d-dynamic-programming/fibonacci-dp': {
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    pattern: 'Tabulation with space optimization',
    summary: 'Computes Fibonacci values iteratively by remembering only the last two consecutive subproblem states.',
    primaryStructure: 'state',
  },
  'dynamic-programming/knapsack-variants/0-1-knapsack': {
    timeComplexity: 'O(n · W)',
    spaceComplexity: 'O(W)',
    pattern: '2D / 1D space-optimized tabulation',
    summary: 'Maximizes aggregate item value subject to a capacity weight constraint by deciding whether to include or exclude each item.',
    primaryStructure: 'dpTable',
  },
  'dynamic-programming/grid-sequence-dp/longest-common-subsequence': {
    timeComplexity: 'O(m · n)',
    spaceComplexity: 'O(m · n)',
    pattern: '2D matrix dynamic programming',
    summary: 'Finds the longest subsequence shared between two sequences by matching characters and memoizing prefix transitions.',
    primaryStructure: 'dpGrid',
  },
  'disjoint-sets-range-queries/disjoint-set-union/union-find': {
    timeComplexity: 'O(α(n))',
    spaceComplexity: 'O(n)',
    pattern: 'Union by rank & path compression',
    summary: 'Tracks partition elements into disjoint sets with nearly constant-time amortized set unions and representative lookups.',
    primaryStructure: 'parentArray',
  },
  'trees-tries/trie-structures/prefix-tree': {
    timeComplexity: 'O(L)',
    spaceComplexity: 'O(Σ · L)',
    pattern: 'Character tree retrieval',
    summary: 'Organizes strings hierarchically by common character prefixes to achieve deterministic key lookups independent of total dictionary size.',
    primaryStructure: 'trieNodes',
  },
};

// Generates fallback metadata derived from topic/subtopic
function defaultMetadata(topicId: string, subtopicId: string, name: string, description: string) {
  let tc = 'O(n)';
  let sc = 'O(1)';
  let pattern = 'Procedural algorithm';
  let primaryStructure = 'data';

  if (topicId.includes('sort')) {
    tc = subtopicId.includes('quadratic') ? 'O(n²)' : 'O(n log n)';
    sc = subtopicId.includes('divide') ? 'O(n)' : 'O(1)';
    pattern = 'Comparison sorting';
    primaryStructure = 'numbers';
  } else if (topicId.includes('search')) {
    tc = 'O(log n)';
    sc = 'O(1)';
    pattern = 'Binary / interval search';
    primaryStructure = 'numbers';
  } else if (topicId.includes('graph')) {
    tc = 'O(V + E)';
    sc = 'O(V)';
    pattern = 'Graph traversal and relaxation';
    primaryStructure = 'graph';
  } else if (topicId.includes('tree')) {
    tc = 'O(n)';
    sc = 'O(h)';
    pattern = 'Hierarchical tree traversal';
    primaryStructure = 'tree';
  } else if (topicId.includes('dynamic') || topicId.includes('dp')) {
    tc = subtopicId.includes('grid') ? 'O(m · n)' : 'O(n)';
    sc = subtopicId.includes('grid') ? 'O(m · n)' : 'O(n)';
    pattern = 'Dynamic programming memoization';
    primaryStructure = 'dpTable';
  } else if (topicId.includes('recursion') || topicId.includes('backtrack')) {
    tc = 'O(2ⁿ)';
    sc = 'O(n)';
    pattern = 'Recursive depth-first backtracking';
    primaryStructure = 'callStack';
  } else if (topicId.includes('string')) {
    tc = 'O(n)';
    sc = 'O(n)';
    pattern = 'String parsing and matching';
    primaryStructure = 'chars';
  } else if (topicId.includes('stack') || topicId.includes('queue')) {
    tc = 'O(n)';
    sc = 'O(n)';
    pattern = 'LIFO / FIFO state tracking';
    primaryStructure = 'stack';
  } else if (topicId.includes('heap')) {
    tc = 'O(n log k)';
    sc = 'O(k)';
    pattern = 'Priority queue balancing';
    primaryStructure = 'heap';
  } else if (topicId.includes('geometry')) {
    tc = 'O(n log n)';
    sc = 'O(n)';
    pattern = 'Spatial geometry & coordinates';
    primaryStructure = 'points';
  } else if (topicId.includes('bit') || topicId.includes('math')) {
    tc = 'O(log n)';
    sc = 'O(1)';
    pattern = 'Bitwise arithmetic and modular reduction';
    primaryStructure = 'state';
  } else if (subtopicId.includes('two-pointers') || subtopicId.includes('window')) {
    tc = 'O(n)';
    sc = 'O(1)';
    pattern = 'Two pointers boundary iteration';
    primaryStructure = 'pointers';
  }

  const summary = `${name}: ${description.replace(/\.$/, '')}. It coordinates operations efficiently while adhering to sound time and space invariants.`;

  return { tc, sc, pattern, primaryStructure, summary };
}

/**
 * Returns complete enriched metadata for all 309 catalog algorithms.
 */
export function getEnrichedAlgorithm(idOrSlug: string): EnrichedAlgorithmData {
  // 1. Direct preset matching
  const presetKey = Object.keys(presetAnalyses).find(
    (k) =>
      presetAnalyses[k].algorithmId === idOrSlug ||
      presetAnalyses[k].algorithmId.endsWith('/' + idOrSlug) ||
      k === idOrSlug,
  );
  if (presetKey) {
    const p = presetAnalyses[presetKey];
    return {
      algorithmId: p.algorithmId,
      name: p.pattern,
      timeComplexity: p.timeComplexity,
      spaceComplexity: p.spaceComplexity,
      pattern: p.pattern,
      summary: p.summary,
      suggestions: p.suggestions,
      visualMapping: p.visualMapping,
    };
  }

  // 2. Find in algorithms catalog
  const algo = algorithms.find(
    (a) => a.id === idOrSlug || a.id.split('/').at(-1) === idOrSlug,
  );

  const key = algo ? algo.id : idOrSlug;
  const override = algorithmOverrides[key] || {};
  const topicId = algo?.topicId || '';
  const subtopicId = algo?.subtopicId || '';
  const name = algo?.name || idOrSlug;
  const desc = algo?.description || 'Algorithmic operation implementation';

  const fallback = defaultMetadata(topicId, subtopicId, name, desc);

  const tc = override.timeComplexity || fallback.tc;
  const sc = override.spaceComplexity || fallback.sc;
  const pattern = override.pattern || fallback.pattern;
  const summary = override.summary || fallback.summary;
  const primaryStructure = override.primaryStructure || fallback.primaryStructure;

  return {
    algorithmId: key,
    name,
    timeComplexity: tc,
    spaceComplexity: sc,
    pattern,
    summary,
    suggestions: [
      {
        type: 'optimization',
        message: `Ensure asymptotic growth stays within ${tc} by avoiding redundant scans and respecting loop bounds.`,
      },
      {
        type: 'edge-case',
        message: 'Validate edge inputs including empty collections, singletons, and extremal duplicate values.',
      },
      {
        type: 'style',
        message: 'Keep state variables locally scoped and maintain clear invariant assertions.',
      },
    ],
    visualMapping: {
      primaryStructure,
      highlights: [{ step: 0, variable: primaryStructure, reason: `Initial state for ${name}` }],
      keyOperations: [{ line: 1, type: 'init', description: `Initialize ${primaryStructure}` }],
    },
  };
}
