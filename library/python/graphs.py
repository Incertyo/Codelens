from collections import deque
import heapq


def bfs(graph, start):
    queue, seen, order = deque([start]), {start}, []
    while queue:
        node = queue.popleft()
        order.append(node)
        for child in graph[node]:
            if child not in seen:
                seen.add(child)
                queue.append(child)
    return order


def dfs(graph, start):
    seen, order = set(), []
    def visit(node):
        seen.add(node)
        order.append(node)
        for child in graph[node]:
            if child not in seen:
                visit(child)
    visit(start)
    return order


def bidirectional(graph, start, goal):
    """Undirected unweighted graph; expand complete layers."""
    frontiers, distances = [{start}, {goal}], [{start: 0}, {goal: 0}]
    if start == goal:
        return 0
    while all(frontiers):
        side = 0 if len(frontiers[0]) <= len(frontiers[1]) else 1
        next_layer, best = set(), None
        for node in frontiers[side]:
            for child in graph[node]:
                if child not in distances[side]:
                    distances[side][child] = distances[side][node] + 1
                    next_layer.add(child)
                if child in distances[1 - side]:
                    candidate = distances[side][child] + distances[1 - side][child]
                    best = candidate if best is None else min(best, candidate)
        if best is not None:
            return best
        frontiers[side] = next_layer
    return None


def flood_fill(grid, row, col, color):
    grid = [list(line) for line in grid]
    original = grid[row][col]
    if original == color:
        return grid
    queue = deque([(row, col)])
    grid[row][col] = color
    while queue:
        r, c = queue.popleft()
        for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] == original:
                grid[nr][nc] = color
                queue.append((nr, nc))
    return grid


def kahn(graph):
    indegree = [0] * len(graph)
    for neighbors in graph:
        for child in neighbors:
            indegree[child] += 1
    queue = deque(i for i, degree in enumerate(indegree) if degree == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for child in graph[node]:
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)
    if len(order) != len(graph):
        raise ValueError('Directed cycle')
    return order


def dfs_topological(graph):
    color, order = [0] * len(graph), []
    def visit(node):
        if color[node] == 1:
            raise ValueError('Directed cycle')
        if color[node] == 2:
            return
        color[node] = 1
        for child in graph[node]:
            visit(child)
        color[node] = 2
        order.append(node)
    for node in range(len(graph)):
        visit(node)
    return list(reversed(order))


def bipartite(graph):
    color = [-1] * len(graph)
    for start in range(len(graph)):
        if color[start] != -1:
            continue
        color[start] = 0
        queue = deque([start])
        while queue:
            node = queue.popleft()
            for child in graph[node]:
                if color[child] == -1:
                    color[child] = 1 - color[node]
                    queue.append(child)
                elif color[child] == color[node]:
                    return False
    return True


def directed_cycle(graph):
    try:
        dfs_topological(graph)
        return False
    except ValueError:
        return True


def weighted_graph(n, edges, undirected=False):
    graph = [[] for _ in range(n)]
    for a, b, weight in edges:
        graph[a].append((b, weight))
        if undirected:
            graph[b].append((a, weight))
    return graph


def dijkstra(n, edges, starts):
    """Nonnegative weights; starts is a list of source vertices."""
    graph = weighted_graph(n, edges)
    distance, heap = [float('inf')] * n, []
    for start in starts:
        distance[start] = 0
        heapq.heappush(heap, (0, start))
    while heap:
        cost, node = heapq.heappop(heap)
        if cost != distance[node]:
            continue
        for child, weight in graph[node]:
            candidate = cost + weight
            if candidate < distance[child]:
                distance[child] = candidate
                heapq.heappush(heap, (candidate, child))
    return distance


def bellman_ford(n, edges, source):
    distance = [float('inf')] * n
    distance[source] = 0
    for _ in range(n - 1):
        changed = False
        for a, b, weight in edges:
            if distance[a] + weight < distance[b]:
                distance[b] = distance[a] + weight
                changed = True
        if not changed:
            break
    if any(distance[a] + weight < distance[b] for a, b, weight in edges):
        raise ValueError('Reachable negative cycle')
    return distance


