import { additionalExamples } from './additional-examples';
export type Example = {
  id: string;
  title: string;
  category: string;
  description: string;
  preview: number[];
  code: string;
  expected?: { python: string };
};
export const examples: Example[] = [
  {
    id: '01',
    title: 'Bubble sort',
    category: 'SORTING',
    description: 'Watch neighbors trade places until order emerges.',
    preview: [5, 3, 8, 1, 2],
    code: `numbers = [5, 3, 8, 1, 2]\n\nfor i in range(len(numbers)):\n    for j in range(len(numbers) - i - 1):\n        if numbers[j] > numbers[j + 1]:\n            numbers[j], numbers[j + 1] = numbers[j + 1], numbers[j]\n\nprint("Sorted:", numbers)`,
  },
  {
    id: '02',
    title: 'Binary search',
    category: 'SEARCH',
    description: 'Cut the search space in half, one decision at a time.',
    preview: [2, 4, 6, 8, 10, 12, 14],
    code: `numbers = [2, 4, 6, 8, 10, 12, 14]\ntarget = 10\nlo, hi = 0, len(numbers) - 1\nfound = -1\n\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if numbers[mid] == target:\n        found = mid\n        break\n    elif numbers[mid] < target:\n        lo = mid + 1\n    else:\n        hi = mid - 1\n\nprint("Found at index:", found)`,
  },
  {
    id: '03',
    title: 'Fibonacci',
    category: 'RECURSION',
    description: 'Follow each call down the stack and back again.',
    preview: [0, 1, 1, 2, 3, 5],
    code: `def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\n\nresult = fibonacci(5)\nprint("Fibonacci:", result)`,
  },
  {
    id: '04',
    title: 'Breadth-first search',
    category: 'GRAPHS',
    description: 'Explore a graph one neighborhood at a time.',
    preview: [0, 1, 2, 3, 4],
    code: `graph = {"A": ["B", "C"], "B": ["D"], "C": ["E"], "D": [], "E": []}\nqueue = ["A"]\nvisited = set()\norder = []\n\nwhile queue:\n    node = queue.pop(0)\n    if node not in visited:\n        visited.add(node)\n        order.append(node)\n        queue.extend(graph[node])\n\nprint("Visit order:", order)`,
  },
  {
    id: '05',
    title: 'Linked list reversal',
    category: 'POINTERS',
    description: 'Reverse each link without losing the next node.',
    preview: [1, 2, 3],
    code: `class Node:\n    def __init__(self, value, next=None):\n        self.value = value\n        self.next = next\n\nhead = Node(1, Node(2, Node(3)))\nprev = None\ncurrent = head\n\nwhile current:\n    following = current.next\n    current.next = prev\n    prev = current\n    current = following\n\nhead = prev\nprint("New head:", head.value)`,
  },
  {
    id: '06',
    title: '0/1 Knapsack',
    category: 'DYNAMIC PROGRAMMING',
    description: 'Build a solution cell by cell in a two-dimensional table.',
    preview: [0, 0, 6, 6, 10, 12],
    code: `weights = [2, 3, 4]\nvalues = [6, 10, 12]\ncapacity = 6\nn = len(weights)\ndp = [[0] * (capacity + 1) for _ in range(n + 1)]\n\nfor i in range(1, n + 1):\n    for j in range(capacity + 1):\n        dp[i][j] = dp[i - 1][j]\n        if weights[i - 1] <= j:\n            dp[i][j] = max(dp[i][j], values[i - 1] + dp[i - 1][j - weights[i - 1]])\n\nprint("Best value:", dp[n][capacity])`,
  },
  {
    id: '07',
    title: 'Two pointers',
    category: 'ARRAYS',
    description: 'Move inward to find the pair that makes the target.',
    preview: [1, 2, 4, 7, 11, 15],
    code: `numbers = [1, 2, 4, 7, 11, 15]\ntarget = 15\ni, j = 0, len(numbers) - 1\npair = None\n\nwhile i < j:\n    total = numbers[i] + numbers[j]\n    if total == target:\n        pair = [numbers[i], numbers[j]]\n        break\n    if total < target:\n        i += 1\n    else:\n        j -= 1\n\nprint("Pair:", pair)`,
  },
  ...additionalExamples,
];
