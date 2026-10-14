import heapq
import math


def bubble(a):
    a = list(a)
    for end in range(len(a) - 1, 0, -1):
        changed = False
        for i in range(end):
            if a[i] > a[i + 1]:
                a[i], a[i + 1] = a[i + 1], a[i]
                changed = True
        if not changed:
            break
    return a


def insertion(a):
    a = list(a)
    for i in range(1, len(a)):
        value, j = a[i], i - 1
        while j >= 0 and a[j] > value:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = value
    return a


def selection(a):
    a = list(a)
    for i in range(len(a)):
        smallest = i
        for j in range(i + 1, len(a)):
            if a[j] < a[smallest]:
                smallest = j
        a[i], a[smallest] = a[smallest], a[i]
    return a


def merge(a, b):
    i, j, result = 0, 0, []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i])
            i += 1
        else:
            result.append(b[j])
            j += 1
    return result + a[i:] + b[j:]


def merge_sort(a):
    if len(a) < 2:
        return list(a)
    mid = len(a) // 2
    return merge(merge_sort(a[:mid]), merge_sort(a[mid:]))


def quicksort(a):
    if len(a) < 2:
        return list(a)
    pivot = a[len(a) // 2]
    return quicksort([x for x in a if x < pivot]) + [x for x in a if x == pivot] + quicksort([x for x in a if x > pivot])


def sift_down(a, root, end):
    while 2 * root + 1 < end:
        child = 2 * root + 1
        if child + 1 < end and a[child + 1] > a[child]:
            child += 1
        if a[root] >= a[child]:
            break
        a[root], a[child] = a[child], a[root]
        root = child


def heapsort(a):
    a = list(a)
    for root in range(len(a) // 2 - 1, -1, -1):
        sift_down(a, root, len(a))
    for end in range(len(a) - 1, 0, -1):
        a[0], a[end] = a[end], a[0]
        sift_down(a, 0, end)
    return a


def shell_sort(a):
    a = list(a)
    gap = len(a) // 2
    while gap:
        for i in range(gap, len(a)):
            value, j = a[i], i
            while j >= gap and a[j - gap] > value:
                a[j] = a[j - gap]
                j -= gap
            a[j] = value
        gap //= 2
    return a


def timsort(a):
    """Educational natural-run Timsort: minrun extension and run-stack invariants.
    Merges use a linear merge rather than production galloping optimizations.
    """
    n = len(a)
    runs, i = [], 0
    minrun = n
    remainder = 0
    while minrun >= 64:
        remainder |= minrun & 1
        minrun >>= 1
    minrun += remainder
    def join(index):
        runs[index:index + 2] = [merge(runs[index], runs[index + 1])]
    while i < n:
        end = i + 1
        if end < n and a[end] < a[i]:
            while end < n and a[end] < a[end - 1]:
                end += 1
            run = list(reversed(a[i:end]))
        else:
            while end < n and a[end] >= a[end - 1]:
                end += 1
            run = list(a[i:end])
        extended = min(n, max(end, i + minrun))
        run = insertion(run + list(a[end:extended]))
        i = extended
        runs.append(run)
        while len(runs) >= 2:
            k = len(runs) - 2
            if (k > 0 and len(runs[k - 1]) <= len(runs[k]) + len(runs[k + 1])) or (k > 1 and len(runs[k - 2]) <= len(runs[k - 1]) + len(runs[k])):
                if len(runs[k - 1]) < len(runs[k + 1]):
                    k -= 1
            elif len(runs[k]) > len(runs[k + 1]):
                break
            join(k)
    while len(runs) > 1:
        join(len(runs) - 2)
    return runs[0] if runs else []


def introsort(a):
    def solve(values, depth):
        if len(values) <= 4:
            return insertion(values)
        if depth == 0:
            return heapsort(values)
        pivot = values[len(values) // 2]
        return solve([x for x in values if x < pivot], depth - 1) + [x for x in values if x == pivot] + solve([x for x in values if x > pivot], depth - 1)
    return solve(list(a), 2 * int(math.log2(max(1, len(a)))))


def counting(a):
    """Bounded integer range; also accepts negative integers."""
    if not a:
        return []
    low, high = min(a), max(a)
    counts = [0] * (high - low + 1)
    for value in a:
        counts[value - low] += 1
    result = []
    for i, count in enumerate(counts):
        result.extend([i + low] * count)
    return result


def radix(a):
    """LSD base-10 radix sort for nonnegative integers."""
    a = list(a)
    digit = 1
    while a and max(a) // digit:
        buckets = [[] for _ in range(10)]
        for value in a:
            buckets[value // digit % 10].append(value)
        a = [value for bucket in buckets for value in bucket]
        digit *= 10
    return a


def bucket_sort(a):
    """Values in [0, 1); insertion sort within buckets."""
    buckets = [[] for _ in a]
    for value in a:
        buckets[int(value * len(a))].append(value)
    return [value for bucket in buckets for value in insertion(bucket)]


def pigeonhole(a):
    if not a:
        return []
    low = min(a)
    holes = [[] for _ in range(max(a) - low + 1)]
    for value in a:
        holes[value - low].append(value)
    return [value for hole in holes for value in hole]


def quickselect(a, k):
    """Zero-based rank, 0 <= k < len(a)."""
    pivot = a[len(a) // 2]
    left, equal, right = [x for x in a if x < pivot], [x for x in a if x == pivot], [x for x in a if x > pivot]
    if k < len(left):
        return quickselect(left, k)
    if k < len(left) + len(equal):
        return pivot
    return quickselect(right, k - len(left) - len(equal))


def median_of_medians(a, k):
    if len(a) <= 5:
        return insertion(a)[k]
    medians = [insertion(a[i:i + 5])[len(a[i:i + 5]) // 2] for i in range(0, len(a), 5)]
    pivot = median_of_medians(medians, len(medians) // 2)
    left, equal, right = [x for x in a if x < pivot], [x for x in a if x == pivot], [x for x in a if x > pivot]
    if k < len(left):
        return median_of_medians(left, k)
    if k < len(left) + len(equal):
        return pivot
    return median_of_medians(right, k - len(left) - len(equal))


def k_merge(lists):
    heap = [(a[0], i, 0) for i, a in enumerate(lists) if a]
    heapq.heapify(heap)
    result = []
    while heap:
        value, i, j = heapq.heappop(heap)
        result.append(value)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return result


def inversions(a):
    if len(a) < 2:
        return list(a), 0
    mid = len(a) // 2
    left, x = inversions(a[:mid])
    right, y = inversions(a[mid:])
    i, j, count, result = 0, 0, x + y, []
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            count += len(left) - i
            j += 1
    return result + left[i:] + right[j:], count


def external_merge(a, chunk_size):
    """In-memory simulation of external runs; no filesystem access in the worker."""
    runs = [merge_sort(a[i:i + chunk_size]) for i in range(0, len(a), chunk_size)]
    return k_merge(runs)


DEMOS = {
    'bubble-sort': ('bubble([5,3,1,2])', [1,2,3,5]),
    'insertion-sort': ('insertion([5,3,1,2])', [1,2,3,5]),
    'selection-sort': ('selection([5,3,1,2])', [1,2,3,5]),
    'merge-sort': ('merge_sort([5,3,1,2])', [1,2,3,5]),
    'quicksort': ('quicksort([5,3,1,2])', [1,2,3,5]),
    'heapsort': ('heapsort([5,3,1,2])', [1,2,3,5]),
    'shell-sort': ('shell_sort([5,3,1,2])', [1,2,3,5]),
    'timsort': ('timsort([8,7,6,1,2,5,4,3])', [1,2,3,4,5,6,7,8]),
    'introsort': ('introsort([8,7,6,1,2,5,4,3])', [1,2,3,4,5,6,7,8]),
    'counting-sort': ('counting([3,-1,2,3])', [-1,2,3,3]),
    'radix-sort': ('radix([170,45,75,90,802,24,2,66])', [2,24,45,66,75,90,170,802]),
    'bucket-sort': ('bucket_sort([0.42,0.12,0.75,0.33])', [0.12,0.33,0.42,0.75]),
    'pigeonhole-sort': ('pigeonhole([3,-1,2,3])', [-1,2,3,3]),
    'quickselect': ('quickselect([7,2,9,1,5], 2)', 5),
    'median-of-medians': ('median_of_medians([8,7,6,5,4,3,2,1], 3)', 4),
    'k-way-merge': ('k_merge([[1,4],[2,5],[3,6]])', [1,2,3,4,5,6]),
    'merge-inversion-counting': ('inversions([3,1,2])[1]', 2),
    'external-merge-sort': ('external_merge([6,2,5,1,4,3], 2)', [1,2,3,4,5,6]),
}
