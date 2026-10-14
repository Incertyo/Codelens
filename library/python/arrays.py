from collections import Counter, deque


def pair_sum(a, target):
    left, right = 0, len(a) - 1
    while left < right:
        total = a[left] + a[right]
        if total == target:
            return [a[left], a[right]]
        if total < target:
            left += 1
        else:
            right -= 1
    return None


def three_sum(a):
    a = sorted(a)
    result = []
    for i in range(len(a) - 2):
        if i and a[i] == a[i - 1]:
            continue
        left, right = i + 1, len(a) - 1
        while left < right:
            total = a[i] + a[left] + a[right]
            if total == 0:
                result.append([a[i], a[left], a[right]])
                left += 1
                right -= 1
                while left < right and a[left] == a[left - 1]:
                    left += 1
            elif total < 0:
                left += 1
            else:
                right -= 1
    return result


def water_container(a):
    left, right, best = 0, len(a) - 1, 0
    while left < right:
        best = max(best, (right - left) * min(a[left], a[right]))
        if a[left] < a[right]:
            left += 1
        else:
            right -= 1
    return best


def dutch_flag(a):
    a = list(a)
    low, mid, high = 0, 0, len(a) - 1
    while mid <= high:
        if a[mid] == 0:
            a[low], a[mid] = a[mid], a[low]
            low += 1
            mid += 1
        elif a[mid] == 2:
            a[mid], a[high] = a[high], a[mid]
            high -= 1
        else:
            mid += 1
    return a


def deduplicate(a):
    a = list(a)
    write = 0
    for value in a:
        if write == 0 or value != a[write - 1]:
            a[write] = value
            write += 1
    return a[:write]


def move_zeroes(a):
    a = list(a)
    write = 0
    for read in range(len(a)):
        if a[read] != 0:
            a[write], a[read] = a[read], a[write]
            write += 1
    return a


def partition(a, pivot):
    a = list(a)
    write = 0
    for read in range(len(a)):
        if a[read] < pivot:
            a[write], a[read] = a[read], a[write]
            write += 1
    return a


def window_sum(a, k):
    if not 0 < k <= len(a):
        return []
    total = sum(a[:k])
    result = [total]
    for right in range(k, len(a)):
        total += a[right] - a[right - k]
        result.append(total)
    return result


def unique_substring(text):
    seen, left, best = {}, 0, 0
    for right, char in enumerate(text):
        left = max(left, seen.get(char, -1) + 1)
        seen[char] = right
        best = max(best, right - left + 1)
    return best


def minimum_window(text, pattern):
    if not pattern:
        return ''
    need = Counter(pattern)
    missing, left, best = len(pattern), 0, ''
    for right, char in enumerate(text):
        if need[char] > 0:
            missing -= 1
        need[char] -= 1
        while missing == 0:
            if not best or right - left + 1 < len(best):
                best = text[left:right + 1]
            need[text[left]] += 1
            if need[text[left]] > 0:
                missing += 1
            left += 1
    return best