def floyd(n, edges):
    distance = [[float('inf')] * n for _ in range(n)]
    for i in range(n):
        distance[i][i] = 0
    for a, b, weight in edges:
        distance[a][b] = min(distance[a][b], weight)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                distance[i][j] = min(distance[i][j], distance[i][k] + distance[k][j])
    return distance


def johnson(n, edges):
    potential = bellman_ford(n + 1, list(edges) + [(n, i, 0) for i in range(n)], n)
    reweighted = [(a, b, weight + potential[a] - potential[b]) for a, b, weight in edges]
    result = []
    for source in range(n):
        row = dijkstra(n, reweighted, [source])
        result.append([cost - potential[source] + potential[i] for i, cost in enumerate(row)])
    return result


def zero_one(n, edges, source):
    graph = weighted_graph(n, edges)
    distance, queue = [float('inf')] * n, deque([source])
    distance[source] = 0
    while queue:
        node = queue.popleft()
        for child, weight in graph[node]:
            if distance[node] + weight < distance[child]:
                distance[child] = distance[node] + weight
                if weight == 0:
                    queue.appendleft(child)
                else:
                    queue.append(child)
    return distance


def dag_paths(n, edges, source):
    graph = weighted_graph(n, edges)
    order = kahn([[child for child, weight in neighbors] for neighbors in graph])
    distance = [float('inf')] * n
    distance[source] = 0
    for node in order:
        for child, weight in graph[node]:
            distance[child] = min(distance[child], distance[node] + weight)
    return distance


def astar(n, edges, start, goal, heuristic):
    """Nonnegative edges, admissible heuristic with heuristic[goal] == 0;
    improved nodes may reopen.
    """
    graph = weighted_graph(n, edges)
    distance = [float('inf')] * n
    distance[start] = 0
    heap = [(heuristic[start], 0, start)]
    while heap:
        estimate, cost, node = heapq.heappop(heap)
        if cost != distance[node]:
            continue
        if node == goal:
            return cost
        for child, weight in graph[node]:
            candidate = cost + weight
            if candidate < distance[child]:
                distance[child] = candidate
                heapq.heappush(heap, (candidate + heuristic[child], candidate, child))
    return None


class Components:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n
    def find(self, node):
        while node != self.parent[node]:
            self.parent[node] = self.parent[self.parent[node]]
            node = self.parent[node]
        return node
    def union(self, a, b):
        a, b = self.find(a), self.find(b)
        if a == b:
            return False
        if self.size[a] < self.size[b]:
            a, b = b, a
        self.parent[b] = a
        self.size[a] += self.size[b]
        return True


def kruskal(n, edges):
    components, total = Components(n), 0
    for a, b, weight in sorted(edges, key=lambda e: e[2]):
        if components.union(a, b):
            total += weight
    return total


def prim(n, edges):
    graph, seen, total = weighted_graph(n, edges, True), set(), 0
    for start in range(n):
        if start in seen:
            continue
        heap = [(0, start)]
        while heap:
            cost, node = heapq.heappop(heap)
            if node in seen:
                continue
            seen.add(node)
            total += cost
            for child, weight in graph[node]:
                if child not in seen:
                    heapq.heappush(heap, (weight, child))
    return total


def boruvka(n, edges):
    components, total = Components(n), 0
    while True:
        cheapest = {}
        for a, b, weight in edges:
            first, second = components.find(a), components.find(b)
            if first == second:
                continue
            for root in (first, second):
                if root not in cheapest or weight < cheapest[root][2]:
                    cheapest[root] = (a, b, weight)
        changed = False
        for a, b, weight in cheapest.values():
            if components.union(a, b):
                total += weight
                changed = True
        if not changed:
            return total


def tarjan(graph):
    index, low, stack, active, result = {}, {}, [], set(), []
    def visit(node):
        index[node] = low[node] = len(index)
        stack.append(node)
        active.add(node)
        for child in graph[node]:
            if child not in index:
                visit(child)
                low[node] = min(low[node], low[child])
            elif child in active:
                low[node] = min(low[node], index[child])
        if low[node] == index[node]:
            component = []
            while True:
                child = stack.pop()
                active.remove(child)
                component.append(child)
                if child == node:
                    break
            result.append(sorted(component))
    for node in range(len(graph)):
        if node not in index:
            visit(node)
    return sorted(result)


