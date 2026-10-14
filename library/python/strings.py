from collections import Counter, deque


def palindrome(text):
    left, right = 0, len(text) - 1
    while left < right:
        if text[left] != text[right]:
            return False
        left += 1
        right -= 1
    return True


def anagram(a, b):
    return Counter(a) == Counter(b)


def run_length(text):
    result = []
    for char in text:
        if result and result[-1][0] == char:
            result[-1][1] += 1
        else:
            result.append([char, 1])
    return result


def expand_palindrome(text):
    best = ''
    for center in range(len(text)):
        for left, right in [(center, center), (center, center + 1)]:
            while left >= 0 and right < len(text) and text[left] == text[right]:
                if right - left + 1 > len(best):
                    best = text[left:right + 1]
                left -= 1
                right += 1
    return best


def manacher(text):
    """Unique object separators avoid collisions with any input character."""
    separator = object()
    values = [separator]
    for char in text:
        values.extend([char, separator])
    radius = [0] * len(values)
    center = right = best = location = 0
    for i in range(len(values)):
        if i < right:
            radius[i] = min(right - i, radius[2 * center - i])
        while i - radius[i] - 1 >= 0 and i + radius[i] + 1 < len(values) and values[i - radius[i] - 1] == values[i + radius[i] + 1]:
            radius[i] += 1
        if i + radius[i] > right:
            center, right = i, i + radius[i]
        if radius[i] > best:
            best, location = radius[i], i
    start = (location - best) // 2
    return text[start:start + best]


def booth(text):
    if not text:
        return ''
    doubled, n = text + text, len(text)
    i, j, k = 0, 1, 0
    while i < n and j < n and k < n:
        if doubled[i + k] == doubled[j + k]:
            k += 1
            continue
        if doubled[i + k] > doubled[j + k]:
            i += k + 1
            if i == j:
                i += 1
        else:
            j += k + 1
            if i == j:
                j += 1
        k = 0
    start = min(i, j)
    return doubled[start:start + n]


def naive_match(text, pattern):
    return [i for i in range(len(text) - len(pattern) + 1) if text[i:i + len(pattern)] == pattern]


def prefix_function(text):
    prefix = [0] * len(text)
    for i in range(1, len(text)):
        j = prefix[i - 1]
        while j and text[i] != text[j]:
            j = prefix[j - 1]
        if text[i] == text[j]:
            j += 1
        prefix[i] = j
    return prefix


def kmp(text, pattern):
    if not pattern:
        return list(range(len(text) + 1))
    prefix, j, matches = prefix_function(pattern), 0, []
    for i, char in enumerate(text):
        while j and char != pattern[j]:
            j = prefix[j - 1]
        if char == pattern[j]:
            j += 1
        if j == len(pattern):
            matches.append(i - j + 1)
            j = prefix[j - 1]
    return matches


def z_function(text):
    z, left, right = [0] * len(text), 0, 0
    for i in range(1, len(text)):
        if i < right:
            z[i] = min(right - i, z[i - left])
        while i + z[i] < len(text) and text[z[i]] == text[i + z[i]]:
            z[i] += 1
        if i + z[i] > right:
            left, right = i, i + z[i]
    return z


def rabin_karp(text, pattern):
    if not pattern:
        return list(range(len(text) + 1))
    n, m, base, modulus = len(text), len(pattern), 257, 1000000007
    if m > n:
        return []
    power, target, current = pow(base, m - 1, modulus), 0, 0
    for i in range(m):
        target = (target * base + ord(pattern[i])) % modulus
        current = (current * base + ord(text[i])) % modulus
    matches = []
    for i in range(n - m + 1):
        if current == target and text[i:i + m] == pattern:
            matches.append(i)
        if i + m < n:
            current = ((current - ord(text[i]) * power) * base + ord(text[i + m])) % modulus
    return matches


def boyer_moore(text, pattern):
    """Boyer–Moore with the bad-character shift rule."""
    last = {char: i for i, char in enumerate(pattern)}
    start, result = 0, []
    while start <= len(text) - len(pattern):
        j = len(pattern) - 1
        while j >= 0 and pattern[j] == text[start + j]:
            j -= 1
        if j < 0:
            result.append(start)
            start += 1
        else:
            start += max(1, j - last.get(text[start + j], -1))
    return result


def aho_corasick(text, patterns):
    children, failure, output = [{}], [0], [[]]
    for index, pattern in enumerate(patterns):
        node = 0
        for char in pattern:
            if char not in children[node]:
                children[node][char] = len(children)
                children.append({})
                failure.append(0)
                output.append([])
            node = children[node][char]
        output[node].append(index)
    queue = deque(children[0].values())
    while queue:
        node = queue.popleft()
        for char, child in children[node].items():
            queue.append(child)
            fallback = failure[node]
            while fallback and char not in children[fallback]:
                fallback = failure[fallback]
            failure[child] = children[fallback].get(char, 0)
            output[child] += output[failure[child]]
    node, result = 0, []
    for i, char in enumerate(text):
        while node and char not in children[node]:
            node = failure[node]
        node = children[node].get(char, 0)
        for index in output[node]:
            result.append([i - len(patterns[index]) + 1, patterns[index]])
    return result


def automaton_match(text, pattern):
    """Explicit transition table over the text/pattern alphabet."""
    alphabet = sorted(set(text + pattern))
    transition = [{} for _ in range(len(pattern) + 1)]
    for state in range(len(transition)):
        for char in alphabet:
            candidate = pattern[:state] + char
            next_state = min(len(pattern), len(candidate))
            while next_state and candidate[-next_state:] != pattern[:next_state]:
                next_state -= 1
            transition[state][char] = next_state
    state, matches = 0, [0] if not pattern else []
    for i, char in enumerate(text):
        state = transition[state][char]
        if state == len(pattern):
            matches.append(i - len(pattern) + 1)
    return matches


