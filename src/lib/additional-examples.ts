import type { Example } from './examples';
export const additionalExamples: Example[] = [
  {
    id: '08',
    title: 'Palindrome check',
    category: 'STRINGS',
    description: 'Watch two character pointers meet in the middle.',
    preview: [1, 2, 3, 4, 3, 2, 1],
    expected: { python: 'Palindrome: True' },
    code: `s = "racecar"
left, right = 0, len(s) - 1
valid = True
while left < right:
    if s[left] != s[right]:
        valid = False
        break
    left += 1
    right -= 1
print("Palindrome:", valid)`,
  },
  {
    id: '09',
    title: 'Valid parentheses',
    category: 'STACKS',
    description: 'Push opening brackets, then match and pop their partners.',
    preview: [1, 2, 3, 2, 1],
    expected: { python: 'Valid: True' },
    code: `s = "([])"
stack = []
pairs = {')': '(', ']': '[', '}': '{'}
valid = True
for ch in s:
    if ch in "([{":
        stack.append(ch)
    elif not stack or stack.pop() != pairs[ch]:
        valid = False
        break
print("Valid:", valid and not stack)`,
  },
  {
    id: '10',
    title: 'Top-K with a min heap',
    category: 'HEAPS',
    description: 'Keep the three largest values in a small live heap.',
    preview: [5, 1, 9, 2, 7],
    expected: { python: 'Top-K: [5, 7, 9]' },
    code: `import heapq
heap = []
for value in [5, 1, 9, 2, 7]:
    heapq.heappush(heap, value)
    if len(heap) > 3:
        heapq.heappop(heap)
print("Top-K:", sorted(heap))`,
  },
  {
    id: '11',
    title: 'Single number with XOR',
    category: 'BITS',
    description: 'Cancel duplicate values one bitwise operation at a time.',
    preview: [2, 1, 2, 1, 4],
    expected: { python: 'Single: 4' },
    code: `numbers = [2, 1, 2, 1, 4]
result = 0
for n in numbers:
    result ^= n
print("Single:", result)`,
  },
  {
    id: '12',
    title: 'Merge intervals',
    category: 'INTERVALS',
    description: 'Watch overlapping ranges become one interval.',
    preview: [1, 3, 2, 6, 8],
    expected: { python: 'Merged: [[1, 6], [8, 10]]' },
    code: `intervals = [[1, 3], [2, 6], [8, 10]]
intervals.sort()
merged = []
for i in range(len(intervals)):
    current = intervals[i]
    if merged and current[0] <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], current[1])
    else:
        merged.append(current[:])
print("Merged:", merged)`,
  },
  {
    id: '13',
    title: 'Trie insertion',
    category: 'TRIES',
    description: 'Build shared prefixes and mark word-ending nodes.',
    preview: [3, 1, 2, 3],
    expected: { python: 'Words inserted: 2' },
    code: `root = {"is_end": False}
words = ["cat", "car"]
for word in words:
    node = root
    for ch in word:
        if ch not in node:
            node[ch] = {"is_end": False}
        node = node[ch]
    node["is_end"] = True
print("Words inserted:", len(words))`,
  },
  {
    id: '14',
    title: 'Union-find',
    category: 'DISJOINT SETS',
    description: 'Merge components and shorten their parent paths.',
    preview: [0, 1, 2, 3, 4, 5],
    expected: { python: 'Connected: True' },
    code: `parent = list(range(6))
rank = [0] * 6
def find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])
    return parent[x]
def union(a, b):
    a, b = find(a), find(b)
    if a == b:
        return
    if rank[a] < rank[b]:
        a, b = b, a
    parent[b] = a
    if rank[a] == rank[b]:
        rank[a] += 1
union(0, 1)
union(1, 2)
union(3, 4)
print("Connected:", find(0) == find(2))`,
  },
  {
    id: '15',
    title: 'Unique grid paths',
    category: 'DYNAMIC PROGRAMMING',
    description: 'Build each cell from its upper and left neighbors.',
    preview: [1, 1, 2, 3, 6],
    expected: { python: 'Paths: 6' },
    code: `dp = [[1, 1, 1], [1, 0, 0], [1, 0, 0]]
for i in range(1, 3):
    for j in range(1, 3):
        dp[i][j] = dp[i-1][j] + dp[i][j-1]
print("Paths:", dp[2][2])`,
  },
  {
    id: '16',
    title: 'Depth-first search',
    category: 'GRAPHS',
    description: 'Follow a branch deeply before returning to its siblings.',
    preview: [0, 1, 3, 2],
    expected: { python: "DFS: ['A', 'B', 'D', 'C']" },
    code: `graph = {"A": ["B", "C"], "B": ["D"], "C": [], "D": []}
visited = set()
order = []
def dfs(node):
    if node in visited:
        return
    visited.add(node)
    order.append(node)
    for neighbor in graph[node]:
        dfs(neighbor)
dfs("A")
print("DFS:", order)`,
  },
  {
    id: '17',
    title: 'Insertion sort',
    category: 'SORTING',
    description: 'Insert each next value into an already sorted prefix.',
    preview: [5, 2, 4, 1, 3],
    expected: { python: 'Sorted: [1, 2, 3, 4, 5]' },
    code: `numbers = [5, 2, 4, 1, 3]
for i in range(1, len(numbers)):
    value = numbers[i]
    j = i - 1
    while j >= 0 and numbers[j] > value:
        numbers[j+1] = numbers[j]
        j -= 1
    numbers[j+1] = value
print("Sorted:", numbers)`,
  },
];
