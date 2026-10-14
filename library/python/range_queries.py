import math


class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
    def find(self, node):
        if self.parent[node] != node:
            self.parent[node] = self.find(self.parent[node])
        return self.parent[node]
    def union(self, a, b):
        a, b = self.find(a), self.find(b)
        if a != b:
            if self.size[a] < self.size[b]:
                a, b = b, a
            self.parent[b] = a
            self.size[a] += self.size[b]


def dsu_demo(n, pairs):
    dsu = DSU(n)
    for a, b in pairs:
        dsu.union(a, b)
    return [dsu.find(i) for i in range(n)]


class RollbackDSU:
    def __init__(self, n):
        self.parent, self.size, self.history = list(range(n)), [1] * n, []
    def find(self, node):
        while node != self.parent[node]:
            node = self.parent[node]
        return node
    def union(self, a, b):
        a, b = self.find(a), self.find(b)
        if a == b:
            return
        if self.size[a] < self.size[b]:
            a, b = b, a
        self.history.append((b, a, self.size[a]))
        self.parent[b] = a
        self.size[a] += self.size[b]
    def rollback(self, snapshot):
        while len(self.history) > snapshot:
            child, root, old_size = self.history.pop()
            self.parent[child] = child
            self.size[root] = old_size


def rollback_demo():
    dsu = RollbackDSU(3)
    dsu.union(0, 1)
    snapshot = len(dsu.history)
    dsu.union(1, 2)
    before = dsu.find(0) == dsu.find(2)
    dsu.rollback(snapshot)
    return [before, dsu.find(0) == dsu.find(2)]


class WeightedDSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.delta = [0] * n
    def find(self, node):
        if self.parent[node] != node:
            old = self.parent[node]
            self.parent[node] = self.find(old)
            self.delta[node] += self.delta[old]
        return self.parent[node]
    def union(self, a, b, difference):
        """Impose potential[b] - potential[a] = difference."""
        first, second = self.find(a), self.find(b)
        if first == second:
            return self.delta[b] - self.delta[a] == difference
        self.parent[second] = first
        self.delta[second] = difference + self.delta[a] - self.delta[b]
        return True
    def difference(self, a, b):
        if self.find(a) != self.find(b):
            return None
        return self.delta[b] - self.delta[a]


def weighted_demo():
    dsu = WeightedDSU(3)
    dsu.union(0, 1, 3)
    dsu.union(1, 2, 4)
    return dsu.difference(0, 2)


def dynamic_connectivity(n, operations):
    """Offline segment tree over edge lifetimes + rollback DSU.
    Operations: ('add'|'remove'|'query', a, b); edges cannot be added twice.
    """
    count, active = len(operations), {}
    intervals = []
    for time, (kind, a, b) in enumerate(operations):
        edge = tuple(sorted((a, b)))
        if kind == 'add':
            active[edge] = time
        elif kind == 'remove':
            intervals.append((active.pop(edge), time, edge))
    intervals += [(start, count, edge) for edge, start in active.items()]
    tree = [[] for _ in range(max(1, 4 * count))]
    def add(node, left, right, start, end, edge):
        if end <= left or right <= start:
            return
        if start <= left and right <= end:
            tree[node].append(edge)
            return
        mid = (left + right) // 2
        add(2 * node, left, mid, start, end, edge)
        add(2 * node + 1, mid, right, start, end, edge)
    for start, end, edge in intervals:
        add(1, 0, count, start, end, edge)
    dsu, result = RollbackDSU(n), []
    def visit(node, left, right):
        snapshot = len(dsu.history)
        for a, b in tree[node]:
            dsu.union(a, b)
        if right - left == 1:
            kind, a, b = operations[left]
            if kind == 'query':
                result.append(dsu.find(a) == dsu.find(b))
        else:
            mid = (left + right) // 2
            visit(2 * node, left, mid)
            visit(2 * node + 1, mid, right)
        dsu.rollback(snapshot)
    if count:
        visit(1, 0, count)
    return result