def suffix_array(text):
    n = len(text)
    order, ranks, gap = list(range(n)), [ord(c) for c in text], 1
    while gap < n:
        order.sort(key=lambda i: (ranks[i], ranks[i + gap] if i + gap < n else -1))
        new = [0] * n
        for j in range(1, n):
            a, b = order[j - 1], order[j]
            first = (ranks[a], ranks[a + gap] if a + gap < n else -1)
            second = (ranks[b], ranks[b + gap] if b + gap < n else -1)
            new[b] = new[a] + (first != second)
        ranks = new
        gap *= 2
    return order


def kasai(text):
    order = suffix_array(text)
    ranks = [0] * len(text)
    for i, position in enumerate(order):
        ranks[position] = i
    lcp, matched = [0] * len(text), 0
    for i in range(len(text)):
        rank = ranks[i]
        if rank == 0:
            matched = 0
            continue
        j = order[rank - 1]
        while i + matched < len(text) and j + matched < len(text) and text[i + matched] == text[j + matched]:
            matched += 1
        lcp[rank] = matched
        matched = max(0, matched - 1)
    return lcp


def suffix_tree(text):
    """Quadratic suffix insertion with edge splitting, not linear Ukkonen.
    Input must exclude the terminal '$'. Edges store [label, child].
    """
    text += '$'
    root = {}
    for start in range(len(text)):
        node, suffix = root, text[start:]
        while suffix:
            char = suffix[0]
            if char not in node:
                node[char] = [suffix, {}]
                break
            label, child = node[char]
            common = 0
            while common < min(len(label), len(suffix)) and label[common] == suffix[common]:
                common += 1
            if common < len(label):
                split = {label[common]: [label[common:], child]}
                node[char] = [label[:common], split]
                child = split
            suffix = suffix[common:]
            node = child
    return root


def suffix_tree_contains(text, pattern):
    node = suffix_tree(text)
    while pattern:
        if pattern[0] not in node:
            return False
        label, child = node[pattern[0]]
        common = min(len(label), len(pattern))
        if label[:common] != pattern[:common]:
            return False
        pattern = pattern[common:]
        node = child
    return True


def suffix_automaton(text):
    states = [{'length': 0, 'link': -1, 'next': {}}]
    last = 0
    for char in text:
        current = len(states)
        states.append({'length': states[last]['length'] + 1, 'link': 0, 'next': {}})
        p = last
        while p >= 0 and char not in states[p]['next']:
            states[p]['next'][char] = current
            p = states[p]['link']
        if p >= 0:
            q = states[p]['next'][char]
            if states[p]['length'] + 1 == states[q]['length']:
                states[current]['link'] = q
            else:
                clone = len(states)
                states.append({'length': states[p]['length'] + 1, 'link': states[q]['link'], 'next': dict(states[q]['next'])})
                while p >= 0 and states[p]['next'].get(char) == q:
                    states[p]['next'][char] = clone
                    p = states[p]['link']
                states[q]['link'] = states[current]['link'] = clone
        last = current
    return sum(state['length'] - states[state['link']]['length'] for state in states[1:])


def rolling_hash(text):
    prefix = [0]
    for char in text:
        prefix.append((prefix[-1] * 257 + ord(char)) % 1000000007)
    return prefix


def common_substring(a, b):
    dp, best, end = [0] * (len(b) + 1), 0, 0
    for i, char in enumerate(a, 1):
        for j in range(len(b), 0, -1):
            dp[j] = dp[j - 1] + 1 if char == b[j - 1] else 0
            if dp[j] > best:
                best, end = dp[j], i
    return a[end - best:end]


DEMOS = {
    'palindrome-check': ("palindrome('racecar')", True),
    'anagram-frequency-matching': ("anagram('listen','silent')", True),
    'run-length-encoding': ("run_length('aaabbc')", [['a',3],['b',2],['c',1]]),
    'expand-around-center-palindromes': ("expand_palindrome('babad')", 'bab'),
    'manacher-s-algorithm': ("manacher('babad')", 'bab'),
    'booth-s-minimum-rotation': ("booth('baca')", 'abac'),
    'naive-pattern-matching': ("naive_match('ababa','aba')", [0,2]),
    'knuth-morris-pratt': ("kmp('ababa','aba')", [0,2]),
    'z-algorithm': ("z_function('aaaaa')", [0,4,3,2,1]),
    'rabin-karp': ("rabin_karp('ababa','aba')", [0,2]),
    'boyer-moore': ("boyer_moore('ababa','aba')", [0,2]),
    'aho-corasick': ("aho_corasick('ushers', ['he','she','hers'])", [[1,'she'],[2,'he'],[2,'hers']]),
    'finite-automaton-matching': ("automaton_match('ababa','aba')", [0,2]),
    'suffix-array-construction': ("suffix_array('banana')", [5,3,1,0,4,2]),
    'kasai-lcp-construction': ("kasai('banana')", [0,1,3,0,0,2]),
    'suffix-tree-construction': ("suffix_tree_contains('banana', 'ana')", True),
    'suffix-automaton-construction': ("suffix_automaton('aba')", 5),
    'rolling-string-hash': ("rolling_hash('ab')", [0,97,25027]),
    'longest-common-substring': ("common_substring('xabcd','yabc')", 'abc'),
}
