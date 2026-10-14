from collections import Counter, deque
import heapq


def activities(intervals):
    selected, end = [], float('-inf')
    for left, right in sorted(intervals, key=lambda interval: interval[1]):
        if left >= end:
            selected.append([left, right])
            end = right
    return selected


def partition_intervals(intervals):
    """Half-open intervals: reuse a resource at its previous end time."""
    heap, assignments, count = [], [], 0
    for start, end in sorted(intervals):
        if heap and heap[0][0] <= start:
            previous_end, resource = heapq.heappop(heap)
        else:
            resource = count
            count += 1
        assignments.append(resource)
        heapq.heappush(heap, (end, resource))
    return [count, assignments]


def fractional(weights, values, capacity):
    total = 0.0
    for weight, value in sorted(zip(weights, values), key=lambda item: item[1] / item[0], reverse=True):
        taken = min(weight, capacity)
        total += value * taken / weight
        capacity -= taken
        if capacity == 0:
            break
    return total


def job_sequence(jobs):
    """(id, positive deadline, profit); one unit duration per job."""
    slots = [None] * (max((deadline for key, deadline, profit in jobs), default=0) + 1)
    total = 0
    for key, deadline, profit in sorted(jobs, key=lambda job: job[2], reverse=True):
        for time in range(deadline, 0, -1):
            if slots[time] is None and profit > 0:
                slots[time] = key
                total += profit
                break
    return [total, [key for key in slots[1:] if key is not None]]


def jump_game(a):
    farthest = 0
    for i, distance in enumerate(a):
        if i > farthest:
            return False
        farthest = max(farthest, i + distance)
    return True


def gas_station(gas, cost):
    total, current, start = 0, 0, 0
    for i, (fuel, expense) in enumerate(zip(gas, cost)):
        total += fuel - expense
        current += fuel - expense
        if current < 0:
            start, current = i + 1, 0
    return start if total >= 0 and start < len(gas) else -1


def arrows(intervals):
    selected, last = [], float('-inf')
    for left, right in sorted(intervals, key=lambda interval: interval[1]):
        if left > last:
            last = right
            selected.append(last)
    return selected


def set_cover(universe, sets):
    """Unweighted greedy approximation; returns selected input indices."""
    remaining, result = set(universe), []
    while remaining:
        best = max(range(len(sets)), key=lambda i: len(remaining & set(sets[i])))
        covered = remaining & set(sets[best])
        if not covered:
            raise ValueError('Universe cannot be covered')
        result.append(best)
        remaining -= covered
    return result


def optimal_merge(a):
    heap = list(a)
    heapq.heapify(heap)
    total = 0
    while len(heap) > 1:
        combined = heapq.heappop(heap) + heapq.heappop(heap)
        total += combined
        heapq.heappush(heap, combined)
    return total


def reorganize(text):
    heap = [(-count, char) for char, count in Counter(text).items()]
    heapq.heapify(heap)
    previous, result = (0, ''), ''
    while heap:
        count, char = heapq.heappop(heap)
        result += char
        if previous[0] < 0:
            heapq.heappush(heap, previous)
        previous = (count + 1, char)
    return result if previous[0] == 0 else None


def cooldown(tasks, delay):
    heap = [-count for count in Counter(tasks).values()]
    heapq.heapify(heap)
    waiting, time = deque(), 0
    while heap or waiting:
        time += 1
        if heap:
            count = heapq.heappop(heap) + 1
            if count:
                waiting.append((time + delay, count))
        if waiting and waiting[0][0] == time:
            ready, count = waiting.popleft()
            heapq.heappush(heap, count)
    return time


def stable_matching(proposals, preferences):
    n = len(proposals)
    rank = [{person: index for index, person in enumerate(order)} for order in preferences]
    matches, next_choice, free = [-1] * n, [0] * n, deque(range(n))
    while free:
        person = free.popleft()
        recipient = proposals[person][next_choice[person]]
        next_choice[person] += 1
        previous = matches[recipient]
        if previous == -1 or rank[recipient][person] < rank[recipient][previous]:
            matches[recipient] = person
            if previous != -1:
                free.append(previous)
        else:
            free.append(person)
    return matches


def greedy_coins(coins, amount):
    """Optimal only for canonical coin systems; includes explicit remainder."""
    result = []
    for coin in sorted(coins, reverse=True):
        count, amount = divmod(amount, coin)
        result.extend([coin] * count)
    return [result, amount]


def cut_choices(n, edges):
    """Prim cut property; connected undirected weighted graph."""
    graph = [[] for _ in range(n)]
    for a, b, weight in edges:
        graph[a].append((weight, b))
        graph[b].append((weight, a))
    heap, seen, chosen = [(0, 0, -1)], set(), []
    while heap:
        weight, node, previous = heapq.heappop(heap)
        if node in seen:
            continue
        seen.add(node)
        if previous != -1:
            chosen.append([previous, node, weight])
        for cost, child in graph[node]:
            if child not in seen:
                heapq.heappush(heap, (cost, child, node))
    return chosen


DEMOS = {
    'activity-selection': ('activities([[1,3],[2,5],[3,4],[5,7]])', [[1,3],[3,4],[5,7]]),
    'interval-partitioning': ('partition_intervals([[0,3],[1,2],[3,4]])', [2,[0,1,1]]),
    'fractional-knapsack': ('fractional([10,20,30], [60,100,120], 50)', 240.0),
    'job-sequencing-with-deadlines': ("job_sequence([('A',2,100),('B',1,19),('C',2,27),('D',1,25)])", [127,['C','A']]),
    'jump-game': ('jump_game([2,3,1,1,4])', True),
    'gas-station-circuit': ('gas_station([1,2,3,4,5], [3,4,5,1,2])', 3),
    'minimum-arrow-interval-stabbing': ('arrows([[1,6],[2,8],[7,12],[10,16]])', [6,12]),
    'greedy-set-cover': ('set_cover([1,2,3,4], [[1,2],[2,3,4],[1]])', [1,0]),
    'optimal-merge-pattern': ('optimal_merge([2,3,4])', 14),
    'reorganize-string': ("reorganize('aab')", 'aba'),
    'task-cooldown-scheduling': ("cooldown('AAABBB', 2)", 8),
    'gale-shapley-stable-matching': ('stable_matching([[0,1],[0,1]], [[1,0],[0,1]])', [1,0]),
    'greedy-coin-change': ('greedy_coins([1,5,10,25], 36)', [[25,10,1],0]),
    'minimum-spanning-tree-cut-choices': ('cut_choices(3, [(0,1,1),(1,2,2),(0,2,5)])', [[0,1,1],[1,2,2]]),
}
