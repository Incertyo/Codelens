from collections import deque


def parentheses(text):
    stack, pairs = [], {')': '(', ']': '[', '}': '{'}
    for char in text:
        if char in '([{':
            stack.append(char)
        elif char in pairs:
            if not stack or stack.pop() != pairs[char]:
                return False
    return not stack


def min_stack(values):
    stack, minima = [], []
    for value in values:
        stack.append(value)
        minima.append(min(value, minima[-1]) if minima else value)
    stack.pop()
    minima.pop()
    return [stack, minima[-1] if minima else None]


def postfix(tokens):
    stack = []
    for token in tokens:
        if token not in ('+', '-', '*', '/'):
            stack.append(int(token))
            continue
        right, left = stack.pop(), stack.pop()
        if token == '+':
            stack.append(left + right)
        elif token == '-':
            stack.append(left - right)
        elif token == '*':
            stack.append(left * right)
        else:
            stack.append(int(left / right))
    return stack[-1]


def shunting_yard(tokens):
    """Tokenized operands/operators; ^ is right associative. No unary operators."""
    precedence = {'+': 1, '-': 1, '*': 2, '/': 2, '^': 3}
    stack, result = [], []
    for token in tokens:
        if token == '(':
            stack.append(token)
        elif token == ')':
            while stack and stack[-1] != '(':
                result.append(stack.pop())
            if not stack:
                raise ValueError('Unbalanced parentheses')
            stack.pop()
        elif token in precedence:
            while stack and stack[-1] in precedence and (precedence[stack[-1]] > precedence[token] or (precedence[stack[-1]] == precedence[token] and token != '^')):
                result.append(stack.pop())
            stack.append(token)
        else:
            result.append(token)
    if '(' in stack:
        raise ValueError('Unbalanced parentheses')
    return result + list(reversed(stack))


def stack_dfs(graph, start):
    stack, visited, order = [start], set(), []
    while stack:
        node = stack.pop()
        if node in visited:
            continue
        visited.add(node)
        order.append(node)
        stack.extend(reversed(graph[node]))
    return order


def next_greater(a):
    stack, result = [], [-1] * len(a)
    for i, value in enumerate(a):
        while stack and a[stack[-1]] < value:
            result[stack.pop()] = value
        stack.append(i)
    return result


def temperatures(a):
    stack, result = [], [0] * len(a)
    for i, value in enumerate(a):
        while stack and a[stack[-1]] < value:
            j = stack.pop()
            result[j] = i - j
        stack.append(i)
    return result


def stock_span(a):
    stack, result = [], []
    for i, price in enumerate(a):
        while stack and a[stack[-1]] <= price:
            stack.pop()
        result.append(i - stack[-1] if stack else i + 1)
        stack.append(i)
    return result


def histogram(a):
    stack, best = [], 0
    for i, height in enumerate(list(a) + [0]):
        while stack and a[stack[-1]] > height:
            h = a[stack.pop()]
            width = i - stack[-1] - 1 if stack else i
            best = max(best, h * width)
        stack.append(i)
    return best


def trapped_water(a):
    stack, total = [], 0
    for i, height in enumerate(a):
        while stack and height > a[stack[-1]]:
            bottom = stack.pop()
            if not stack:
                break
            total += (i - stack[-1] - 1) * (min(height, a[stack[-1]]) - a[bottom])
        stack.append(i)
    return total


def deque_max(a, k):
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


def two_stack_queue(values):
    incoming, outgoing, result = [], [], []
    for value in values:
        incoming.append(value)
    while incoming or outgoing:
        if not outgoing:
            while incoming:
                outgoing.append(incoming.pop())
        result.append(outgoing.pop())
    return result


def circular_queue(values, capacity):
    buffer, head, tail, count = [None] * capacity, 0, 0, 0
    for value in values:
        if count == capacity:
            raise ValueError('Queue full')
        buffer[tail] = value
        tail = (tail + 1) % capacity
        count += 1
    result = []
    while count:
        result.append(buffer[head])
        buffer[head] = None
        head = (head + 1) % capacity
        count -= 1
    return result


def deque_operations(values):
    queue = deque(values)
    queue.appendleft(0)
    queue.append(9)
    first, last = queue.popleft(), queue.pop()
    return [first, list(queue), last]


def round_robin(bursts, quantum):
    """All jobs arrive at time zero; positive quantum."""
    queue = deque(enumerate(bursts))
    time, completion = 0, [0] * len(bursts)
    while queue:
        job, remaining = queue.popleft()
        elapsed = min(remaining, quantum)
        time += elapsed
        remaining -= elapsed
        if remaining:
            queue.append((job, remaining))
        else:
            completion[job] = time
    return completion


def level_order(tree):
    """Nested [value, left, right] nodes, with None for missing children."""
    queue, result = deque([tree] if tree else []), []
    while queue:
        node = queue.popleft()
        result.append(node[0])
        for child in node[1:]:
            if child:
                queue.append(child)
    return result


DEMOS = {
    'valid-parentheses': ("parentheses('([]){()}')", True),
    'min-stack': ('min_stack([3,1,2])', [[3,1],1]),
    'postfix-evaluation': ("postfix(['2','3','+','4','*'])", 20),
    'infix-to-postfix': ("shunting_yard(['2','+','3','*','4'])", ['2','3','4','*','+']),
    'shunting-yard-algorithm': ("shunting_yard(['2','^','3','^','2'])", ['2','3','2','^','^']),
    'stack-based-dfs': ('stack_dfs([[1,2],[3],[],[]], 0)', [0,1,3,2]),
    'next-greater-element': ('next_greater([2,1,3])', [3,3,-1]),
    'daily-temperatures': ('temperatures([73,74,75,71,69,72,76,73])', [1,1,4,2,1,1,0,0]),
    'stock-span': ('stock_span([100,80,60,70,60,75,85])', [1,1,1,2,1,4,6]),
    'largest-rectangle-in-a-histogram': ('histogram([2,1,5,6,2,3])', 10),
    'trapping-rain-water': ('trapped_water([0,1,0,2,1,0,1,3,2,1,2,1])', 6),
    'monotonic-deque-maximum': ('deque_max([1,3,-1,-3,5], 3)', [3,3,5]),
    'queue-using-two-stacks': ('two_stack_queue([1,2,3])', [1,2,3]),
    'circular-queue': ('circular_queue([1,2,3], 3)', [1,2,3]),
    'deque-operations': ('deque_operations([1,2])', [0,[1,2],9]),
    'round-robin-scheduling': ('round_robin([5,3,1], 2)', [9,8,5]),
    'level-order-traversal': ('level_order([1,[2,None,None],[3,None,None]])', [1,2,3]),
}
