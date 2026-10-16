import type { Enrichment } from './breakdown';

export type PresetAnalysis = {
  algorithmId: string;
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
  pattern: string;
  suggestions: NonNullable<Enrichment['suggestions']>;
  visualMapping: NonNullable<Enrichment['visualMapping']>;
};

export const presetAnalyses: Record<string, PresetAnalysis> = {
  '01': {
    algorithmId: 'sorting/bubble-sort',
    timeComplexity: 'O(n²)',
    spaceComplexity: 'O(1)',
    summary:
      'Bubble sort repeatedly compares adjacent elements in the array and swaps them if out of order, bubbling the largest unsorted value to the end in each pass.',
    pattern: 'Bubble sort',
    suggestions: [
      {
        type: 'optimization',
        message: 'Add a boolean swapped flag to break early if no swaps occur during an entire pass, achieving O(n) best-case time for already sorted arrays.',
        line: 4,
      },
      {
        type: 'style',
        message: 'Consider encapsulating the sorting logic into a reusable function that returns a sorted copy or sorts in place.',
      },
    ],
    visualMapping: {
      primaryStructure: 'numbers',
      highlights: [
        { step: 0, variable: 'numbers', reason: 'Initial unsorted numbers array' },
      ],
      keyOperations: [
        { line: 5, type: 'compare', description: 'Compare neighbors numbers[j] and numbers[j + 1]' },
        { line: 6, type: 'swap', description: 'Swap adjacent elements out of order' },
      ],
    },
  },
  '02': {
    algorithmId: 'searching/binary-search',
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    summary:
      'Binary search finds the target in a sorted collection by repeatedly halving the search interval around the midpoint.',
    pattern: 'Binary search',
    suggestions: [
      {
        type: 'optimization',
        message: 'Compute mid using lo + (hi - lo) // 2 to avoid potential integer overflow in fixed-width numeric environments.',
        line: 7,
      },
      {
        type: 'edge-case',
        message: 'Verify behavior when the target is smaller than the minimum element or larger than the maximum element in numbers.',
      },
    ],
    visualMapping: {
      primaryStructure: 'numbers',
      highlights: [
        { step: 0, variable: 'numbers', reason: 'Sorted sequence for logarithmic search' },
      ],
      keyOperations: [
        { line: 7, type: 'midpoint', description: 'Calculate partition midpoint mid = (lo + hi) // 2' },
        { line: 8, type: 'branch', description: 'Check if midpoint matches target value' },
      ],
    },
  },
  '03': {
    algorithmId: 'recursion/fibonacci',
    timeComplexity: 'O(2ⁿ)',
    spaceComplexity: 'O(n)',
    summary:
      'Recursively computes the nth Fibonacci number by evaluating two smaller subproblems, resulting in an exponential call tree.',
    pattern: 'Recursive Fibonacci',
    suggestions: [
      {
        type: 'optimization',
        message: 'Cache computed results using memoization or an iterative table to reduce time complexity from O(2ⁿ) down to O(n).',
        line: 2,
      },
    ],
    visualMapping: {
      primaryStructure: 'callStack',
      highlights: [
        { step: 0, variable: 'n', reason: 'Input parameter branching down the recursion tree' },
      ],
      keyOperations: [
        { line: 2, type: 'base_case', description: 'Return n when n <= 1' },
        { line: 4, type: 'recurse', description: 'Branch into fibonacci(n - 1) + fibonacci(n - 2)' },
      ],
    },
  },
  '04': {
    algorithmId: 'graphs/breadth-first-search',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    summary:
      'Breadth-first search traverses the graph level by level starting from the source vertex using a FIFO queue to discover unvisited neighbors.',
    pattern: 'Breadth-first search',
    suggestions: [
      {
        type: 'optimization',
        message: 'In Python, use collections.deque instead of list.pop(0) to achieve O(1) removals from the front of the queue.',
        line: 7,
      },
    ],
    visualMapping: {
      primaryStructure: 'queue',
      highlights: [
        { step: 0, variable: 'queue', reason: 'FIFO frontier queue tracking vertices to visit' },
      ],
      keyOperations: [
        { line: 7, type: 'pop', description: 'Dequeue the next front node to process' },
        { line: 11, type: 'enqueue', description: 'Extend queue with adjacent unvisited neighbor nodes' },
      ],
    },
  },
  '05': {
    algorithmId: 'linked-lists/reverse-linked-list',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    summary:
      'Reverses a singly linked list in a single linear pass by redirecting each node next pointer to its predecessor.',
    pattern: 'Linked list reversal',
    suggestions: [
      {
        type: 'style',
        message: 'Ensure the function cleanly returns the new head (prev) and handles empty lists gracefully.',
        line: 16,
      },
    ],
    visualMapping: {
      primaryStructure: 'current',
      highlights: [
        { step: 0, variable: 'head', reason: 'Head node of the singly linked list' },
      ],
      keyOperations: [
        { line: 11, type: 'pointer', description: 'Save current.next to following before breaking link' },
        { line: 12, type: 'reverse', description: 'Reverse current.next to point back to prev' },
      ],
    },
  },
  '06': {
    algorithmId: 'dynamic-programming/0-1-knapsack',
    timeComplexity: 'O(n × W)',
    spaceComplexity: 'O(n × W)',
    summary:
      '0/1 Knapsack builds a 2D dynamic programming grid where entry dp[i][j] represents the maximum value achievable with the first i items under weight limit j.',
    pattern: 'Dynamic programming',
    suggestions: [
      {
        type: 'optimization',
        message: 'Auxiliary space can be optimized from O(n × W) to O(W) by using a single 1D array traversed backwards from capacity down to weight.',
        line: 8,
      },
    ],
    visualMapping: {
      primaryStructure: 'dp',
      highlights: [
        { step: 0, variable: 'dp', reason: '2D table storing optimal values for subproblems' },
      ],
      keyOperations: [
        { line: 10, type: 'dp_transition', description: 'Take maximum between excluding item and including item values' },
      ],
    },
  },
  '07': {
    algorithmId: 'arrays/two-sum',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    summary:
      'Two sum tracks previously inspected numbers and their indices in a hash map to identify the complement of the current element in a single pass.',
    pattern: 'Hash map lookup',
    suggestions: [
      {
        type: 'optimization',
        message: 'If the input array is guaranteed to be sorted, a two-pointer approach achieves O(1) auxiliary space without hash allocation.',
      },
    ],
    visualMapping: {
      primaryStructure: 'seen',
      highlights: [
        { step: 0, variable: 'seen', reason: 'Hash table recording seen values and indexes' },
      ],
      keyOperations: [
        { line: 6, type: 'hash_check', description: 'Lookup complement in hash table' },
      ],
    },
  },
  '08': {
    algorithmId: 'strings/palindrome-check',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    summary:
      'Checks whether a string is a palindrome by moving left and right pointers inward from both ends and comparing characters.',
    pattern: 'Two pointers',
    suggestions: [
      {
        type: 'edge-case',
        message: 'Consider filtering out non-alphanumeric characters and normalizing casing for phrase palindromes.',
      },
    ],
    visualMapping: {
      primaryStructure: 's',
      highlights: [
        { step: 0, variable: 's', reason: 'Input string verified inward from both boundaries' },
      ],
      keyOperations: [
        { line: 5, type: 'compare', description: 'Compare characters at left and right indices' },
      ],
    },
  },
  '09': {
    algorithmId: 'stacks/valid-parentheses',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    summary:
      'Validates bracket matching using a LIFO stack: pushes open brackets and pops the matching opening bracket when a close bracket is encountered.',
    pattern: 'Stack verification',
    suggestions: [
      {
        type: 'optimization',
        message: 'Return false immediately if the string length is odd, as unmatched brackets are guaranteed.',
      },
    ],
    visualMapping: {
      primaryStructure: 'stack',
      highlights: [
        { step: 0, variable: 'stack', reason: 'LIFO bracket stack tracking unclosed openers' },
      ],
      keyOperations: [
        { line: 7, type: 'push', description: 'Push open bracket onto stack' },
        { line: 9, type: 'pop', description: 'Pop opening bracket and verify against matching closer' },
      ],
    },
  },
  '10': {
    algorithmId: 'heaps/top-k-elements',
    timeComplexity: 'O(n log k)',
    spaceComplexity: 'O(k)',
    summary:
      'Maintains a min-heap of size k while iterating over elements. Smaller values are discarded so the heap retains only the k largest values.',
    pattern: 'Min heap',
    suggestions: [
      {
        type: 'optimization',
        message: 'Use heapq.heapreplace or heappushpop instead of push followed by pop for better constant factors.',
      },
    ],
    visualMapping: {
      primaryStructure: 'heap',
      highlights: [
        { step: 0, variable: 'heap', reason: 'Binary min-heap maintaining the top K largest values' },
      ],
      keyOperations: [
        { line: 6, type: 'heap_push', description: 'Push value into heap' },
        { line: 8, type: 'heap_pop', description: 'Pop root when heap size exceeds k' },
      ],
    },
  },
  '11': {
    algorithmId: 'trees/trie-prefix-search',
    timeComplexity: 'O(L)',
    spaceComplexity: 'O(Σ × L)',
    summary:
      'Prefix tree (Trie) enables efficient word insertion and prefix lookup with step-by-step character branch traversal.',
    pattern: 'Trie prefix tree',
    suggestions: [
      {
        type: 'style',
        message: 'Encapsulate node manipulation inside a Trie class with insert, search, and startsWith methods.',
      },
    ],
    visualMapping: {
      primaryStructure: 'root',
      highlights: [
        { step: 0, variable: 'root', reason: 'Trie root dictionary branching to child character nodes' },
      ],
      keyOperations: [
        { line: 5, type: 'trie_step', description: 'Traverse or create character node in Trie' },
      ],
    },
  },
  '12': {
    algorithmId: 'graphs/disjoint-set-union',
    timeComplexity: 'O(α(n))',
    spaceComplexity: 'O(n)',
    summary:
      'Disjoint Set Union (DSU) partitions elements into disjoint sets with near-constant amortized time find and union operations.',
    pattern: 'Disjoint-set union',
    suggestions: [
      {
        type: 'optimization',
        message: 'Combine path compression in find() with union by rank/size for optimal inverse Ackermann α(n) complexity.',
      },
    ],
    visualMapping: {
      primaryStructure: 'parent',
      highlights: [
        { step: 0, variable: 'parent', reason: 'Parent pointer array defining trees of connected components' },
      ],
      keyOperations: [
        { line: 6, type: 'find_root', description: 'Find root representative of element set' },
        { line: 10, type: 'union_sets', description: 'Attach smaller tree root to larger tree root' },
      ],
    },
  },
  '13': {
    algorithmId: 'arrays/sliding-window-maximum',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    summary:
      'Sliding window maintains a fixed or dynamic window over contiguous elements, updating metrics in O(1) per step by adding incoming and subtracting outgoing values.',
    pattern: 'Sliding window',
    suggestions: [
      {
        type: 'edge-case',
        message: 'Handle cases where the array length is strictly less than the window length k.',
      },
    ],
    visualMapping: {
      primaryStructure: 'numbers',
      highlights: [
        { step: 0, variable: 'numbers', reason: 'Sequence traversed by sliding interval window' },
      ],
      keyOperations: [
        { line: 6, type: 'slide', description: 'Shift window: subtract element leaving left, add element entering right' },
      ],
    },
  },
  '14': {
    algorithmId: 'bit-manipulation/subsets-bitmask',
    timeComplexity: 'O(n × 2ⁿ)',
    spaceComplexity: 'O(n × 2ⁿ)',
    summary:
      'Generates all 2ⁿ subsets of an n-element array using bitmasks from 0 to 2ⁿ - 1 where the j-th bit determines inclusion of element j.',
    pattern: 'Bitmask enumeration',
    suggestions: [
      {
        type: 'edge-case',
        message: 'Cap n <= 30 to prevent integer overflow and excessive memory allocation during power set creation.',
      },
    ],
    visualMapping: {
      primaryStructure: 'subsets',
      highlights: [
        { step: 0, variable: 'subsets', reason: 'List of all generated subsets' },
      ],
      keyOperations: [
        { line: 5, type: 'bitmask', description: 'Inspect bit (mask & (1 << j)) to decide inclusion' },
      ],
    },
  },
  '15': {
    algorithmId: 'trees/segment-tree-range-sum',
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(n)',
    summary:
      'Segment tree represents interval tree ranges to support O(log n) range sum queries and point updates.',
    pattern: 'Segment tree',
    suggestions: [
      {
        type: 'optimization',
        message: 'For prefix and range queries without complex range updates, a Fenwick tree (Binary Indexed Tree) offers simpler code and lower memory footprint.',
      },
    ],
    visualMapping: {
      primaryStructure: 'tree',
      highlights: [
        { step: 0, variable: 'tree', reason: 'Linear array representing segment tree intervals' },
      ],
      keyOperations: [
        { line: 6, type: 'tree_query', description: 'Aggregate interval sum by branching left or right' },
      ],
    },
  },
  '16': {
    algorithmId: 'hash-tables/hash-table-chaining',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(n)',
    summary:
      'Hash table with separate chaining stores collided key-value pairs in bucket arrays, providing expected O(1) lookup and insertion.',
    pattern: 'Hash table',
    suggestions: [
      {
        type: 'optimization',
        message: 'Implement automatic dynamic resizing when the load factor (items / capacity) exceeds 0.75 to maintain O(1) performance.',
      },
    ],
    visualMapping: {
      primaryStructure: 'buckets',
      highlights: [
        { step: 0, variable: 'buckets', reason: 'Array of buckets containing key-value chains' },
      ],
      keyOperations: [
        { line: 4, type: 'hash_index', description: 'Compute hash bucket index = hash(key) % capacity' },
      ],
    },
  },
  '17': {
    algorithmId: 'matrices/spiral-matrix-traversal',
    timeComplexity: 'O(m × n)',
    spaceComplexity: 'O(1)',
    summary:
      'Traverses a 2D matrix in spiral order by advancing along outer boundaries (top, right, bottom, left) and contracting boundaries inwards.',
    pattern: 'Matrix traversal',
    suggestions: [
      {
        type: 'edge-case',
        message: 'Ensure boundary guards top <= bottom and left <= right are re-checked after horizontal and vertical passes.',
      },
    ],
    visualMapping: {
      primaryStructure: 'matrix',
      highlights: [
        { step: 0, variable: 'matrix', reason: '2D matrix traversed in clockwise spiral order' },
      ],
      keyOperations: [
        { line: 7, type: 'spiral_traverse', description: 'Traverse edge along current active boundary' },
      ],
    },
  },
};

export function findPresetAnalysis(idOrSlug: string): PresetAnalysis | null {
  if (presetAnalyses[idOrSlug]) return presetAnalyses[idOrSlug];
  const normalized = idOrSlug.replace(/^(reference|featured):/, '');
  for (const preset of Object.values(presetAnalyses)) {
    if (preset.algorithmId === normalized || preset.algorithmId.endsWith(`/${normalized}`)) {
      return preset;
    }
  }
  return null;
}