def kosaraju(graph):
    seen, order, reversed_graph = set(), [], [[] for _ in graph]
    for node, neighbors in enumerate(graph):
        for child in neighbors:
            reversed_graph[child].append(node)
    def finish(node):
        seen.add(node)
        for child in graph[node]:
            if child not in seen:
                finish(child)
        order.append(node)
    for node in range(len(graph)):
        if node not in seen:
            finish(node)
    seen.clear()
    result = []
    def collect(node, component):
        seen.add(node)
        component.append(node)
        for child in reversed_graph[node]:
            if child not in seen:
                collect(child, component)
    for node in reversed(order):
        if node not in seen:
            component = []
            collect(node, component)
            result.append(sorted(component))
    return sorted(result)


def separators(n, edges):
    """Undirected multigraph; parent edge identity handles parallel edges."""
    graph = [[] for _ in range(n)]
    for identity, (a, b) in enumerate(edges):
        graph[a].append((b, identity))
        graph[b].append((a, identity))
    tin, low, bridges, articulation, timer = [-1] * n, [0] * n, [], set(), 0
    def visit(node, parent_edge):
        nonlocal timer
        tin[node] = low[node] = timer
        timer += 1
        children = 0
        for child, identity in graph[node]:
            if identity == parent_edge:
                continue
            if tin[child] != -1:
                low[node] = min(low[node], tin[child])
            else:
                visit(child, identity)
                low[node] = min(low[node], low[child])
                children += 1
                if low[child] > tin[node]:
                    bridges.append(sorted([node, child]))
                if parent_edge != -1 and low[child] >= tin[node]:
                    articulation.add(node)
        if parent_edge == -1 and children > 1:
            articulation.add(node)
    for node in range(n):
        if tin[node] == -1:
            visit(node, -1)
    return [sorted(bridges), sorted(articulation)]


def hierholzer(n, edges, start):
    """Directed edges satisfying Euler-trail degree and connectivity conditions."""
    graph = [[] for _ in range(n)]
    for a, b in reversed(edges):
        graph[a].append(b)
    stack, trail = [start], []
    while stack:
        node = stack[-1]
        if graph[node]:
            stack.append(graph[node].pop())
        else:
            trail.append(stack.pop())
    if len(trail) != len(edges) + 1:
        raise ValueError('Edges not reachable from Euler start')
    return list(reversed(trail))


def capacity_matrix(n, edges):
    residual = [[0] * n for _ in range(n)]
    for a, b, capacity in edges:
        residual[a][b] += capacity
    return residual


def augmenting_flow(n, edges, source, sink, breadth_first):
    """Integral nonnegative capacities; distinct source and sink."""
    residual, total = capacity_matrix(n, edges), 0
    while True:
        parent, frontier = [-1] * n, deque([source])
        parent[source] = source
        while frontier and parent[sink] == -1:
            node = frontier.popleft() if breadth_first else frontier.pop()
            for child in range(n):
                if residual[node][child] > 0 and parent[child] == -1:
                    parent[child] = node
                    frontier.append(child)
        if parent[sink] == -1:
            return total
        flow, node = float('inf'), sink
        while node != source:
            flow = min(flow, residual[parent[node]][node])
            node = parent[node]
        node = sink
        while node != source:
            previous = parent[node]
            residual[previous][node] -= flow
            residual[node][previous] += flow
            node = previous
        total += flow


def dinic(n, edges, source, sink):
    residual, total = capacity_matrix(n, edges), 0
    while True:
        level, queue = [-1] * n, deque([source])
        level[source] = 0
        while queue:
            node = queue.popleft()
            for child in range(n):
                if residual[node][child] > 0 and level[child] == -1:
                    level[child] = level[node] + 1
                    queue.append(child)
        if level[sink] == -1:
            return total
        cursor = [0] * n
        def send(node, amount):
            if node == sink:
                return amount
            while cursor[node] < n:
                child = cursor[node]
                if residual[node][child] > 0 and level[child] == level[node] + 1:
                    pushed = send(child, min(amount, residual[node][child]))
                    if pushed:
                        residual[node][child] -= pushed
                        residual[child][node] += pushed
                        return pushed
                cursor[node] += 1
            return 0
        while True:
            pushed = send(source, float('inf'))
            if not pushed:
                break
            total += pushed