class Fenwick:
    def __init__(self, values):
        self.bit = [0] * (len(values) + 1)
        for i, value in enumerate(values):
            self.add(i, value)
    def add(self, index, value):
        index += 1
        while index < len(self.bit):
            self.bit[index] += value
            index += index & -index
    def prefix(self, end):
        total = 0
        while end:
            total += self.bit[end]
            end -= end & -end
        return total
    def query(self, left, right):
        return self.prefix(right) - self.prefix(left)


def fenwick_demo():
    tree = Fenwick([1,2,3,4])
    tree.add(1, 3)
    return tree.query(1, 4)


class SegmentTree:
    def __init__(self, values):
        self.n = len(values)
        self.tree = [0] * self.n + list(values)
        for i in range(self.n - 1, 0, -1):
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]
    def update(self, index, value):
        index += self.n
        self.tree[index] = value
        while index > 1:
            index //= 2
            self.tree[index] = self.tree[2 * index] + self.tree[2 * index + 1]
    def query(self, left, right):
        """Half-open range [left, right)."""
        left, right, total = left + self.n, right + self.n, 0
        while left < right:
            if left & 1:
                total += self.tree[left]
                left += 1
            if right & 1:
                right -= 1
                total += self.tree[right]
            left //= 2
            right //= 2
        return total


def segment_demo():
    tree = SegmentTree([1,2,3,4])
    tree.update(1, 5)
    return tree.query(1, 4)


class LazyTree:
    def __init__(self, values):
        self.n = len(values)
        self.tree, self.lazy = [0] * (4 * self.n), [0] * (4 * self.n)
        def build(node, left, right):
            if right - left == 1:
                self.tree[node] = values[left]
            else:
                mid = (left + right) // 2
                build(2 * node, left, mid)
                build(2 * node + 1, mid, right)
                self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]
        build(1, 0, self.n)
    def apply(self, node, left, right, delta):
        self.tree[node] += (right - left) * delta
        self.lazy[node] += delta
    def push(self, node, left, right):
        mid = (left + right) // 2
        self.apply(2 * node, left, mid, self.lazy[node])
        self.apply(2 * node + 1, mid, right, self.lazy[node])
        self.lazy[node] = 0
    def range(self, start, end, delta=None):
        def visit(node, left, right):
            if end <= left or right <= start:
                return 0
            if start <= left and right <= end:
                if delta is not None:
                    self.apply(node, left, right, delta)
                return self.tree[node]
            self.push(node, left, right)
            mid = (left + right) // 2
            total = visit(2 * node, left, mid) + visit(2 * node + 1, mid, right)
            self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]
            return total
        return visit(1, 0, self.n)


def lazy_demo():
    tree = LazyTree([1,2,3,4])
    tree.range(1, 3, 5)
    return tree.range(0, 4)


def persistent_tree(values, index, value):
    """Path-copying point update; immutable tuples share unchanged branches."""
    def build(left, right):
        if right - left == 1:
            return (values[left], None, None)
        mid = (left + right) // 2
        a, b = build(left, mid), build(mid, right)
        return (a[0] + b[0], a, b)
    def update(node, left, right):
        if right - left == 1:
            return (value, None, None)
        mid, a, b = (left + right) // 2, node[1], node[2]
        if index < mid:
            a = update(a, left, mid)
        else:
            b = update(b, mid, right)
        return (a[0] + b[0], a, b)
    root = build(0, len(values))
    modified = update(root, 0, len(values))
    return [root[0], modified[0]]


