from bisect import bisect_left
from functools import lru_cache
from collections import deque


def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)


def fibonacci_memo(n):
    memo = {0: 0, 1: 1}
    def solve(k):
        if k not in memo:
            memo[k] = solve(k - 1) + solve(k - 2)
        return memo[k]
    return solve(n)


def stairs(n):
    previous, current = 1, 1
    for _ in range(n):
        previous, current = current, previous + current
    return previous


def robber(a):
    skip, take = 0, 0
    for value in a:
        skip, take = max(skip, take), skip + value
    return max(skip, take)


def coin_change(coins, amount):
    dp = [0] + [amount + 1] * amount
    for total in range(1, amount + 1):
        for coin in coins:
            if coin <= total:
                dp[total] = min(dp[total], dp[total - coin] + 1)
    return -1 if dp[amount] > amount else dp[amount]


def lis(a):
    tails = []
    for value in a:
        position = bisect_left(tails, value)
        if position == len(tails):
            tails.append(value)
        else:
            tails[position] = value
    return len(tails)


def stocks(prices):
    cash, hold = 0, float('-inf')
    for price in prices:
        cash, hold = max(cash, hold + price), max(hold, cash - price)
    return cash


def digit_dp(bound, divisor):
    """Count 0 <= x <= bound whose digit sum is divisible by divisor."""
    digits = str(bound)
    @lru_cache(None)
    def solve(position, remainder, tight):
        if position == len(digits):
            return int(remainder == 0)
        maximum = int(digits[position]) if tight else 9
        return sum(solve(position + 1, (remainder + digit) % divisor, tight and digit == maximum) for digit in range(maximum + 1))
    return solve(0, 0, True)


def grid_paths(rows, cols):
    dp = [[1] * cols for _ in range(rows)]
    for i in range(1, rows):
        for j in range(1, cols):
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
    return dp[-1][-1]


def grid_min(grid):
    dp = [[float('inf')] * len(grid[0]) for _ in grid]
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            predecessor = 0 if i == j == 0 else min(dp[i - 1][j] if i else float('inf'), dp[i][j - 1] if j else float('inf'))
            dp[i][j] = grid[i][j] + predecessor
    return dp[-1][-1]


def lcs(a, b):
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            dp[i][j] = dp[i - 1][j - 1] + 1 if a[i - 1] == b[j - 1] else max(dp[i - 1][j], dp[i][j - 1])
    return dp[-1][-1]


def edit_distance(a, b):
    dp = [list(range(len(b) + 1))]
    for i in range(1, len(a) + 1):
        dp.append([i] + [0] * len(b))
        for j in range(1, len(b) + 1):
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    return dp[-1][-1]


def palindromic_subsequence(text):
    n = len(text)
    if n == 0:
        return 0
    dp = [[0] * n for _ in range(n)]
    for left in range(n - 1, -1, -1):
        dp[left][left] = 1
        for right in range(left + 1, n):
            dp[left][right] = 2 + (dp[left + 1][right - 1] if right > left + 1 else 0) if text[left] == text[right] else max(dp[left + 1][right], dp[left][right - 1])
    return dp[0][-1]


def maximal_square(grid):
    dp = [[0] * (len(grid[0]) + 1) for _ in range(len(grid) + 1)]
    best = 0
    for i, row in enumerate(grid, 1):
        for j, value in enumerate(row, 1):
            if value == 1:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
                best = max(best, dp[i][j])
    return best * best


def wildcard(text, pattern):
    dp = [[False] * (len(pattern) + 1) for _ in range(len(text) + 1)]
    dp[0][0] = True
    for j, char in enumerate(pattern, 1):
        dp[0][j] = dp[0][j - 1] and char == '*'
    for i in range(1, len(text) + 1):
        for j in range(1, len(pattern) + 1):
            if pattern[j - 1] == '*':
                dp[i][j] = dp[i - 1][j] or dp[i][j - 1]
            elif pattern[j - 1] in ('?', text[i - 1]):
                dp[i][j] = dp[i - 1][j - 1]
    return dp[-1][-1]


def knapsack(weights, values, capacity, unbounded=False):
    dp = [0] * (capacity + 1)
    for weight, value in zip(weights, values):
        order = range(weight, capacity + 1) if unbounded else range(capacity, weight - 1, -1)
        for space in order:
            dp[space] = max(dp[space], dp[space - weight] + value)
    return dp[-1]


def subset_sum(a, target):
    dp = [True] + [False] * target
    for value in a:
        for total in range(target, value - 1, -1):
            dp[total] = dp[total] or dp[total - value]
    return dp[-1]


