import type { Example } from './examples';
export const javascriptSources = [
  `const numbers = [5, 3, 8, 1, 2];\n\nfor (let i = 0; i < numbers.length; i++) {\n  for (let j = 0; j < numbers.length - i - 1; j++) {\n    if (numbers[j] > numbers[j + 1]) {\n      [numbers[j], numbers[j + 1]] = [numbers[j + 1], numbers[j]];\n    }\n  }\n}\nconsole.log("Sorted:", numbers);`,
  `const numbers = [2, 4, 6, 8, 10, 12, 14];\nconst target = 10;\nlet lo = 0, hi = numbers.length - 1;\nlet found = -1;\n\nwhile (lo <= hi) {\n  const mid = Math.floor((lo + hi) / 2);\n  if (numbers[mid] === target) {\n    found = mid;\n    break;\n  } else if (numbers[mid] < target) {\n    lo = mid + 1;\n  } else {\n    hi = mid - 1;\n  }\n}\nconsole.log("Found at index:", found);`,
  `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconst result = fibonacci(5);\nconsole.log("Fibonacci:", result);`,
  `const graph = {A: ["B", "C"], B: ["D"], C: ["E"], D: [], E: []};\nconst queue = ["A"];\nconst visited = new Set();\nconst order = [];\n\nwhile (queue.length) {\n  const node = queue.shift();\n  if (!visited.has(node)) {\n    visited.add(node);\n    order.push(node);\n    queue.push(...graph[node]);\n  }\n}\nconsole.log("Visit order:", order);`,
  `class Node {\n  constructor(value, next = null) {\n    this.value = value;\n    this.next = next;\n  }\n}\nlet head = new Node(1, new Node(2, new Node(3)));\nlet prev = null;\nlet current = head;\n\nwhile (current) {\n  const following = current.next;\n  current.next = prev;\n  prev = current;\n  current = following;\n}\nhead = prev;\nconsole.log("New head:", head.value);`,
  `const weights = [2, 3, 4];\nconst values = [6, 10, 12];\nconst capacity = 6;\nconst n = weights.length;\nconst dp = Array.from({length: n + 1}, () => Array(capacity + 1).fill(0));\n\nfor (let i = 1; i <= n; i++) {\n  for (let j = 0; j <= capacity; j++) {\n    dp[i][j] = dp[i - 1][j];\n    if (weights[i - 1] <= j) {\n      dp[i][j] = Math.max(dp[i][j], values[i - 1] + dp[i - 1][j - weights[i - 1]]);\n    }\n  }\n}\nconsole.log("Best value:", dp[n][capacity]);`,
  `const numbers = [1, 2, 4, 7, 11, 15];\nconst target = 15;\nlet i = 0, j = numbers.length - 1;\nlet pair = null;\n\nwhile (i < j) {\n  const total = numbers[i] + numbers[j];\n  if (total === target) {\n    pair = [numbers[i], numbers[j]];\n    break;\n  }\n  if (total < target) i++;\n  else j--;\n}\nconsole.log("Pair:", pair);`,
];
export function exampleCode(example: Example, language: import('./breakdown').Language): string {
  return language === 'python'
    ? example.code
    : (example.javascript ?? javascriptSources[Number(example.id) - 1]);
}
