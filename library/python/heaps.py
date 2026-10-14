import heapq


def heapify(values):
    heap = list(values)
    def down(root):
        while 2 * root + 1 < len(heap):
            child = 2 * root + 1
            if child + 1 < len(heap) and heap[child + 1] < heap[child]:
                child += 1
            if heap[root] <= heap[child]:
                break
            heap[root], heap[child] = heap[child], heap[root]
            root = child
    for root in range(len(heap) // 2 - 1, -1, -1):
        down(root)
    return heap


def heap_insert(heap, value):
    heap = list(heap)
    heap.append(value)
    child = len(heap) - 1
    while child:
        parent = (child - 1) // 2
        if heap[parent] <= heap[child]:
            break
        heap[parent], heap[child] = heap[child], heap[parent]
        child = parent
    return heap


def heap_extract(heap):
    heap = list(heap)
    minimum, last = heap[0], heap.pop()
    if heap:
        heap[0] = last
        root = 0
        while 2 * root + 1 < len(heap):
            child = 2 * root + 1
            if child + 1 < len(heap) and heap[child + 1] < heap[child]:
                child += 1
            if heap[root] <= heap[child]:
                break
            heap[root], heap[child] = heap[child], heap[root]
            root = child
    return [minimum, heap]


def top_k(a, k):
    heap = []
    for value in a:
        heapq.heappush(heap, value)
        if len(heap) > k:
            heapq.heappop(heap)
    return sorted(heap, reverse=True)


def indexed_queue(updates):
    """Keyed decrease/update via explicit index map and heap repairs."""
    heap, positions = [], {}
    def swap(i, j):
        heap[i], heap[j] = heap[j], heap[i]
        positions[heap[i][1]], positions[heap[j][1]] = i, j
    for key, priority in updates:
        if key in positions:
            i = positions[key]
            heap[i] = [priority, key]
        else:
            i = len(heap)
            positions[key] = i
            heap.append([priority, key])
        while i and heap[i] < heap[(i - 1) // 2]:
            parent = (i - 1) // 2
            swap(i, parent)
            i = parent
        while 2 * i + 1 < len(heap):
            child = 2 * i + 1
            if child + 1 < len(heap) and heap[child + 1] < heap[child]:
                child += 1
            if heap[i] <= heap[child]:
                break
            swap(i, child)
            i = child
    return heap[0]


def running_median(a):
    lower, upper, result = [], [], []
    for value in a:
        heapq.heappush(lower, -value)
        heapq.heappush(upper, -heapq.heappop(lower))
        if len(upper) > len(lower):
            heapq.heappush(lower, -heapq.heappop(upper))
        result.append(-lower[0] if len(lower) > len(upper) else (-lower[0] + upper[0]) / 2)
    return result


def merge_sorted_lists(lists):
    heap = [(a[0], i, 0) for i, a in enumerate(lists) if a]
    heapq.heapify(heap)
    result = []
    while heap:
        value, i, j = heapq.heappop(heap)
        result.append(value)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return result


def schedule(tasks):
    """Tasks are (arrival, duration, id); shortest available job first."""
    tasks = sorted(tasks)
    heap, time, i, order = [], 0, 0, []
    while i < len(tasks) or heap:
        if not heap:
            time = max(time, tasks[i][0])
        while i < len(tasks) and tasks[i][0] <= time:
            arrival, duration, key = tasks[i]
            heapq.heappush(heap, (duration, key))
            i += 1
        duration, key = heapq.heappop(heap)
        order.append(key)
        time += duration
    return order


def covering_range(lists):
    """Every input list is sorted and nonempty."""
    heap = [(a[0], i, 0) for i, a in enumerate(lists)]
    heapq.heapify(heap)
    maximum = max(a[0] for a in lists)
    best = [heap[0][0], maximum]
    while heap:
        minimum, i, j = heapq.heappop(heap)
        if maximum - minimum < best[1] - best[0]:
            best = [minimum, maximum]
        if j + 1 == len(lists[i]):
            break
        value = lists[i][j + 1]
        maximum = max(maximum, value)
        heapq.heappush(heap, (value, i, j + 1))
    return best


def huffman(frequencies):
    heap = [(weight, i, symbol) for i, (symbol, weight) in enumerate(frequencies.items())]
    heapq.heapify(heap)
    serial = len(heap)
    while len(heap) > 1:
        a, _, left = heapq.heappop(heap)
        b, _, right = heapq.heappop(heap)
        heapq.heappush(heap, (a + b, serial, [left, right]))
        serial += 1
    codes = {}
    def visit(node, prefix):
        if isinstance(node, str):
            codes[node] = prefix or '0'
        else:
            visit(node[0], prefix + '0')
            visit(node[1], prefix + '1')
    if heap:
        visit(heap[0][2], '')
    return codes


DEMOS = {
    'heapify': ('heapify([5,3,1,4,2])', [1,2,5,4,3]),
    'heap-insertion': ('heap_insert([1,3,2], 0)', [0,1,2,3]),
    'heap-extraction': ('heap_extract([1,3,2,4])', [1,[2,3,4]]),
    'top-k-with-a-min-heap': ('top_k([3,1,5,2,4], 2)', [5,4]),
    'kth-largest-selection-with-a-heap': ('top_k([3,1,5,2,4], 2)[-1]', 4),
    'indexed-priority-queue': ("indexed_queue([('a',5),('b',3),('a',1)])", [1,'a']),
    'two-heap-running-median': ('running_median([1,5,2,4])', [1,3,2,3]),
    'merge-k-sorted-lists': ('merge_sorted_lists([[1,4],[2,5],[3,6]])', [1,2,3,4,5,6]),
    'priority-task-scheduling': ("schedule([(0,3,'A'),(1,1,'B'),(2,2,'C')])", ['A','B','C']),
    'smallest-covering-range': ('covering_range([[4,10,15,24],[0,9,12,20],[5,18,22,30]])', [20,24]),
    'huffman-coding': ("huffman({'a':5,'b':2,'c':1})", {'a':'1','b':'01','c':'00'}),
}