def character_replacement(text, k):
    counts, left, best, largest = Counter(), 0, 0, 0
    for right, char in enumerate(text):
        counts[char] += 1
        largest = max(largest, counts[char])
        if right - left + 1 - largest > k:
            counts[text[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best


def window_max(a, k):
    if not 0 < k <= len(a):
        return []
    queue, result = deque(), []
    for i, value in enumerate(a):
        while queue and queue[0] <= i - k:
            queue.popleft()
        while queue and a[queue[-1]] <= value:
            queue.pop()
        queue.append(i)
        if i >= k - 1:
            result.append(a[queue[0]])
    return result


def at_most_k(a, k):
    if k < 0:
        return 0
    counts, left, total = Counter(), 0, 0
    for right, value in enumerate(a):
        counts[value] += 1
        while len(counts) > k:
            counts[a[left]] -= 1
            if counts[a[left]] == 0:
                del counts[a[left]]
            left += 1
        total += right - left + 1
    return total


def min_target_length(a, target):
    """Positive input values and a positive target."""
    left, total, best = 0, 0, len(a) + 1
    for right, value in enumerate(a):
        total += value
        while total >= target:
            best = min(best, right - left + 1)
            total -= a[left]
            left += 1
    return 0 if best > len(a) else best


def prefix_sums(a):
    prefix = [0]
    for value in a:
        prefix.append(prefix[-1] + value)
    return prefix


def prefix_grid(grid):
    if not grid:
        return [[0]]
    rows, cols = len(grid), len(grid[0])
    prefix = [[0] * (cols + 1) for _ in range(rows + 1)]
    for i in range(rows):
        for j in range(cols):
            prefix[i + 1][j + 1] = grid[i][j] + prefix[i][j + 1] + prefix[i + 1][j] - prefix[i][j]
    return prefix


def difference_array(n, updates):
    difference = [0] * (n + 1)
    for left, right, value in updates:
        difference[left] += value
        difference[right + 1] -= value
    total, result = 0, []
    for i in range(n):
        total += difference[i]
        result.append(total)
    return result


def prefix_xor(a):
    prefix = [0]
    for value in a:
        prefix.append(prefix[-1] ^ value)
    return prefix


def subarray_sum(a, target):
    frequencies, total, count = {0: 1}, 0, 0
    for value in a:
        total += value
        count += frequencies.get(total - target, 0)
        frequencies[total] = frequencies.get(total, 0) + 1
    return count


def product_except(a):
    result = [1] * len(a)
    left = 1
    for i in range(len(a)):
        result[i] = left
        left *= a[i]
    right = 1
    for i in range(len(a) - 1, -1, -1):
        result[i] *= right
        right *= a[i]
    return result


def kadane(a):
    """Nonempty input."""
    current = best = a[0]
    for value in a[1:]:
        current = max(value, current + value)
        best = max(best, current)
    return best


def circular_sum(a):
    best = kadane(a)
    if best < 0:
        return best
    return max(best, sum(a) + kadane([-x for x in a]))


def merge_intervals(intervals):
    result = []
    for left, right in sorted(intervals):
        if result and left <= result[-1][1]:
            result[-1][1] = max(result[-1][1], right)
        else:
            result.append([left, right])
    return result


def insert_interval(intervals, new):
    return merge_intervals(list(intervals) + [new])


def interval_intersection(a, b):
    i, j, result = 0, 0, []
    while i < len(a) and j < len(b):
        left, right = max(a[i][0], b[j][0]), min(a[i][1], b[j][1])
        if left <= right:
            result.append([left, right])
        if a[i][1] < b[j][1]:
            i += 1
        else:
            j += 1
    return result


def overlap_count(intervals):
    """Half-open, positive-length intervals: end events precede starts."""
    events = sorted([(l, 1) for l, r in intervals if l < r] + [(r, -1) for l, r in intervals if l < r])
    active = best = 0
    for position, delta in events:
        active += delta
        best = max(best, active)
    return best


DEMOS = {
    'two-pointer-pair-sum': ('pair_sum([1,2,4,7,11], 15)', [4,11]),
    'three-sum': ('three_sum([-1,0,1,2,-1,-4])', [[-1,-1,2],[-1,0,1]]),
    'container-with-most-water': ('water_container([1,8,6,2,5,4,8,3,7])', 49),
    'dutch-national-flag': ('dutch_flag([2,0,2,1,1,0])', [0,0,1,1,2,2]),
    'sorted-deduplication': ('deduplicate([1,1,2,2,3])', [1,2,3]),
    'move-zeroes': ('move_zeroes([0,1,0,3,12])', [1,3,12,0,0]),
    'partition-around-a-pivot': ('partition([5,1,4,2,3], 3)', [1,2,4,5,3]),
    'fixed-size-window-sum': ('window_sum([1,2,3,4], 2)', [3,5,7]),
    'longest-unique-substring': ("unique_substring('abcabcbb')", 3),
    'minimum-window-substring': ("minimum_window('ADOBECODEBANC', 'ABC')", 'BANC'),
    'longest-repeating-character-replacement': ("character_replacement('AABABBA', 1)", 4),
    'sliding-window-maximum': ('window_max([1,3,-1,-3,5,3,6,7], 3)', [3,3,5,5,6,7]),
    'subarrays-with-at-most-k-distinct-values': ('at_most_k([1,2,1], 2)', 6),
    'minimum-length-target-sum-subarray': ('min_target_length([2,3,1,2,4,3], 7)', 2),
    'prefix-sums': ('prefix_sums([2,4,1])', [0,2,6,7]),
    'two-dimensional-prefix-sums': ('prefix_grid([[1,2],[3,4]])', [[0,0,0],[0,1,3],[0,4,10]]),
    'difference-arrays': ('difference_array(4, [(1,2,3),(0,1,2)])', [2,5,3,0]),
    'prefix-xor': ('prefix_xor([1,2,3])', [0,1,3,0]),
    'subarray-sum-equals-k': ('subarray_sum([1,1,1], 2)', 2),
    'product-except-self': ('product_except([1,2,3,4])', [24,12,8,6]),
    'kadane-s-algorithm': ('kadane([-2,1,-3,4,-1,2,1,-5,4])', 6),
    'maximum-circular-subarray': ('circular_sum([5,-3,5])', 10),
    'merge-intervals': ('merge_intervals([[1,3],[2,6],[8,10]])', [[1,6],[8,10]]),
    'insert-interval': ('insert_interval([[1,3],[6,9]], [2,5])', [[1,5],[6,9]]),
    'interval-intersection': ('interval_intersection([[0,2],[5,10]], [[1,5],[8,12]])', [[1,2],[5,5],[8,10]]),
    'meeting-rooms': ('overlap_count([[0,30],[5,10],[15,20]])', 2),
    'sweep-line-overlap-counting': ('overlap_count([[1,3],[2,5],[3,4]])', 2),
}
