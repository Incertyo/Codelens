export const measurementPrograms = [
  {
    name: 'linear scan',
    time: 'O(n)',
    space: 'O(1)',
    input: 'list',
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
