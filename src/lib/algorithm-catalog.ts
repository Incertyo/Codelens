export type Algorithm = {
  id: string;
  name: string;
  description: string;
  exampleId?: string;
  topicId: string;
  subtopicId: string;
};
export type Subtopic = { id: string; name: string; description: string; algorithms: Algorithm[] };
export type Topic = { id: string; name: string; subtopics: Subtopic[] };
type Entry = [name: string, description: string, exampleId?: string];
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
function group(name: string, description: string, entries: Entry[]): Subtopic {
  return {
    id: slug(name),
    name,
    description,
    algorithms: entries.map(([title, detail, exampleId]) => ({
      id: slug(title),
      name: title,
      description: detail,
      exampleId,
      topicId: '',
      subtopicId: slug(name),
    })),
  };
}
function topic(name: string, subtopics: Subtopic[]): Topic {
  const id = slug(name);
  return {
    id,
    name,
    subtopics: subtopics.map((sub) => ({
      ...sub,
      algorithms: sub.algorithms.map((algorithm) => ({
        ...algorithm,
        id: `${id}/${sub.id}/${algorithm.id}`,
        topicId: id,
      })),
    })),
  };
}
/** Curated DSA catalog; samples are explicit, never fabricated implementations. */
export const algorithmTopics: Topic[] = [
  topic('Arrays & Sequences', [
    group(
      'Two pointers',
      'Coordinate indices to inspect pairs, partitions, and ordered sequences.',
      [
        ['Two-pointer pair sum', 'Move inward through sorted values to find a target pair.', '07'],
        ['Three sum', 'Fix one value and solve a two-pointer pair problem for the remainder.'],
        ['Container with most water', 'Move the shorter boundary while tracking the best area.'],
        ['Dutch national flag', 'Partition a sequence into three regions with moving boundaries.'],
        ['Sorted deduplication', 'Compact repeated sorted values with read and write pointers.'],
        ['Move zeroes', 'Compact nonzero values while preserving their relative order.'],
        ['Partition around a pivot', 'Separate elements according to their relation to a pivot.'],
      ],
    ),
    group('Sliding windows', 'Maintain state for a contiguous interval as its boundaries change.', [
      ['Fixed-size window sum', 'Add the entering element and subtract the departing one.'],
      ['Longest unique substring', 'Maintain a window with no repeated characters.'],
      ['Minimum window substring', 'Shrink a valid covering window to find its smallest span.'],
      [
        'Longest repeating-character replacement',
        'Track frequencies within a replaceable character window.',
      ],
      ['Sliding window maximum', 'Maintain candidate maxima with a monotonic deque.'],
      [
        'Subarrays with at most K distinct values',
        'Shrink when the frequency map contains too many distinct values.',
      ],
      [
        'Minimum-length target-sum subarray',
        'Use a growing and shrinking window for positive values.',
      ],
    ]),
    group(
      'Prefix & difference arrays',
      'Transform repeated range calculations into accumulated state.',
      [
        ['Prefix sums', 'Accumulate values so a range sum is a difference of prefixes.'],
        ['Two-dimensional prefix sums', 'Combine rectangular prefixes for grid queries.'],
        ['Difference arrays', 'Mark range boundaries and reconstruct values with a prefix pass.'],
        ['Prefix XOR', 'Accumulate XOR values to answer interval XOR queries.'],
        ['Subarray sum equals K', 'Count matching prefix differences using a frequency map.'],
        ['Product except self', 'Combine left and right products without using division.'],
        ['Kadane’s algorithm', 'Extend or restart a maximum-sum contiguous segment.'],
        ['Maximum circular subarray', 'Combine the ordinary maximum with a wrapped candidate.'],
      ],
    ),
    group('Intervals', 'Sort and compare ranges using their endpoints.', [
      ['Merge intervals', 'Join ranges whose endpoints overlap.', '12'],
      ['Insert interval', 'Place a new interval and merge any overlaps.'],
      ['Interval intersection', 'Advance the interval that ends first while comparing ranges.'],
      ['Meeting rooms', 'Compare active meetings as start and end events change.'],
      ['Sweep-line overlap counting', 'Process ordered endpoint events to count active intervals.'],
    ]),
  ]),
  topic('Sorting', [
    group('Comparison sorting', 'Order values through comparisons and rearrangements.', [
      ['Bubble sort', 'Exchange adjacent out-of-order values across repeated passes.', '01'],
      ['Insertion sort', 'Insert each next value into an ordered prefix.', '17'],
      ['Selection sort', 'Repeatedly select the smallest remaining value.'],
      ['Merge sort', 'Sort halves and merge their ordered results.'],
      ['Quicksort', 'Partition around a pivot and recursively sort the resulting regions.'],
      ['Heapsort', 'Build a heap and repeatedly extract its extreme value.'],
      ['Shell sort', 'Sort spaced subsequences while decreasing the gap.'],
      ['Timsort', 'Combine naturally occurring ordered runs using merges.'],
      ['Introsort', 'Combine quick partitioning with safeguards and small-range sorting.'],
    ]),
    group('Distribution sorting', 'Use value structure rather than only pairwise comparisons.', [
      ['Counting sort', 'Count occurrences across a bounded key range.'],
      ['Radix sort', 'Order keys one digit or component at a time.'],
      ['Bucket sort', 'Distribute values into buckets and order each bucket.'],
      ['Pigeonhole sort', 'Place bounded keys in corresponding value slots.'],
    ]),
    group('Selection & merging', 'Find order statistics or combine existing ordered sequences.', [
      ['Quickselect', 'Partition only the region containing the requested order statistic.'],
      ['Median of medians', 'Choose a pivot using grouped medians.'],
      ['K-way merge', 'Combine several ordered sequences with a frontier of candidates.'],
      ['Merge inversion counting', 'Count cross-half inversions during merging.'],
      ['External merge sort', 'Sort chunks and merge them when data exceeds working memory.'],
    ]),
  ]),
  topic('Searching', [
    group('Basic search', 'Locate values in an unordered or ordered search space.', [
      ['Linear search', 'Inspect candidates one at a time.'],
      ['Binary search', 'Discard half of an ordered search interval at each decision.', '02'],
      ['Lower bound', 'Find the first position whose value is at least the target.'],
      ['Upper bound', 'Find the first position whose value exceeds the target.'],
      ['Exponential search', 'Expand a search boundary before searching within it.'],
      ['Interpolation search', 'Estimate a position using the distribution of numeric keys.'],
      ['Jump search', 'Skip blocks, then inspect the selected block.'],
    ]),
    group(
      'Search on answers',
      'Search a predicate or structured objective instead of a stored key.',
      [
        [
          'Binary search on a monotone predicate',
          'Find the boundary between false and true outcomes.',
        ],
        ['Rotated-array search', 'Identify the ordered half before choosing a new interval.'],
        ['Peak finding', 'Follow the increasing side to a local peak.'],
        ['Ternary search', 'Narrow a unimodal objective using two interior probes.'],
        ['Binary lifting search', 'Build an answer through descending powers-of-two jumps.'],
        ['Meet in the middle', 'Enumerate partial candidates in two halves and combine them.'],
      ],
    ),
  ]),
  topic('Strings', [
    group('Character scanning', 'Inspect and organize characters with indices or local state.', [
      ['Palindrome check', 'Compare matching characters from opposite ends.', '08'],
      ['Anagram frequency matching', 'Compare character multiplicities.'],
      ['Run-length encoding', 'Represent consecutive equal symbols as counts.'],
      ['Expand-around-center palindromes', 'Grow matching spans from each possible center.'],
      ['Manacher’s algorithm', 'Reuse palindrome information while scanning string centers.'],
      ['Booth’s minimum rotation', 'Find the lexicographically smallest cyclic rotation.'],
    ]),
    group('Pattern matching', 'Match a pattern efficiently against a larger sequence.', [
      ['Naive pattern matching', 'Try each possible starting position.'],
      ['Knuth–Morris–Pratt', 'Reuse matched-prefix information after a mismatch.'],
      ['Z algorithm', 'Measure prefix matches starting at each position.'],
      ['Rabin–Karp', 'Compare rolling fingerprints and verify candidate matches.'],
      ['Boyer–Moore', 'Use mismatch information to skip candidate alignments.'],
      ['Aho–Corasick', 'Match multiple patterns using a trie with failure links.'],
      [
        'Finite-automaton matching',
        'Advance through states representing matched pattern prefixes.',
      ],
    ]),
    group('Suffix structures', 'Organize substrings through suffix order or shared suffix state.', [
      ['Suffix array construction', 'Order the starting positions of all suffixes.'],
      ['Kasai LCP construction', 'Compute shared-prefix lengths between neighboring suffixes.'],
      ['Suffix tree construction', 'Compress suffix paths into a labelled tree.'],
      [
        'Suffix automaton construction',
        'Build states representing equivalent substring continuations.',
      ],
      ['Rolling string hash', 'Update a compact fingerprint as a string interval changes.'],
      ['Longest common substring', 'Find a contiguous segment shared by sequences.'],
    ]),
  ]),
  topic('Hashing & Sets', [
    group('Lookup patterns', 'Use key-indexed state to find complements and duplicates.', [
      ['Two sum with hashing', 'Look up each value’s missing complement.'],
      ['Frequency counting', 'Store a count for each distinct key.'],
      ['Group anagrams', 'Group strings by a normalized character signature.'],
      [
        'Longest consecutive sequence',
        'Start at values with no predecessor and follow consecutive members.',
      ],
      ['Duplicate detection', 'Track which values have already appeared.'],
      ['Set union', 'Collect values present in either input set.'],
      ['Set intersection', 'Collect values common to both sets.'],
      ['Set difference', 'Keep members of one set absent from another.'],
    ]),
    group(
      'Collision handling',
      'Keep distinct keys accessible when their bucket indices collide.',
      [
        ['Separate chaining', 'Store a collection of entries in each hash bucket.'],
        ['Linear probing', 'Scan successive table positions after a collision.'],
        ['Quadratic probing', 'Choose probe offsets using a quadratic pattern.'],
        ['Double hashing', 'Use a second hash to choose the probe step.'],
        ['Robin Hood hashing', 'Balance probe distances when placing colliding entries.'],
        ['Cuckoo hashing', 'Move displaced entries between alternative hash locations.'],
        ['Bloom filter membership', 'Test possible membership using several bit positions.'],
      ],
    ),
  ]),
  topic('Stacks & Queues', [
    group('Stack algorithms', 'Keep the latest unresolved state at the top.', [
      ['Valid parentheses', 'Match closing brackets with the most recent opening bracket.', '09'],
      ['Min stack', 'Maintain minimum information alongside pushed values.'],
      ['Postfix evaluation', 'Use a stack to combine operands as operators arrive.'],
      ['Infix to postfix', 'Use operator precedence while transferring tokens.'],
      [
        'Shunting-yard algorithm',
        'Organize operators and operands using precedence and parentheses.',
      ],
      ['Stack-based DFS', 'Manage the exploration frontier explicitly with a stack.'],
    ]),
    group('Monotonic structures', 'Maintain candidate values in a consistent order.', [
      ['Next greater element', 'Resolve smaller pending values when a larger value arrives.'],
      ['Daily temperatures', 'Track unresolved days until a warmer day appears.'],
      ['Stock span', 'Remove earlier prices dominated by the current price.'],
      ['Largest rectangle in a histogram', 'Find boundaries for bars with a monotonic stack.'],
      ['Trapping rain water', 'Use height boundaries to measure trapped gaps.'],
      ['Monotonic deque maximum', 'Keep only candidates that can become a future window maximum.'],
    ]),
    group('Queue algorithms', 'Process pending work in arrival or endpoint order.', [
      ['Queue using two stacks', 'Transfer values to reverse their order for removal.'],
      ['Circular queue', 'Reuse bounded storage as front and rear advance.'],
      ['Deque operations', 'Insert and remove at either end.'],
      ['Round-robin scheduling', 'Cycle through active work items.'],
      ['Level-order traversal', 'Process each tree level through a queue.'],
    ]),
  ]),
  topic('Linked Lists', [
    group('Pointer rewiring', 'Change links while retaining access to the remaining nodes.', [
      ['Linked list reversal', 'Reverse each next link while tracking the following node.', '05'],
      ['Reverse a linked-list segment', 'Reverse links only within selected boundaries.'],
      ['Merge sorted linked lists', 'Choose the smaller current node from each list.'],
      ['Remove Nth node from the end', 'Maintain a gap between two moving pointers.'],
      ['Reorder list', 'Split, reverse, then interleave the two halves.'],
      ['Copy list with random pointers', 'Reconstruct both next and random references.'],
      ['Flatten a multilevel list', 'Connect nested list levels into one traversal order.'],
    ]),
    group('Fast & slow pointers', 'Coordinate pointers that move at different rates.', [
      ['Floyd cycle detection', 'Use a slow and a fast pointer to detect a repeated path.'],
      ['Cycle entry detection', 'Find where a detected linked-list cycle begins.'],
      ['Middle node', 'Advance one pointer twice as quickly as the other.'],
      ['Linked-list palindrome', 'Compare halves after locating and reversing a half.'],
      ['Intersecting linked lists', 'Align traversal lengths to find a shared node.'],
      ['Brent cycle detection', 'Detect repeated states using power-of-two checkpoints.'],
    ]),
  ]),
  topic('Trees & Tries', [
    group('Binary-tree traversal', 'Visit tree nodes in a defined order.', [
      ['Preorder traversal', 'Visit the node before its child subtrees.'],
      ['Inorder traversal', 'Visit the left subtree, node, then right subtree.'],
      ['Postorder traversal', 'Visit child subtrees before their parent.'],
      ['Morris traversal', 'Temporarily thread links to traverse without an explicit stack.'],
      ['Tree serialization', 'Encode tree values and missing links for reconstruction.'],
      ['Build tree from traversal orders', 'Use traversal constraints to reconstruct subtrees.'],
      ['Tree diameter', 'Combine subtree heights to find the longest node-to-node path.'],
    ]),
    group('Ordered & balanced trees', 'Maintain search order and structural balance.', [
      ['BST search, insertion and deletion', 'Follow key order while locating or modifying nodes.'],
      ['AVL rotations', 'Restore height balance using local rotations.'],
      ['Red-black balancing', 'Restore color and path invariants after updates.'],
      ['Treap split and merge', 'Combine key order with randomized priorities.'],
      ['Splay access', 'Rotate an accessed node toward the root.'],
      ['B-tree operations', 'Maintain multi-key nodes suited to block-oriented storage.'],
      ['Order-statistic selection', 'Use subtree sizes to locate a ranked key.'],
    ]),
    group('Ancestor & path queries', 'Preprocess tree relationships for repeated queries.', [
      ['Lowest common ancestor', 'Find the deepest shared ancestor of two nodes.'],
      ['Binary lifting ancestors', 'Store ancestors at power-of-two distances.'],
      ['Euler tour flattening', 'Map subtree visits into contiguous traversal intervals.'],
      ['Heavy-light decomposition', 'Split tree paths into a small collection of chain intervals.'],
      ['Centroid decomposition', 'Recursively separate a tree around balanced separator nodes.'],
      ['Tree rerooting DP', 'Reuse contributions while changing the chosen root.'],
    ]),
    group('Prefix trees', 'Share storage among strings with common prefixes.', [
      ['Trie insertion', 'Create character paths and mark completed words.', '13'],
      ['Trie search', 'Follow a character path and check its terminal marker.'],
      ['Prefix lookup', 'Find the subtree associated with a shared prefix.'],
      ['Trie deletion', 'Remove terminal state and prune unused paths.'],
      ['Autocomplete traversal', 'Enumerate completions below a prefix node.'],
      ['Binary trie maximum XOR', 'Choose opposite bits when building an XOR candidate.'],
    ]),
  ]),
  topic('Heaps & Priority Queues', [
    group('Heap maintenance', 'Maintain a complete tree with an ordering invariant.', [
      ['Heapify', 'Restore heap order by moving a displaced value through its descendants.'],
      ['Heap insertion', 'Add a value and move it upward until heap order holds.'],
      ['Heap extraction', 'Remove the root and restore order from the replacement.'],
      [
        'Top-K with a min heap',
        'Keep the largest K values by removing the smallest retained value.',
        '10',
      ],
      ['Kth largest selection with a heap', 'Maintain the candidates needed for a ranked extreme.'],
      ['Indexed priority queue', 'Associate heap positions with keys for priority updates.'],
    ]),
    group('Priority-driven patterns', 'Choose the next candidate by its current priority.', [
      ['Two-heap running median', 'Balance lower and upper halves around the median.'],
      ['Merge K sorted lists', 'Extract the smallest visible list head and advance that list.'],
      ['Priority task scheduling', 'Select available work using its scheduling priority.'],
      ['Smallest covering range', 'Track one candidate from each ordered sequence.'],
      ['Huffman coding', 'Repeatedly merge the least-frequent symbol groups.'],
    ]),
  ]),
  topic('Graphs', [
    group('Traversal & ordering', 'Explore reachability and dependency relationships.', [
      ['Breadth-first search', 'Explore unweighted graph layers using a queue.', '04'],
      ['Depth-first search', 'Follow each branch before returning to alternatives.', '16'],
      ['Bidirectional BFS', 'Expand frontiers from both endpoints.'],
      ['Flood fill', 'Visit connected cells sharing an eligibility condition.'],
      ['Kahn topological sort', 'Remove zero-indegree vertices from a directed dependency graph.'],
      ['DFS topological sort', 'Use completed DFS visits to order an acyclic directed graph.'],
      ['Bipartite coloring', 'Assign opposite colors across every edge.'],
      ['Directed-cycle detection', 'Detect a return to a vertex on the active DFS path.'],
    ]),
    group('Shortest paths', 'Find least-cost routes under different edge constraints.', [
      ['Dijkstra’s algorithm', 'Expand the least-cost frontier when edge weights are nonnegative.'],
      ['Bellman–Ford', 'Relax edges repeatedly and detect reachable negative cycles.'],
      ['Floyd–Warshall', 'Consider intermediate vertices when updating all-pairs distances.'],
      ['Johnson’s algorithm', 'Reweight suitable graphs before repeated shortest-path searches.'],
      ['0–1 BFS', 'Use deque endpoints for edges weighted zero or one.'],
      ['DAG shortest paths', 'Relax outgoing edges in topological order.'],
      ['A* search', 'Prioritize estimated total path cost using a heuristic.'],
      ['Multi-source shortest paths', 'Start a distance frontier from several initial vertices.'],
    ]),
    group(
      'Connectivity & spanning trees',
      'Identify components, separators and connecting edge sets.',
      [
        ['Kruskal’s minimum spanning tree', 'Add ordered edges that join different components.'],
        [
          'Prim’s minimum spanning tree',
          'Grow a connected tree using the cheapest outgoing candidate.',
        ],
        [
          'Borůvka’s minimum spanning tree',
          'Merge components through their cheapest outgoing edges.',
        ],
        [
          'Tarjan strongly connected components',
          'Use DFS low-link state to extract mutually reachable components.',
        ],
        [
          'Kosaraju strongly connected components',
          'Combine finish order with traversal of the reversed graph.',
        ],
        [
          'Bridge detection',
          'Use DFS ancestry to find edges whose removal disconnects a component.',
        ],
        ['Articulation points', 'Find vertices that separate DFS subtrees from their ancestors.'],
        ['Hierholzer Euler traversal', 'Join edge-consuming walks into an Euler trail or circuit.'],
      ],
    ),
    group('Flow & matching', 'Allocate capacity or pair vertices through graph structure.', [
      ['Ford–Fulkerson', 'Augment flow along residual paths.'],
      ['Edmonds–Karp', 'Choose augmenting paths with breadth-first search.'],
      ['Dinic’s algorithm', 'Send blocking flow through layered residual graphs.'],
      ['Push–relabel', 'Move excess flow while adjusting vertex heights.'],
      ['Minimum-cost flow', 'Combine residual capacity with path costs.'],
      ['Hopcroft–Karp', 'Augment bipartite matchings using layered searches.'],
      ['Hungarian assignment', 'Find a minimum-cost assignment through reduced-cost structure.'],
      ['Blossom matching', 'Contract odd cycles when finding general-graph matchings.'],
      [
        'Stoer–Wagner minimum cut',
        'Find a global minimum cut in a suitable undirected weighted graph.',
      ],
    ]),
  ]),
  topic('Disjoint Sets & Range Queries', [
    group('Union-find', 'Track components through representative parent links.', [
      [
        'Union-find with path compression',
        'Merge components and shorten representative paths.',
        '14',
      ],
      ['Union by rank or size', 'Attach smaller or shallower components to larger ones.'],
      ['Rollback DSU', 'Record changes so earlier component states can be restored.'],
      ['Weighted DSU', 'Maintain relative quantities along representative links.'],
      [
        'Offline dynamic connectivity',
        'Combine component operations with scheduled edge lifetimes.',
      ],
    ]),
    group(
      'Range data structures',
      'Prepare indexed data for repeated interval queries and updates.',
      [
        ['Fenwick tree', 'Accumulate indexed contributions through low-bit jumps.'],
        ['Segment tree', 'Store interval summaries in a hierarchical decomposition.'],
        ['Lazy propagation', 'Defer range updates until descendant summaries need them.'],
        ['Persistent segment tree', 'Share unchanged nodes across versions of range state.'],
        ['Sparse table', 'Precompute power-of-two blocks for static range queries.'],
        ['Square-root decomposition', 'Partition data into blocks and combine block summaries.'],
        ['Mo’s algorithm', 'Reorder offline queries to reduce changes to a maintained interval.'],
        ['Wavelet tree', 'Partition values hierarchically to answer rank and order queries.'],
        ['Coordinate compression', 'Replace ordered values with compact relative indices.'],
      ],
    ),
  ]),
  topic('Dynamic Programming', [
    group('Linear & state DP', 'Reuse results from overlapping subproblems.', [
      ['Fibonacci recursion', 'Combine the two smaller Fibonacci subproblems.', '03'],
      ['Fibonacci memoization', 'Store repeated Fibonacci subproblem results.'],
      ['Climbing stairs', 'Combine the ways to reach preceding positions.'],
      ['House robber', 'Compare skipping a value with taking it and skipping its neighbor.'],
      ['Coin change', 'Build target amounts from smaller reachable amounts.'],
      ['Longest increasing subsequence', 'Extend increasing candidates or maintain best tails.'],
      ['Stock trading state DP', 'Track holding and not-holding states across days.'],
      ['Digit DP', 'Count numbers using states for positions and bound constraints.'],
    ]),
    group('Grid & sequence DP', 'Build tables whose cells depend on earlier positions.', [
      ['Unique grid paths', 'Combine upper and left path counts.', '15'],
      ['Minimum grid path sum', 'Combine an eligible predecessor with the current cell cost.'],
      ['Longest common subsequence', 'Compare sequence prefixes and reuse previous table cells.'],
      ['Edit distance', 'Compare insertion, deletion and replacement subproblems.'],
      ['Longest palindromic subsequence', 'Combine matching endpoints or skip an endpoint.'],
      ['Maximal square', 'Combine neighboring square sizes to extend a filled square.'],
      ['Wildcard matching', 'Track whether pattern prefixes match text prefixes.'],
    ]),
    group('Knapsack & partitioning', 'Choose combinations or cuts under constraints.', [
      ['0/1 knapsack', 'Compare taking or skipping each item under a capacity limit.', '06'],
      ['Unbounded knapsack', 'Allow a chosen item type to be reused.'],
      ['Subset sum', 'Track which totals can be formed from eligible values.'],
      ['Equal-sum partition', 'Search for a subset containing half the total sum.'],
      ['Matrix-chain multiplication', 'Choose parenthesization through interval subproblems.'],
      ['Palindrome partitioning', 'Choose cuts between palindromic segments.'],
      ['Burst balloons', 'Choose the last action within each interval.'],
      ['Traveling salesman bitmask DP', 'Track visited subsets and the current endpoint.'],
    ]),
    group('Advanced DP techniques', 'Reduce or reorganize repeated state transitions.', [
      ['Tree DP', 'Combine child-subtree results into parent states.'],
      ['Profile DP', 'Describe a frontier state while advancing through a grid.'],
      ['Subset DP', 'Build results for sets represented by bitmasks.'],
      ['Sum over subsets DP', 'Accumulate contributions from submasks.'],
      [
        'Divide-and-conquer DP optimization',
        'Restrict candidate transition ranges under suitable monotonicity.',
      ],
      ['Knuth optimization', 'Reduce interval-DP split searches when its conditions hold.'],
      ['Convex hull trick', 'Maintain candidate linear functions for repeated evaluations.'],
      ['Li Chao tree', 'Organize competing linear functions over a coordinate domain.'],
    ]),
  ]),
  topic('Recursion & Backtracking', [
    group('Enumeration', 'Build candidates through choices and undo steps.', [
      ['Generate subsets', 'Choose whether to include each value.'],
      ['Generate permutations', 'Choose the next unused value at each position.'],
      ['Generate combinations', 'Choose an ordered subset of eligible candidates.'],
      ['Combination sum', 'Explore choices whose values reach a target.'],
      ['Generate balanced parentheses', 'Maintain valid opening and closing counts.'],
      ['N-queens', 'Place queens while excluding attacked rows, columns and diagonals.'],
      ['Sudoku solver', 'Try eligible digits and undo failed branches.'],
      ['Word search', 'Follow neighboring cells while avoiding repeated use on a path.'],
      ['Hamiltonian path search', 'Explore vertex paths that visit each required vertex once.'],
    ]),
    group('Divide & conquer', 'Split a problem, solve parts, and combine their results.', [
      ['Binary recursion', 'Branch into smaller subproblems and combine their results.'],
      ['Fast exponentiation', 'Reuse the result of a half-sized exponent problem.'],
      ['Karatsuba multiplication', 'Combine smaller products using algebraic rearrangement.'],
      [
        'Closest-pair divide and conquer',
        'Combine spatial halves while checking a boundary strip.',
      ],
      ['Strassen matrix multiplication', 'Combine block products using algebraic identities.'],
      ['Branch and bound', 'Prune a candidate subtree using a bound on its possible result.'],
    ]),
  ]),
  topic('Greedy Algorithms', [
    group(
      'Scheduling & selection',
      'Make local choices whose validity depends on the problem structure.',
      [
        ['Activity selection', 'Prefer compatible activities with the earliest ending time.'],
        ['Interval partitioning', 'Reuse an available resource or allocate another one.'],
        ['Fractional knapsack', 'Take eligible fractions in value-density order.'],
        ['Job sequencing with deadlines', 'Schedule valuable jobs in eligible free slots.'],
        ['Jump game', 'Track the farthest reachable position.'],
        ['Gas station circuit', 'Track a candidate start while accumulating fuel differences.'],
        ['Minimum arrow interval stabbing', 'Choose points that cover compatible interval groups.'],
        [
          'Greedy set cover',
          'Repeatedly choose a set covering many remaining elements; an approximation.',
        ],
      ],
    ),
    group(
      'Exchange & ordering patterns',
      'Order choices to maintain an eligible or optimal partial solution.',
      [
        ['Optimal merge pattern', 'Repeatedly combine the smallest eligible groups.'],
        ['Reorganize string', 'Select character groups while avoiding adjacent repetition.'],
        ['Task cooldown scheduling', 'Arrange repeated tasks with required gaps.'],
        [
          'Gale–Shapley stable matching',
          'Use proposals and tentative matches to obtain a stable matching.',
        ],
        [
          'Greedy coin change',
          'Choose largest denominations when that coin system permits greedy correctness.',
        ],
        ['Minimum spanning-tree cut choices', 'Choose safe edges across component cuts.'],
      ],
    ),
  ]),
  topic('Bits & Mathematics', [
    group('Bit manipulation', 'Treat integer state as individual bits or bit sets.', [
      ['Single number with XOR', 'Cancel paired values through XOR.', '11'],
      ['Brian Kernighan bit counting', 'Clear the lowest set bit on each iteration.'],
      ['Lowest set bit extraction', 'Isolate the lowest set bit with x & −x.'],
      ['Power-of-two test', 'Check that exactly one eligible bit is set.'],
      ['Enumerate submasks', 'Visit subsets represented within a larger bitmask.'],
      ['Gray code generation', 'Generate successive codes that differ in one bit.'],
      ['Bit reversal', 'Reverse the order of selected bit positions.'],
      ['XOR linear basis', 'Maintain independent vectors over binary arithmetic.'],
    ]),
    group('Number theory', 'Use arithmetic structure for divisibility, primes and residues.', [
      ['Euclidean GCD', 'Repeatedly replace a pair by its remainder relation.'],
      [
        'Extended Euclidean algorithm',
        'Track coefficients for a greatest-common-divisor identity.',
      ],
      ['Sieve of Eratosthenes', 'Mark composite multiples while scanning prime candidates.'],
      ['Linear sieve', 'Organize prime factors while marking composites.'],
      ['Segmented sieve', 'Sieve a bounded interval using smaller prime factors.'],
      ['Trial division factorization', 'Remove factors while testing eligible divisors.'],
      ['Miller–Rabin primality test', 'Test prime candidates through modular witness checks.'],
      ['Pollard rho factorization', 'Use modular iteration and gcd checks to seek a factor.'],
      ['Modular exponentiation', 'Reduce repeated squared products modulo a base.'],
      ['Modular inverse', 'Find an eligible multiplicative inverse in modular arithmetic.'],
      ['Chinese remainder theorem construction', 'Combine compatible modular congruences.'],
      [
        'Euler totient computation',
        'Count or compute integers coprime to a given positive integer.',
      ],
    ]),
    group('Combinatorics & algebra', 'Compute counting formulas and structured transformations.', [
      ['Pascal triangle', 'Build binomial coefficients from neighboring values.'],
      [
        'Factorial-based binomial coefficients',
        'Combine factorial products and eligible modular inverses.',
      ],
      ['Inclusion–exclusion', 'Alternate overlapping contributions when counting a union.'],
      ['Matrix exponentiation', 'Apply repeated linear transitions through squared matrices.'],
      ['Gaussian elimination', 'Eliminate variables to solve or characterize a linear system.'],
      ['Fast Fourier transform', 'Decompose a discrete Fourier transform into smaller transforms.'],
      [
        'Number-theoretic transform',
        'Perform suitable modular transforms for polynomial operations.',
      ],
      ['Polynomial convolution', 'Combine coefficients of products or aggregated pair sums.'],
      ['Fast Walsh–Hadamard transform', 'Transform suitable XOR-related combinations.'],
    ]),
  ]),
  topic('Geometry & Spatial Algorithms', [
    group('Geometric primitives', 'Compare positions, orientations and geometric intersections.', [
      ['Orientation via cross product', 'Determine the turn made by three points.'],
      ['Segment intersection', 'Combine orientation and boundary checks.'],
      ['Point in polygon', 'Use ray crossings or winding information.'],
      ['Polygon area', 'Accumulate oriented edge contributions.'],
      ['Line intersection', 'Solve for the meeting point of eligible lines.'],
      ['Circle intersection', 'Compare distances and radii to find intersection structure.'],
    ]),
    group('Hulls & spatial search', 'Organize geometric candidates and nearby objects.', [
      ['Graham scan convex hull', 'Order candidates by angle and remove inward turns.'],
      ['Andrew monotone-chain hull', 'Build lower and upper hulls from sorted points.'],
      ['Jarvis march', 'Choose successive extreme hull edges.'],
      ['Rotating calipers', 'Advance coordinated support points around a convex polygon.'],
      ['Closest pair of points', 'Find the nearest pair using spatial organization.'],
      ['Sweep-line geometric intersection', 'Maintain active geometry as an event line advances.'],
      [
        'KD-tree nearest-neighbor search',
        'Partition space and prune regions using distance bounds.',
      ],
      [
        'Half-plane intersection',
        'Find the region satisfying a collection of planar inequalities.',
      ],
    ]),
  ]),
];
export const algorithms = algorithmTopics.flatMap((t) => t.subtopics.flatMap((s) => s.algorithms));
export const catalogReferences = [
  {
    name: 'MIT OpenCourseWare — Introduction to Algorithms',
    url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-notes/',
  },
  {
    name: 'Algorithms for Competitive Programming',
    url: 'https://cp-algorithms.com/navigation.html',
  },
];
const algorithmAliases: Record<string, string> = {
  'Breadth-first search': 'BFS',
  'Depth-first search': 'DFS',
  'Knuth–Morris–Pratt': 'KMP prefix function',
  'Aho–Corasick': 'AC automaton',
  'Lowest common ancestor': 'LCA',
  'Longest common subsequence': 'LCS',
  'Longest increasing subsequence': 'LIS',
  'Union-find with path compression': 'DSU disjoint set union find',
  'Fenwick tree': 'BIT binary indexed tree',
  'Fast Fourier transform': 'FFT',
  'Number-theoretic transform': 'NTT',
  'Chinese remainder theorem construction': 'CRT',
  'Tarjan strongly connected components': 'SCC',
  'Kosaraju strongly connected components': 'SCC',
  'Heavy-light decomposition': 'HLD',
  'Sum over subsets DP': 'SOS DP',
  'Convex hull trick': 'CHT',
};
export function searchAlgorithms(query: string): Algorithm[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return algorithms.filter((a) => {
    const topic = algorithmTopics.find((t) => t.id === a.topicId)!;
    const sub = topic.subtopics.find((s) => s.id === a.subtopicId)!;
    const text =
      `${a.name} ${algorithmAliases[a.name] ?? ''} ${a.description} ${topic.name} ${sub.name}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