def sparse_min(values, left, right):
    table = [list(values)]
    length = 2
    while length <= len(values):
        previous = table[-1]
        table.append([min(previous[i], previous[i + length // 2]) for i in range(len(values) - length + 1)])
        length *= 2
    level = (right - left).bit_length() - 1
    return min(table[level][left], table[level][right - (1 << level)])


def sqrt_sum(values, queries):
    block = max(1, math.isqrt(len(values)))
    totals = [0] * ((len(values) + block - 1) // block)
    for i, value in enumerate(values):
        totals[i // block] += value
    answers = []
    for left, right in queries:
        total = 0
        while left < right:
            if left % block == 0 and left + block <= right:
                total += totals[left // block]
                left += block
            else:
                total += values[left]
                left += 1
        answers.append(total)
    return answers


def mo_distinct(values, queries):
    block = max(1, math.isqrt(len(values)))
    order = sorted(range(len(queries)), key=lambda i: (queries[i][0] // block, queries[i][1] if queries[i][0] // block % 2 == 0 else -queries[i][1]))
    left, right, distinct, counts = 0, 0, 0, {}
    result = [0] * len(queries)
    def add(index):
        nonlocal distinct
        value = values[index]
        if counts.get(value, 0) == 0:
            distinct += 1
        counts[value] = counts.get(value, 0) + 1
    def remove(index):
        nonlocal distinct
        value = values[index]
        counts[value] -= 1
        if counts[value] == 0:
            distinct -= 1
    for query in order:
        start, end = queries[query]
        while left > start:
            left -= 1
            add(left)
        while right < end:
            add(right)
            right += 1
        while left < start:
            remove(left)
            left += 1
        while right > end:
            right -= 1
            remove(right)
        result[query] = distinct
    return result


class WaveletTree:
    def __init__(self, values, low, high):
        self.low, self.high, self.prefix = low, high, [0]
        self.left = self.right = None
        if low == high or not values:
            return
        mid = (low + high) // 2
        a, b = [], []
        for value in values:
            if value <= mid:
                a.append(value)
            else:
                b.append(value)
            self.prefix.append(len(a))
        self.left = WaveletTree(a, low, mid)
        self.right = WaveletTree(b, mid + 1, high)
    def kth(self, left, right, k):
        """One-based k in the half-open subarray [left,right)."""
        if self.low == self.high:
            return self.low
        before, within = self.prefix[left], self.prefix[right] - self.prefix[left]
        if k <= within:
            return self.left.kth(before, before + within, k)
        return self.right.kth(left - before, right - self.prefix[right], k - within)


def wavelet_demo():
    tree = WaveletTree([3,1,4,2], 1, 4)
    return tree.kth(0, 4, 2)


def compress(values):
    ranks = {value: i for i, value in enumerate(sorted(set(values)))}
    return [ranks[value] for value in values]


DEMOS = {
    'union-find-with-path-compression': ('dsu_demo(4, [(0,1),(2,3),(1,2)])', [0,0,0,0]),
    'union-by-rank-or-size': ('dsu_demo(4, [(0,1),(2,3)])', [0,0,2,2]),
    'rollback-dsu': ('rollback_demo()', [True,False]),
    'weighted-dsu': ('weighted_demo()', 7),
    'offline-dynamic-connectivity': ("dynamic_connectivity(3, [('add',0,1),('query',0,2),('add',1,2),('query',0,2),('remove',0,1),('query',0,2)])", [False,True,False]),
    'fenwick-tree': ('fenwick_demo()', 12),
    'segment-tree': ('segment_demo()', 12),
    'lazy-propagation': ('lazy_demo()', 20),
    'persistent-segment-tree': ('persistent_tree([1,2,3,4], 1, 5)', [10,13]),
    'sparse-table': ('sparse_min([5,2,4,1,3], 1, 4)', 1),
    'square-root-decomposition': ('sqrt_sum([1,2,3,4,5], [(0,5),(1,3)])', [15,5]),
    'mo-s-algorithm': ('mo_distinct([1,2,1,3], [(0,3),(1,4)])', [2,3]),
    'wavelet-tree': ('wavelet_demo()', 2),
    'coordinate-compression': ('compress([100,20,100,50])', [2,0,2,1]),
}
