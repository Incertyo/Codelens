from collections import Counter


def hash_two_sum(a, target):
    seen = {}
    for i, value in enumerate(a):
        if target - value in seen:
            return [seen[target - value], i]
        seen[value] = i
    return None


def frequencies(a):
    counts = {}
    for value in a:
        counts[value] = counts.get(value, 0) + 1
    return counts


def group_anagrams(words):
    groups = {}
    for word in words:
        key = ''.join(sorted(word))
        groups.setdefault(key, []).append(word)
    return list(groups.values())


def consecutive(a):
    pool, best = set(a), 0
    for value in pool:
        if value - 1 not in pool:
            end = value
            while end in pool:
                end += 1
            best = max(best, end - value)
    return best


def duplicates(a):
    seen = set()
    for value in a:
        if value in seen:
            return True
        seen.add(value)
    return False


def set_operation(a, b, operation):
    left, right = set(a), set(b)
    if operation == 'union':
        return sorted(left | right)
    if operation == 'intersection':
        return sorted(left & right)
    return sorted(left - right)


def chaining(keys, size):
    buckets = [[] for _ in range(size)]
    for key in keys:
        bucket = buckets[key % size]
        if key not in bucket:
            bucket.append(key)
    return buckets


def probing(keys, size, mode):
    """Integer keys. Double hashing uses prime capacity; quadratic needs low load.
    Failure is explicit if the selected probe cycle has no available slot.
    """
    table = [None] * size
    for key in keys:
        for attempt in range(size):
            offset = attempt
            if mode == 'quadratic':
                offset = attempt * attempt
            elif mode == 'double':
                offset = attempt * (1 + key % (size - 1))
            position = (key % size + offset) % size
            if table[position] in (None, key):
                table[position] = key
                break
        else:
            raise ValueError('Probe cycle exhausted; resize the table')
    return table


def robin_hood(keys, size):
    table, distances = [None] * size, [0] * size
    for key in keys:
        if key in table:
            continue
        position, distance = key % size, 0
        while table[position] is not None:
            if distances[position] < distance:
                key, table[position] = table[position], key
                distance, distances[position] = distances[position], distance
            position = (position + 1) % size
            distance += 1
            if distance >= size:
                raise ValueError('Table full')
        table[position], distances[position] = key, distance
    return table


def cuckoo(keys, size):
    """Two tables and deterministic integer hash functions; cycles require rehash."""
    tables = [[None] * size for _ in range(2)]
    for key in keys:
        if key in tables[0] or key in tables[1]:
            continue
        side = 0
        for _ in range(2 * size):
            position = key % size if side == 0 else (key // size) % size
            key, tables[side][position] = tables[side][position], key
            if key is None:
                break
            side = 1 - side
        else:
            raise ValueError('Cuckoo cycle; increase capacity or rehash')
    return tables


def bloom(keys, queries, size=32):
    """No false negatives; true means possibly present, never proof of presence."""
    bits = 0
    for key in keys:
        for position in (key % size, (key * 7 + 3) % size):
            bits |= 1 << position
    result = []
    for key in queries:
        result.append(all(bits & (1 << p) for p in (key % size, (key * 7 + 3) % size)))
    return result


DEMOS = {
    'two-sum-with-hashing': ('hash_two_sum([2,7,11,15], 9)', [0,1]),
    'frequency-counting': ("frequencies(['a','b','a'])", {'a':2,'b':1}),
    'group-anagrams': ("group_anagrams(['eat','tea','tan','ate','nat'])", [['eat','tea','ate'],['tan','nat']]),
    'longest-consecutive-sequence': ('consecutive([100,4,200,1,3,2])', 4),
    'duplicate-detection': ('duplicates([1,2,1])', True),
    'set-union': ("set_operation([1,2],[2,3], 'union')", [1,2,3]),
    'set-intersection': ("set_operation([1,2],[2,3], 'intersection')", [2]),
    'set-difference': ("set_operation([1,2],[2,3], 'difference')", [1]),
    'separate-chaining': ('chaining([1,4,7,2], 3)', [[],[1,4,7],[2]]),
    'linear-probing': ("probing([1,8,15], 7, 'linear')", [None,1,8,15,None,None,None]),
    'quadratic-probing': ("probing([1,8,15], 7, 'quadratic')", [None,1,8,None,None,15,None]),
    'double-hashing': ("probing([1,8,15], 7, 'double')", [None,1,None,None,8,15,None]),
    'robin-hood-hashing': ('robin_hood([1,8,2], 7)', [None,1,8,2,None,None,None]),
    'cuckoo-hashing': ('cuckoo([1,6,11], 5)', [[None,11,None,None,None],[1,6,None,None,None]]),
    'bloom-filter-membership': ('bloom([2,5], [2,5,7])', [True,True,False]),
}
