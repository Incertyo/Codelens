import math


def subsets(values):
    result, path = [], []
    def visit(index):
        if index == len(values):
            result.append(list(path))
            return
        visit(index + 1)
        path.append(values[index])
        visit(index + 1)
        path.pop()
    visit(0)
    return result


def permutations(values):
    result, path, used = [], [], set()
    def visit():
        if len(path) == len(values):
            result.append(list(path))
        for i, value in enumerate(values):
            if i not in used:
                used.add(i)
                path.append(value)
                visit()
                path.pop()
                used.remove(i)
    visit()
    return result


def combinations(n, k):
    result, path = [], []
    def visit(start):
        if len(path) == k:
            result.append(list(path))
            return
        for value in range(start, n + 1):
            path.append(value)
            visit(value + 1)
            path.pop()
    visit(1)
    return result


def combination_sum(values, target):
    """Distinct positive candidates, each reusable."""
    values = sorted(values)
    result, path = [], []
    def visit(start, remaining):
        if remaining == 0:
            result.append(list(path))
            return
        for i in range(start, len(values)):
            if values[i] > remaining:
                break
            path.append(values[i])
            visit(i, remaining - values[i])
            path.pop()
    visit(0, target)
    return result


def balanced(n):
    result = []
    def visit(text, opened, closed):
        if closed == n:
            result.append(text)
        if opened < n:
            visit(text + '(', opened + 1, closed)
        if closed < opened:
            visit(text + ')', opened, closed + 1)
    visit('', 0, 0)
    return result


def queens(n):
    columns, rising, falling, path, solutions = set(), set(), set(), [], []
    def visit(row):
        if row == n:
            solutions.append(list(path))
            return
        for col in range(n):
            if col in columns or row + col in rising or row - col in falling:
                continue
            columns.add(col)
            rising.add(row + col)
            falling.add(row - col)
            path.append(col)
            visit(row + 1)
            path.pop()
            columns.remove(col)
            rising.remove(row + col)
            falling.remove(row - col)
    visit(0)
    return solutions


def sudoku(board):
    """n x n Sudoku, n a perfect square; 0 denotes an empty cell."""
    board = [list(row) for row in board]
    n, block = len(board), math.isqrt(len(board))
    def solve():
        choice, eligible = None, None
        for row in range(n):
            for col in range(n):
                if board[row][col] != 0:
                    continue
                forbidden = set(board[row]) | {board[r][col] for r in range(n)}
                forbidden |= {board[r][c] for r in range(row // block * block, row // block * block + block) for c in range(col // block * block, col // block * block + block)}
                candidates = set(range(1, n + 1)) - forbidden
                if eligible is None or len(candidates) < len(eligible):
                    choice, eligible = (row, col), candidates
        if choice is None:
            return True
        row, col = choice
        for value in sorted(eligible):
            board[row][col] = value
            if solve():
                return True
        board[row][col] = 0
        return False
    return board if solve() else None


def word_search(board, word):
    used = set()
    def visit(row, col, index):
        if index == len(word):
            return True
        if not (0 <= row < len(board) and 0 <= col < len(board[0])) or (row, col) in used or board[row][col] != word[index]:
            return False
        used.add((row, col))
        found = any(visit(row + dr, col + dc, index + 1) for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)])
        used.remove((row, col))
        return found
    return any(visit(row, col, 0) for row in range(len(board)) for col in range(len(board[0])))


def hamiltonian(graph):
    path, used = [], set()
    def visit(node):
        path.append(node)
        used.add(node)
        if len(path) == len(graph):
            return list(path)
        for child in graph[node]:
            if child not in used:
                answer = visit(child)
                if answer is not None:
                    return answer
        used.remove(node)
        path.pop()
        return None
    for start in range(len(graph)):
        answer = visit(start)
        if answer is not None:
            return answer
    return None


def recursive_sum(a):
    if len(a) <= 1:
        return sum(a)
    middle = len(a) // 2
    return recursive_sum(a[:middle]) + recursive_sum(a[middle:])


