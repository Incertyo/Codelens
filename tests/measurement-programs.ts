export const measurementPrograms = [
  {
    name: 'linear scan',
    time: 'O(n)',
    space: 'O(1)',
    input: 'list',
    javascript: `function algorithm(items) {
  let total = 0;
  for (const item of items) total += item;
  return total;
}`,
    python: `def algorithm(items):
    total = 0
    for item in items:
        total += item
    return total`,
  },
  {
    name: 'iterative binary search',
    time: 'O(log n)',
    space: 'O(1)',
    input: 'list',
    javascript: `function algorithm(items) {
  let lo = 0, hi = items.length - 1;
  const target = items.length;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (items[mid] === target) return mid;
    if (items[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    python: `def algorithm(items):
    lo, hi = 0, len(items) - 1
    target = len(items)
    while lo <= hi:
        mid = (lo + hi) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
  },
  {
    name: 'recursive binary search',
    time: 'O(log n)',
    space: 'O(log n)',
    input: 'list',
    javascript: `function search(items, lo, hi) {
  if (lo > hi) return -1;
  const mid = Math.floor((lo + hi) / 2);
  if (items[mid] === items.length) return mid;
  return search(items, mid + 1, hi);
}
function algorithm(items) {
  return search(items, 0, items.length - 1);
}`,
    python: `def search(items, lo, hi):
    if lo > hi:
        return -1
    mid = (lo + hi) // 2
    if items[mid] == len(items):
        return mid
    return search(items, mid + 1, hi)

def algorithm(items):
    return search(items, 0, len(items) - 1)`,
  },
  {
    name: 'bubble sort',
    time: 'O(n²)',
    space: 'O(1)',
    input: 'reverse',
    javascript: `function algorithm(items) {
  for (let end = items.length - 1; end > 0; end--) {
    for (let i = 0; i < end; i++) {
      if (items[i] > items[i + 1]) {
        const temp = items[i];
        items[i] = items[i + 1];
        items[i + 1] = temp;
      }
    }
  }
  return items;
}`,
    python: `def algorithm(items):
    for end in range(len(items) - 1, 0, -1):
        for i in range(end):
            if items[i] > items[i + 1]:
                temp = items[i]
                items[i] = items[i + 1]
                items[i + 1] = temp
    return items`,
  },
  {
    name: 'merge sort',
    time: 'O(n log n)',
    space: 'O(n)',
    input: 'reverse',
    javascript: `function algorithm(items) {
  if (items.length < 2) return items;
  const mid = Math.floor(items.length / 2);
  const left = algorithm(items.slice(0, mid));
  const right = algorithm(items.slice(mid));
  const merged = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) merged.push(left[i++]);
    else merged.push(right[j++]);
  }
  while (i < left.length) merged.push(left[i++]);
  while (j < right.length) merged.push(right[j++]);
  return merged;
}`,
    python: `def algorithm(items):
    if len(items) < 2:
        return items
    mid = len(items) // 2
    left = algorithm(items[:mid])
    right = algorithm(items[mid:])
    merged = []
    i, j = 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    while i < len(left):
        merged.append(left[i])
        i += 1
    while j < len(right):
        merged.append(right[j])
        j += 1
    return merged`,
  },
  {
    name: 'recursive fibonacci',
    time: 'O(2ⁿ)',
    space: 'O(n)',
    input: 'int',
    javascript: `function algorithm(n) {
  if (n < 2) return n;
  return algorithm(n - 1) + algorithm(n - 2);
}`,
    python: `def algorithm(n):
    if n < 2:
        return n
    return algorithm(n - 1) + algorithm(n - 2)`,
  },
  {
    name: 'memoized fibonacci',
    time: 'O(n)',
    space: 'O(n)',
    input: 'int',
    javascript: `function algorithm(n) {
  const memo = new Map();
  function fib(k) {
    if (k < 2) return k;
    if (memo.has(k)) return memo.get(k);
    const value = fib(k - 1) + fib(k - 2);
    memo.set(k, value);
    return value;
  }
  return fib(n);
}`,
    python: `def algorithm(n):
    memo = {}
    def fib(k):
        if k < 2:
            return k
        if k in memo:
            return memo[k]
        value = fib(k - 1) + fib(k - 2)
        memo[k] = value
        return value
    return fib(n)`,
  },
  {
    name: 'DP grid',
    time: 'O(n²)',
    space: 'O(n²)',
    input: 'int',
    javascript: `function algorithm(n) {
  const grid = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) row.push(i + j);
    grid.push(row);
  }
  return grid;
}`,
    python: `def algorithm(n):
    grid = []
    for i in range(n):
        row = []
        for j in range(n):
            row.append(i + j)
        grid.append(row)
    return grid`,
  },
  {
    name: 'counting loop',
    time: 'O(n)',
    space: 'O(1)',
    input: 'int',
    javascript: `function algorithm(n) {
  let count = 0;
  for (let i = 0; i < n; i++) count++;
  return count;
}`,
    python: `def algorithm(n):
    count = 0
    for i in range(n):
        count += 1
    return count`,
  },
] as const;

export function measurementArguments(input: string, n: number) {
  return [
    input === 'int' ? n : Array.from({ length: n }, (_, i) => (input === 'reverse' ? n - i : i)),
  ];
}
