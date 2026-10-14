import type { Example } from './examples';
export const additionalExamples: Example[] = [
  {
    id: '08',
    title: 'Palindrome check',
    category: 'STRINGS',
    description: 'Watch two character pointers meet in the middle.',
    preview: [1, 2, 3, 4, 3, 2, 1],
    expected: { python: 'Palindrome: True', javascript: 'Palindrome: true' },
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
    javascript: `const s = "racecar";
let left = 0, right = s.length - 1;
let valid = true;
while (left < right) {
  if (s[left] !== s[right]) { valid = false; break; }
  left++; right--;
}
console.log("Palindrome:", valid);`,
  },
  {
    id: '09',
    title: 'Valid parentheses',
    category: 'STACKS',
    description: 'Push opening brackets, then match and pop their partners.',
    preview: [1, 2, 3, 2, 1],
    expected: { python: 'Valid: True', javascript: 'Valid: true' },
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
    javascript: `const s = "([])";
const stack = [];
const pairs = {')':'(', ']':'[', '}':'{'};
let valid = true;
for (const ch of s) {
  if ("([{ ".trim().includes(ch)) stack.push(ch);
  else if (!stack.length || stack.pop() !== pairs[ch]) { valid = false; break; }
}
console.log("Valid:", valid && !stack.length);`,
  },
  {
    id: '10',
    title: 'Top-K with a min heap',
    category: 'HEAPS',
    description: 'Keep the three largest values in a small live heap.',
    preview: [5, 1, 9, 2, 7],
    expected: { python: 'Top-K: [5, 7, 9]', javascript: 'Top-K: [5,7,9]' },
    code: `import heapq
heap = []
for value in [5, 1, 9, 2, 7]:
    heapq.heappush(heap, value)
    if len(heap) > 3:
        heapq.heappop(heap)
print("Top-K:", sorted(heap))`,
    javascript: `class MinHeap {
  constructor() { this.items = []; }
  push(value) {
    this.items.push(value);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.items[p] <= this.items[i]) break;
      [this.items[p], this.items[i]] = [this.items[i], this.items[p]];
      i = p;
    }
  }
  pop() {
    const result = this.items[0], last = this.items.pop();
    if (this.items.length) {
      this.items[0] = last;
      let i = 0;
      while (true) {
        let next = i, left = 2*i+1, right = left+1;
        if (left < this.items.length && this.items[left] < this.items[next]) next = left;
        if (right < this.items.length && this.items[right] < this.items[next]) next = right;
        if (next === i) break;
        [this.items[i], this.items[next]] = [this.items[next], this.items[i]];
        i = next;
      }
    }
    return result;
  }
}
const heap = new MinHeap();
for (const value of [5,1,9,2,7]) {
  heap.push(value);
  if (heap.items.length > 3) heap.pop();
}
console.log("Top-K:", [...heap.items].sort((a,b)=>a-b));`,
  },
  {
    id: '11',
    title: 'Single number with XOR',
    category: 'BITS',
    description: 'Cancel duplicate values one bitwise operation at a time.',
    preview: [2, 1, 2, 1, 4],
    expected: { python: 'Single: 4', javascript: 'Single: 4' },
    code: `numbers = [2, 1, 2, 1, 4]
result = 0
for n in numbers:
    result ^= n
print("Single:", result)`,
    javascript: `const numbers = [2,1,2,1,4];
let result = 0;
for (const n of numbers) result ^= n;
console.log("Single:", result);`,
  },
  {
    id: '12',
    title: 'Merge intervals',
    category: 'INTERVALS',
    description: 'Watch overlapping ranges become one interval.',
    preview: [1, 3, 2, 6, 8],
    expected: { python: 'Merged: [[1, 6], [8, 10]]', javascript: 'Merged: [[1,6],[8,10]]' },
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
    javascript: `const intervals = [[1,3],[2,6],[8,10]];
intervals.sort((a,b)=>a[0]-b[0]);
const merged = [];
for (let i=0; i<intervals.length; i++) {
  const current = intervals[i];
  if (merged.length && current[0] <= merged[merged.length-1][1]) {
    merged[merged.length-1][1] = Math.max(merged[merged.length-1][1], current[1]);
  } else merged.push([...current]);
}
console.log("Merged:", merged);`,
  },
  {
    id: '13',
    title: 'Trie insertion',
    category: 'TRIES',
    description: 'Build shared prefixes and mark word-ending nodes.',
    preview: [3, 1, 2, 3],
    expected: { python: 'Words inserted: 2', javascript: 'Words inserted: 2' },
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
    javascript: `const root = {is_end:false};
const words = ["cat","car"];
for (const word of words) {
  let node = root;
  for (const ch of word) {
    if (!(ch in node)) node[ch] = {is_end:false};
    node = node[ch];
  }
  node.is_end = true;
}
console.log("Words inserted:", words.length);`,
  },
  {
    id: '14',
    title: 'Union-find',
    category: 'DISJOINT SETS',
    description: 'Merge components and shorten their parent paths.',
    preview: [0, 1, 2, 3, 4, 5],
    expected: { python: 'Connected: True', javascript: 'Connected: true' },
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
    javascript: `const parent = [0,1,2,3,4,5], rank = [0,0,0,0,0,0];
function find(x) {
  if (parent[x] !== x) parent[x] = find(parent[x]);
  return parent[x];
}
function union(a,b) {
  a = find(a); b = find(b);
  if (a === b) return;
  if (rank[a] < rank[b]) [a,b] = [b,a];
  parent[b] = a;
  if (rank[a] === rank[b]) rank[a]++;
}
union(0,1); union(1,2); union(3,4);
console.log("Connected:", find(0) === find(2));`,
  },
  {
    id: '15',
    title: 'Unique grid paths',
    category: 'DYNAMIC PROGRAMMING',
    description: 'Build each cell from its upper and left neighbors.',
    preview: [1, 1, 2, 3, 6],
    expected: { python: 'Paths: 6', javascript: 'Paths: 6' },
    code: `dp = [[1, 1, 1], [1, 0, 0], [1, 0, 0]]
for i in range(1, 3):
    for j in range(1, 3):
        dp[i][j] = dp[i-1][j] + dp[i][j-1]
print("Paths:", dp[2][2])`,
    javascript: `const dp = [[1,1,1],[1,0,0],[1,0,0]];
for (let i=1; i<3; i++) {
  for (let j=1; j<3; j++) dp[i][j] = dp[i-1][j] + dp[i][j-1];
}
console.log("Paths:", dp[2][2]);`,
  },
  {
    id: '16',
    title: 'Depth-first search',
    category: 'GRAPHS',
    description: 'Follow a branch deeply before returning to its siblings.',
    preview: [0, 1, 3, 2],
    expected: { python: "DFS: ['A', 'B', 'D', 'C']", javascript: 'DFS: ["A","B","D","C"]' },
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
    javascript: `const graph = {A:["B","C"], B:["D"], C:[], D:[]};
const visited = new Set(), order = [];
function dfs(node) {
  if (visited.has(node)) return;
  visited.add(node); order.push(node);
  for (const neighbor of graph[node]) dfs(neighbor);
}
dfs("A");
console.log("DFS:", order);`,
  },
  {
    id: '17',
    title: 'Insertion sort',
    category: 'SORTING',
    description: 'Insert each next value into an already sorted prefix.',
    preview: [5, 2, 4, 1, 3],
    expected: { python: 'Sorted: [1, 2, 3, 4, 5]', javascript: 'Sorted: [1,2,3,4,5]' },
    code: `numbers = [5, 2, 4, 1, 3]
for i in range(1, len(numbers)):
    value = numbers[i]
    j = i - 1
    while j >= 0 and numbers[j] > value:
        numbers[j+1] = numbers[j]
        j -= 1
    numbers[j+1] = value
print("Sorted:", numbers)`,
    javascript: `const numbers = [5,2,4,1,3];
for (let i=1; i<numbers.length; i++) {
  const value = numbers[i];
  let j = i-1;
  while (j >= 0 && numbers[j] > value) { numbers[j+1] = numbers[j]; j--; }
  numbers[j+1] = value;
}
console.log("Sorted:", numbers);`,
  },
];