def push_relabel(n, edges, source, sink):
    residual = capacity_matrix(n, edges)
    height, excess = [0] * n, [0] * n
    height[source] = n
    for child in range(n):
        flow = residual[source][child]
        if child == source or flow == 0:
            continue
        residual[source][child] -= flow
        residual[child][source] += flow
        excess[child] += flow
        excess[source] -= flow
    while True:
        active = next((i for i in range(n) if i not in (source, sink) and excess[i] > 0), None)
        if active is None:
            return excess[sink]
        while excess[active] > 0:
            for child in range(n):
                if residual[active][child] > 0 and height[active] == height[child] + 1:
                    flow = min(excess[active], residual[active][child])
                    residual[active][child] -= flow
                    residual[child][active] += flow
                    excess[active] -= flow
                    excess[child] += flow
            if excess[active] > 0:
                height[active] = 1 + min(height[c] for c in range(n) if residual[active][c] > 0)


def min_cost_flow(n, edges, source, sink, requested):
    """Successive Bellman–Ford residual paths; no negative-cost residual cycles.
    Edges are (from, to, capacity, cost). Reverse edges have negative cost.
    """
    graph = [[] for _ in range(n)]
    for a, b, capacity, cost in edges:
        graph[a].append([b, capacity, cost, len(graph[b])])
        graph[b].append([a, 0, -cost, len(graph[a]) - 1])
    flow = total_cost = 0
    while flow < requested:
        distance, parent = [float('inf')] * n, [None] * n
        distance[source] = 0
        for _ in range(n - 1):
            changed = False
            for node in range(n):
                for index, (child, capacity, cost, reverse) in enumerate(graph[node]):
                    if capacity and distance[node] + cost < distance[child]:
                        distance[child] = distance[node] + cost
                        parent[child] = (node, index)
                        changed = True
            if not changed:
                break
        if parent[sink] is None:
            break
        amount, node = requested - flow, sink
        while node != source:
            previous, index = parent[node]
            amount = min(amount, graph[previous][index][1])
            node = previous
        node = sink
        while node != source:
            previous, index = parent[node]
            edge = graph[previous][index]
            edge[1] -= amount
            graph[node][edge[3]][1] += amount
            node = previous
        flow += amount
        total_cost += amount * distance[sink]
    return [flow, total_cost]


def hopcroft_karp(graph, right_size):
    """Adjacency from left vertices to zero-based right vertices."""
    left_match, right_match = [-1] * len(graph), [-1] * right_size
    total = 0
    while True:
        distance, queue = [-1] * len(graph), deque()
        shortest = float('inf')
        for node in range(len(graph)):
            if left_match[node] == -1:
                distance[node] = 0
                queue.append(node)
        while queue:
            node = queue.popleft()
            if distance[node] >= shortest:
                continue
            for child in graph[node]:
                other = right_match[child]
                if other == -1:
                    shortest = distance[node] + 1
                elif distance[other] == -1:
                    distance[other] = distance[node] + 1
                    queue.append(other)
        if shortest == float('inf'):
            return total
        def augment(node):
            for child in graph[node]:
                other = right_match[child]
                if (other == -1 and distance[node] + 1 == shortest) or (other != -1 and distance[other] == distance[node] + 1 and augment(other)):
                    left_match[node], right_match[child] = child, node
                    return True
            distance[node] = -1
            return False
        for node in range(len(graph)):
            if left_match[node] == -1 and augment(node):
                total += 1


