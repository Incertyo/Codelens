import math
from bisect import bisect_left


def linear(a, target):
    for i, value in enumerate(a):
        if value == target:
            return i
    return -1


def binary(a, target, low=0, high=None):
    high = len(a) - 1 if high is None else high
    while low <= high:
        mid = (low + high) // 2
        if a[mid] == target:
            return mid
        if a[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1


def bound(a, target, upper=False):
    low, high = 0, len(a)
    while low < high:
        mid = (low + high) // 2
        if a[mid] < target or (upper and a[mid] == target):
            low = mid + 1
        else:
            high = mid
    return low


def exponential(a, target):
    high = 1
    while high < len(a) and a[high] < target:
        high *= 2
    return binary(a, target, high // 2 if high > 1 else 0, min(high, len(a) - 1))


def interpolation(a, target):
    low, high = 0, len(a) - 1
    while low <= high and a[low] <= target <= a[high]:
        if a[low] == a[high]:
            return low if a[low] == target else -1
        mid = low + (target - a[low]) * (high - low) // (a[high] - a[low])
        if a[mid] == target:
            return mid
        if a[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1


def jump(a, target):
    step = max(1, math.isqrt(len(a)))
    start = 0
    while start < len(a) and a[min(start + step, len(a)) - 1] < target:
        start += step
    for i in range(start, min(start + step, len(a))):
        if a[i] == target:
            return i
    return -1


def predicate_boundary(low, high, predicate):
    """First true in [low, high); returns high when no true value exists."""
    while low < high:
        mid = (low + high) // 2
        if predicate(mid):
            high = mid
        else:
            low = mid + 1
    return low


def rotated(a, target):
    """Distinct values in a rotated sorted array."""
    low, high = 0, len(a) - 1
    while low <= high:
        mid = (low + high) // 2
        if a[mid] == target:
            return mid
        if a[low] <= a[mid]:
            if a[low] <= target < a[mid]:
                high = mid - 1
            else:
                low = mid + 1
        elif a[mid] < target <= a[high]:
            low = mid + 1
        else:
            high = mid - 1
    return -1


def peak(a):
    low, high = 0, len(a) - 1
    while low < high:
        mid = (low + high) // 2
        if a[mid] < a[mid + 1]:
            low = mid + 1
        else:
            high = mid
    return low


def ternary(low, high, objective, iterations=40):
    """Minimize a unimodal real-valued objective."""
    for _ in range(iterations):
        first, second = (2 * low + high) / 3, (low + 2 * high) / 3
        if objective(first) < objective(second):
            high = second
        else:
            low = first
    return (low + high) / 2


def lifting_search(a, target):
    position = -1
    jump = 1 << len(a).bit_length()
    while jump:
        if position + jump < len(a) and a[position + jump] < target:
            position += jump
        jump >>= 1
    return position + 1


def meet_middle(a, target):
    def sums(values):
        result = [0]
        for value in values:
            result += [total + value for total in result]
        return result
    mid = len(a) // 2
    right = sorted(sums(a[mid:]))
    for total in sums(a[:mid]):
        i = bisect_left(right, target - total)
        if i < len(right) and right[i] == target - total:
            return True
    return False


DEMOS = {
    'linear-search': ('linear([4,2,7], 7)', 2),
    'binary-search': ('binary([1,3,5,7,9], 7)', 3),
    'lower-bound': ('bound([1,3,3,5], 3)', 1),
    'upper-bound': ('bound([1,3,3,5], 3, True)', 3),
    'exponential-search': ('exponential([1,3,5,7,9], 7)', 3),
    'interpolation-search': ('interpolation([10,20,30,40,50], 40)', 3),
    'jump-search': ('jump([1,3,5,7,9], 7)', 3),
    'binary-search-on-a-monotone-predicate': ('predicate_boundary(0, 20, lambda x: x*x >= 50)', 8),
    'rotated-array-search': ('rotated([4,5,6,7,0,1,2], 0)', 4),
    'peak-finding': ('peak([1,3,2])', 1),
    'ternary-search': ('round(ternary(0, 10, lambda x: (x-3)**2), 3)', 3.0),
    'binary-lifting-search': ('lifting_search([1,3,5,7,9], 6)', 3),
    'meet-in-the-middle': ('meet_middle([3,8,4,2], 10)', True),
}