def power(base, exponent):
    """Nonnegative integer exponent."""
    if exponent == 0:
        return 1
    half = power(base, exponent // 2)
    return half * half * (base if exponent % 2 else 1)


def karatsuba(a, b):
    if a < 0 or b < 0:
        return (-1 if (a < 0) != (b < 0) else 1) * karatsuba(abs(a), abs(b))
    if min(a, b) < 10:
        return a * b
    digits = max(len(str(a)), len(str(b))) // 2
    base = 10 ** digits
    high_a, low_a = divmod(a, base)
    high_b, low_b = divmod(b, base)
    low, high = karatsuba(low_a, low_b), karatsuba(high_a, high_b)
    cross = karatsuba(low_a + high_a, low_b + high_b) - low - high
    return high * base * base + cross * base + low


def closest_pair(points):
    """Divide by x, merge by y; Euclidean distance, at least two points."""
    def solve(points):
        if len(points) <= 3:
            distance = min((math.dist(points[i], points[j]) for i in range(len(points)) for j in range(i)), default=float('inf'))
            return distance, sorted(points, key=lambda p: p[1])
        middle = len(points) // 2
        boundary = points[middle][0]
        first, left = solve(points[:middle])
        second, right = solve(points[middle:])
        distance, by_y, i, j = min(first, second), [], 0, 0
        while i < len(left) and j < len(right):
            if left[i][1] <= right[j][1]:
                by_y.append(left[i])
                i += 1
            else:
                by_y.append(right[j])
                j += 1
        by_y += left[i:] + right[j:]
        strip = [point for point in by_y if abs(point[0] - boundary) < distance]
        for i in range(len(strip)):
            for j in range(i + 1, min(i + 8, len(strip))):
                distance = min(distance, math.dist(strip[i], strip[j]))
        return distance, by_y
    return solve(sorted(points))[0]


def strassen(a, b):
    """Square matrices of power-of-two dimension; pedagogical recursive blocks."""
    n = len(a)
    if n == 1:
        return [[a[0][0] * b[0][0]]]
    def combine(x, y, sign=1):
        return [[x[i][j] + sign * y[i][j] for j in range(len(x))] for i in range(len(x))]
    def blocks(matrix):
        m = n // 2
        return [row[:m] for row in matrix[:m]], [row[m:] for row in matrix[:m]], [row[:m] for row in matrix[m:]], [row[m:] for row in matrix[m:]]
    x, y, z, w = blocks(a)
    e, f, g, h = blocks(b)
    p = strassen(combine(x,w), combine(e,h))
    q = strassen(combine(z,w), e)
    r = strassen(x, combine(f,h,-1))
    s = strassen(w, combine(g,e,-1))
    t = strassen(combine(x,y), h)
    u = strassen(combine(z,x,-1), combine(e,f))
    v = strassen(combine(y,w,-1), combine(g,h))
    c11 = combine(combine(combine(p,s),t,-1),v)
    c12, c21 = combine(r,t), combine(q,s)
    c22 = combine(combine(combine(p,q,-1),r),u)
    return [l + r for l,r in zip(c11,c12)] + [l + r for l,r in zip(c21,c22)]


def branch_bound(weights, values, capacity):
    """0/1 knapsack search pruned by a fractional-knapsack upper bound."""
    items = sorted(zip(weights, values), key=lambda item: item[1] / item[0], reverse=True)
    best = 0
    def upper(index, space, total):
        for weight, value in items[index:]:
            amount = min(space, weight)
            total += value * amount / weight
            space -= amount
            if space == 0:
                break
        return total
    def visit(index, space, total):
        nonlocal best
        best = max(best, total)
        if index == len(items) or upper(index, space, total) <= best:
            return
        weight, value = items[index]
        if weight <= space:
            visit(index + 1, space - weight, total + value)
        visit(index + 1, space, total)
    visit(0, capacity, 0)
    return best


DEMOS = {
    'generate-subsets': ('subsets([1,2])', [[],[2],[1],[1,2]]),
    'generate-permutations': ('permutations([1,2])', [[1,2],[2,1]]),
    'generate-combinations': ('combinations(3, 2)', [[1,2],[1,3],[2,3]]),
    'combination-sum': ('combination_sum([2,3,6,7], 7)', [[2,2,3],[7]]),
    'generate-balanced-parentheses': ('balanced(2)', ['(())','()()']),
    'n-queens': ('queens(4)', [[1,3,0,2],[2,0,3,1]]),
    'sudoku-solver': ('sudoku([[1,0,3,4],[3,4,1,0],[0,1,4,3],[4,3,0,1]])', [[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]]),
    'word-search': ("word_search([['A','B'],['C','D']], 'ABD')", True),
    'hamiltonian-path-search': ('hamiltonian([[1],[0,2],[1]])', [0,1,2]),
    'binary-recursion': ('recursive_sum([1,2,3,4])', 10),
    'fast-exponentiation': ('power(3, 5)', 243),
    'karatsuba-multiplication': ('karatsuba(1234, 5678)', 7006652),
    'closest-pair-divide-and-conquer': ('closest_pair([(0,0),(5,5),(1,0),(8,8)])', 1.0),
    'strassen-matrix-multiplication': ('strassen([[1,2],[3,4]], [[5,6],[7,8]])', [[19,22],[43,50]]),
    'branch-and-bound': ('branch_bound([2,3,4], [6,10,12], 6)', 18),
}