def hungarian(cost):
    """Rectangular minimum-cost assignment with rows <= columns."""
    n, m = len(cost), len(cost[0])
    u, v, matching, way = [0] * (n + 1), [0] * (m + 1), [0] * (m + 1), [0] * (m + 1)
    for row in range(1, n + 1):
        matching[0], column = row, 0
        slack, used = [float('inf')] * (m + 1), [False] * (m + 1)
        while True:
            used[column] = True
            current = matching[column]
            delta, next_column = float('inf'), 0
            for j in range(1, m + 1):
                if not used[j]:
                    reduced = cost[current - 1][j - 1] - u[current] - v[j]
                    if reduced < slack[j]:
                        slack[j], way[j] = reduced, column
                    if slack[j] < delta:
                        delta, next_column = slack[j], j
            for j in range(m + 1):
                if used[j]:
                    u[matching[j]] += delta
                    v[j] -= delta
                else:
                    slack[j] -= delta
            column = next_column
            if matching[column] == 0:
                break
        while column:
            previous = way[column]
            matching[column] = matching[previous]
            column = previous
    assignment = [-1] * n
    for j in range(1, m + 1):
        if matching[j]:
            assignment[matching[j] - 1] = j - 1
    return [sum(cost[i][assignment[i]] for i in range(n)), assignment]


def blossom(graph):
    """Edmonds maximum-cardinality matching for simple undirected graphs.
    Odd cycles are contracted into bases during alternating-tree BFS.
    """
    n, match = len(graph), [-1] * len(graph)
    def search(root):
        parent, base, seen, queue = [-1] * n, list(range(n)), [False] * n, deque([root])
        seen[root] = True
        def common_base(a, b):
            ancestors = set()
            while True:
                a = base[a]
                ancestors.add(a)
                if match[a] == -1:
                    break
                a = parent[match[a]]
            while base[b] not in ancestors:
                b = parent[match[base[b]]]
            return base[b]
        def mark_path(node, ancestor, child, contracted):
            while base[node] != ancestor:
                contracted.add(base[node])
                contracted.add(base[match[node]])
                parent[node] = child
                child = match[node]
                node = parent[match[node]]
        while queue:
            node = queue.popleft()
            for child in graph[node]:
                if base[node] == base[child] or match[node] == child:
                    continue
                if child == root or (match[child] != -1 and parent[match[child]] != -1):
                    ancestor = common_base(node, child)
                    contracted = set()
                    mark_path(node, ancestor, child, contracted)
                    mark_path(child, ancestor, node, contracted)
                    for i in range(n):
                        if base[i] in contracted:
                            base[i] = ancestor
                            if not seen[i]:
                                seen[i] = True
                                queue.append(i)
                elif parent[child] == -1:
                    parent[child] = node
                    if match[child] == -1:
                        endpoint = child
                        while endpoint != -1:
                            previous = parent[endpoint]
                            following = match[previous] if previous != -1 else -1
                            match[endpoint] = previous
                            if previous != -1:
                                match[previous] = endpoint
                            endpoint = following
                        return True
                    child = match[child]
                    seen[child] = True
                    queue.append(child)
        return False
    for root in range(n):
        if match[root] == -1:
            search(root)
    return sum(partner != -1 for partner in match) // 2


def stoer_wagner(n, edges):
    """Undirected graph with nonnegative weights, n >= 2."""
    weights = [[0] * n for _ in range(n)]
    for a, b, weight in edges:
        if a != b:
            weights[a][b] += weight
            weights[b][a] += weight
    vertices, best = list(range(n)), float('inf')
    while len(vertices) > 1:
        added, score, previous = set(), [0] * n, None
        for phase in range(len(vertices)):
            selected = max((v for v in vertices if v not in added), key=lambda v: score[v])
            if phase == len(vertices) - 1:
                best = min(best, score[selected])
                for vertex in vertices:
                    if vertex not in (selected, previous):
                        weights[previous][vertex] += weights[selected][vertex]
                        weights[vertex][previous] = weights[previous][vertex]
                vertices.remove(selected)
                break
            added.add(selected)
            for vertex in vertices:
                if vertex not in added:
                    score[vertex] += weights[selected][vertex]
            previous = selected
    return best