def equal_partition(a):
    return sum(a) % 2 == 0 and subset_sum(a, sum(a) // 2)


def matrix_chain(dimensions):
    n = len(dimensions) - 1
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for left in range(n - length + 1):
            right = left + length - 1
            dp[left][right] = min(dp[left][k] + dp[k + 1][right] + dimensions[left] * dimensions[k + 1] * dimensions[right + 1] for k in range(left, right))
    return dp[0][-1] if n else 0


def palindrome_cuts(text):
    n = len(text)
    palindrome = [[False] * n for _ in range(n)]
    cuts = [-1] + list(range(n))
    for right in range(n):
        for left in range(right + 1):
            if text[left] == text[right] and (right - left < 2 or palindrome[left + 1][right - 1]):
                palindrome[left][right] = True
                cuts[right + 1] = min(cuts[right + 1], cuts[left] + 1)
    return max(0, cuts[-1])


def balloons(a):
    a = [1] + list(a) + [1]
    dp = [[0] * len(a) for _ in a]
    for length in range(2, len(a)):
        for left in range(len(a) - length):
            right = left + length
            dp[left][right] = max(dp[left][k] + dp[k][right] + a[left] * a[k] * a[right] for k in range(left + 1, right))
    return dp[0][-1]


def tsp(cost):
    n = len(cost)
    dp = [[float('inf')] * n for _ in range(1 << n)]
    dp[1][0] = 0
    for mask in range(1 << n):
        for node in range(n):
            if mask & (1 << node):
                for child in range(n):
                    if not mask & (1 << child):
                        next_mask = mask | (1 << child)
                        dp[next_mask][child] = min(dp[next_mask][child], dp[mask][node] + cost[node][child])
    return min(dp[-1][node] + cost[node][0] for node in range(n))


def tree_independent_set(graph):
    def solve(node, parent):
        skip, take = 0, 1
        for child in graph[node]:
            if child != parent:
                child_skip, child_take = solve(child, node)
                skip += max(child_skip, child_take)
                take += child_skip
        return skip, take
    return max(solve(0, -1))


def profile_tilings(rows, cols):
    """Domino tilings; frontier mask describes cells already occupied."""
    dp = {0: 1}
    for column in range(cols):
        next_dp = {}
        for mask, ways in dp.items():
            def fill(row, next_mask):
                if row == rows:
                    next_dp[next_mask] = next_dp.get(next_mask, 0) + ways
                elif mask & (1 << row):
                    fill(row + 1, next_mask)
                else:
                    fill(row + 1, next_mask | (1 << row))
                    if row + 1 < rows and not mask & (1 << (row + 1)):
                        fill(row + 2, next_mask)
            fill(0, 0)
        dp = next_dp
    return dp.get(0, 0)


def subset_assignment(cost):
    n = len(cost)
    dp = [0] + [float('inf')] * ((1 << n) - 1)
    for mask in range(1 << n):
        row = mask.bit_count()
        for column in range(n):
            if not mask & (1 << column):
                next_mask = mask | (1 << column)
                dp[next_mask] = min(dp[next_mask], dp[mask] + cost[row][column])
    return dp[-1]


def sos(values):
    dp = list(values)
    for bit in range((len(dp) - 1).bit_length()):
        for mask in range(len(dp)):
            if mask & (1 << bit):
                dp[mask] += dp[mask ^ (1 << bit)]
    return dp


def divide_conquer_partition(values, groups):
    """Nonnegative values; squared interval sums form a Monge transition cost."""
    prefix = [0]
    for value in values:
        prefix.append(prefix[-1] + value)
    previous = [0] + [float('inf')] * len(values)
    for group in range(1, groups + 1):
        current = [float('inf')] * (len(values) + 1)
        def solve(left, right, opt_left, opt_right):
            if left > right:
                return
            mid = (left + right) // 2
            best_cost, best_index = float('inf'), opt_left
            for k in range(opt_left, min(mid - 1, opt_right) + 1):
                candidate = previous[k] + (prefix[mid] - prefix[k]) ** 2
                if candidate < best_cost:
                    best_cost, best_index = candidate, k
            current[mid] = best_cost
            solve(left, mid - 1, opt_left, best_index)
            solve(mid + 1, right, best_index, opt_right)
        solve(group, len(values), group - 1, len(values) - 1)
        previous = current
    return previous[-1]


def knuth_merge(values):
    """Optimal adjacent merge of nonnegative weights; Knuth monotone split bounds."""
    n = len(values)
    prefix = [0]
    for value in values:
        prefix.append(prefix[-1] + value)
    dp, opt = [[0] * n for _ in values], [[0] * n for _ in values]
    for i in range(n):
        opt[i][i] = i
    for length in range(2, n + 1):
        for left in range(n - length + 1):
            right = left + length - 1
            candidates = range(opt[left][right - 1], min(right - 1, opt[left + 1][right]) + 1)
            best = min(candidates, key=lambda k: dp[left][k] + dp[k + 1][right])
            opt[left][right] = best
            dp[left][right] = dp[left][best] + dp[best + 1][right] + prefix[right + 1] - prefix[left]
    return dp[0][-1] if n else 0


def convex_hull_trick(lines, queries):
    """Strictly decreasing slopes; nondecreasing queries; minimum envelope."""
    hull = deque()
    for slope, intercept in lines:
        while len(hull) >= 2:
            a, b = hull[-2], hull[-1]
            if (b[1] - a[1]) * (b[0] - slope) >= (intercept - b[1]) * (a[0] - b[0]):
                hull.pop()
            else:
                break
        hull.append((slope, intercept))
    result = []
    for x in queries:
        while len(hull) >= 2 and hull[0][0] * x + hull[0][1] >= hull[1][0] * x + hull[1][1]:
            hull.popleft()
        result.append(hull[0][0] * x + hull[0][1])
    return result


def li_chao(lines, queries, low=-10, high=10):
    """Integer query domain [low,high]; arbitrary line insertion order."""
    tree = {}
    def value(line, x):
        return line[0] * x + line[1]
    def insert(line, node, left, right):
        if node not in tree:
            tree[node] = line
            return
        middle = (left + right) // 2
        at_left = value(line, left) < value(tree[node], left)
        at_middle = value(line, middle) < value(tree[node], middle)
        if at_middle:
            line, tree[node] = tree[node], line
        if left == right:
            return
        if at_left != at_middle:
            insert(line, node * 2, left, middle)
        else:
            insert(line, node * 2 + 1, middle + 1, right)
    def query(x, node, left, right):
        answer = value(tree[node], x) if node in tree else float('inf')
        if left == right:
            return answer
        middle = (left + right) // 2
        child = query(x, node * 2, left, middle) if x <= middle else query(x, node * 2 + 1, middle + 1, right)
        return min(answer, child)
    for line in lines:
        insert(line, 1, low, high)
    return [query(x, 1, low, high) for x in queries]


DEMOS = {
    'fibonacci-recursion': ('fibonacci(5)', 5),
    'fibonacci-memoization': ('fibonacci_memo(10)', 55),
    'climbing-stairs': ('stairs(5)', 8),
    'house-robber': ('robber([2,7,9,3,1])', 12),
    'coin-change': ('coin_change([1,2,5], 11)', 3),
    'longest-increasing-subsequence': ('lis([10,9,2,5,3,7,101,18])', 4),
    'stock-trading-state-dp': ('stocks([7,1,5,3,6,4])', 7),
    'digit-dp': ('digit_dp(9, 3)', 4),
    'unique-grid-paths': ('grid_paths(3, 3)', 6),
    'minimum-grid-path-sum': ('grid_min([[1,3,1],[1,5,1],[4,2,1]])', 7),
    'longest-common-subsequence': ("lcs('abcde', 'ace')", 3),
    'edit-distance': ("edit_distance('horse', 'ros')", 3),
    'longest-palindromic-subsequence': ("palindromic_subsequence('bbbab')", 4),
    'maximal-square': ('maximal_square([[1,1,0],[1,1,1]])', 4),
    'wildcard-matching': ("wildcard('adceb', '*a*b')", True),
    '0-1-knapsack': ('knapsack([2,3,4], [6,10,12], 6)', 18),
    'unbounded-knapsack': ('knapsack([2,3,4], [6,10,12], 6, True)', 20),
    'subset-sum': ('subset_sum([3,8,4,2], 10)', True),
    'equal-sum-partition': ('equal_partition([1,5,11,5])', True),
    'matrix-chain-multiplication': ('matrix_chain([10,30,5,60])', 4500),
    'palindrome-partitioning': ("palindrome_cuts('aab')", 1),
    'burst-balloons': ('balloons([3,1,5,8])', 167),
    'traveling-salesman-bitmask-dp': ('tsp([[0,10,15],[10,0,20],[15,20,0]])', 45),
    'tree-dp': ('tree_independent_set([[1,2],[0,3],[0],[1]])', 2),
    'profile-dp': ('profile_tilings(2, 3)', 3),
    'subset-dp': ('subset_assignment([[4,1,3],[2,0,5],[3,2,2]])', 5),
    'sum-over-subsets-dp': ('sos([1,2,3,4])', [1,3,4,10]),
    'divide-and-conquer-dp-optimization': ('divide_conquer_partition([1,2,3,4], 2)', 52),
    'knuth-optimization': ('knuth_merge([1,2,3,4])', 19),
    'convex-hull-trick': ('convex_hull_trick([(3,0),(2,1),(1,4)], [0,1,2])', [0,3,5]),
    'li-chao-tree': ('li_chao([(3,0),(2,1),(1,4)], [0,2,5])', [0,5,9]),
}