DEMOS = {
    'breadth-first-search': ('bfs([[1,2],[3],[],[]], 0)', [0,1,2,3]),
    'depth-first-search': ('dfs([[1,2],[3],[],[]], 0)', [0,1,3,2]),
    'bidirectional-bfs': ('bidirectional([[1],[0,2],[1,3],[2]], 0, 3)', 3),
    'flood-fill': ('flood_fill([[1,1,0],[1,0,0]], 0, 0, 2)', [[2,2,0],[2,0,0]]),
    'kahn-topological-sort': ('kahn([[1,2],[3],[3],[]])', [0,1,2,3]),
    'dfs-topological-sort': ('dfs_topological([[1,2],[3],[3],[]])', [0,2,1,3]),
    'bipartite-coloring': ('bipartite([[1,3],[0,2],[1,3],[0,2]])', True),
    'directed-cycle-detection': ('directed_cycle([[1],[2],[0]])', True),
    'dijkstra-s-algorithm': ('dijkstra(4, [(0,1,2),(0,2,5),(1,2,1),(2,3,3)], [0])', [0,2,3,6]),
    'bellman-ford': ('bellman_ford(3, [(0,1,4),(0,2,5),(1,2,-2)], 0)', [0,4,2]),
    'floyd-warshall': ('floyd(3, [(0,1,2),(1,2,3),(2,0,1)])', [[0,2,5],[4,0,3],[1,3,0]]),
    'johnson-s-algorithm': ('johnson(3, [(0,1,-1),(1,2,2),(2,0,3)])', [[0,-1,1],[5,0,2],[3,2,0]]),
    '0-1-bfs': ('zero_one(3, [(0,1,1),(0,2,0),(2,1,0)], 0)', [0,0,0]),
    'dag-shortest-paths': ('dag_paths(3, [(0,1,4),(0,2,5),(1,2,-2)], 0)', [0,4,2]),
    'a-search': ('astar(4, [(0,1,2),(0,2,5),(1,2,1),(2,3,3)], 0, 3, [5,4,3,0])', 6),
    'multi-source-shortest-paths': ('dijkstra(4, [(0,1,2),(2,1,1),(1,3,3)], [0,2])', [0,1,0,4]),
    'kruskal-s-minimum-spanning-tree': ('kruskal(4, [(0,1,1),(1,2,2),(2,3,3),(0,3,8)])', 6),
    'prim-s-minimum-spanning-tree': ('prim(4, [(0,1,1),(1,2,2),(2,3,3),(0,3,8)])', 6),
    'bor-vka-s-minimum-spanning-tree': ('boruvka(4, [(0,1,1),(1,2,2),(2,3,3),(0,3,8)])', 6),
    'tarjan-strongly-connected-components': ('tarjan([[1],[2],[0,3],[]])', [[0,1,2],[3]]),
    'kosaraju-strongly-connected-components': ('kosaraju([[1],[2],[0,3],[]])', [[0,1,2],[3]]),
    'bridge-detection': ('separators(4, [(0,1),(1,2),(2,0),(1,3)])[0]', [[1,3]]),
    'articulation-points': ('separators(4, [(0,1),(1,2),(2,0),(1,3)])[1]', [1]),
    'hierholzer-euler-traversal': ('hierholzer(3, [(0,1),(1,2),(2,0)], 0)', [0,1,2,0]),
    'ford-fulkerson': ('augmenting_flow(4, [(0,1,3),(0,2,2),(1,2,1),(1,3,2),(2,3,3)], 0, 3, False)', 5),
    'edmonds-karp': ('augmenting_flow(4, [(0,1,3),(0,2,2),(1,2,1),(1,3,2),(2,3,3)], 0, 3, True)', 5),
    'dinic-s-algorithm': ('dinic(4, [(0,1,3),(0,2,2),(1,2,1),(1,3,2),(2,3,3)], 0, 3)', 5),
    'push-relabel': ('push_relabel(4, [(0,1,3),(0,2,2),(1,2,1),(1,3,2),(2,3,3)], 0, 3)', 5),
    'minimum-cost-flow': ('min_cost_flow(4, [(0,1,3,1),(0,2,2,2),(1,2,1,0),(1,3,2,1),(2,3,3,1)], 0, 3, 5)', [5,12]),
    'hopcroft-karp': ('hopcroft_karp([[0,1],[0],[1,2]], 3)', 3),
    'hungarian-assignment': ('hungarian([[4,1,3],[2,0,5],[3,2,2]])', [5,[1,0,2]]),
    'blossom-matching': ('blossom([[1,2],[0,2,3],[0,1],[1]])', 2),
    'stoer-wagner-minimum-cut': ('stoer_wagner(3, [(0,1,2),(1,2,3),(0,2,1)])', 3),
}
