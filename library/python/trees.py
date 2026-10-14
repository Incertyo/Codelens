from collections import deque


class TreeNode:
    def __init__(self, value, left=None, right=None):
        self.value, self.left, self.right = value, left, right
        self.height = 1
        self.red = True
        self.priority = (value * 7919) % 101


def tree_sample():
    return TreeNode(2, TreeNode(1), TreeNode(3))


def traversal(node, mode):
    if node is None:
        return []
    left = traversal(node.left, mode)
    right = traversal(node.right, mode)
    if mode == 'pre':
        return [node.value] + left + right
    if mode == 'in':
        return left + [node.value] + right
    return left + right + [node.value]


def morris(root):
    current, result = root, []
    while current:
        if current.left is None:
            result.append(current.value)
            current = current.right
        else:
            predecessor = current.left
            while predecessor.right and predecessor.right is not current:
                predecessor = predecessor.right
            if predecessor.right is None:
                predecessor.right = current
                current = current.left
            else:
                predecessor.right = None
                result.append(current.value)
                current = current.right
    return result


def serialize(root):
    if root is None:
        return [None]
    return [root.value] + serialize(root.left) + serialize(root.right)


def deserialize(data):
    iterator = iter(data)
    def build():
        value = next(iterator)
        if value is None:
            return None
        return TreeNode(value, build(), build())
    return build()


def build_orders(preorder, inorder):
    positions = {value: i for i, value in enumerate(inorder)}
    cursor = 0
    def build(left, right):
        nonlocal cursor
        if left >= right:
            return None
        value = preorder[cursor]
        cursor += 1
        middle = positions[value]
        return TreeNode(value, build(left, middle), build(middle + 1, right))
    return build(0, len(inorder))


def diameter(root):
    best = 0
    def height(node):
        nonlocal best
        if node is None:
            return 0
        left, right = height(node.left), height(node.right)
        best = max(best, left + right)
        return 1 + max(left, right)
    height(root)
    return best


def bst_insert(root, value):
    if root is None:
        return TreeNode(value)
    if value < root.value:
        root.left = bst_insert(root.left, value)
    elif value > root.value:
        root.right = bst_insert(root.right, value)
    return root


def bst_search(root, value):
    while root and root.value != value:
        root = root.left if value < root.value else root.right
    return root is not None


def bst_delete(root, value):
    if root is None:
        return None
    if value < root.value:
        root.left = bst_delete(root.left, value)
    elif value > root.value:
        root.right = bst_delete(root.right, value)
    else:
        if root.left is None:
            return root.right
        if root.right is None:
            return root.left
        successor = root.right
        while successor.left:
            successor = successor.left
        root.value = successor.value
        root.right = bst_delete(root.right, successor.value)
    return root


def bst_demo():
    root = None
    for value in [4,2,6,1,3]:
        root = bst_insert(root, value)
    found = bst_search(root, 3)
    return [found, traversal(bst_delete(root, 2), 'in')]


def height(node):
    return node.height if node else 0


def update_height(node):
    node.height = 1 + max(height(node.left), height(node.right))


def rotate_right(node):
    pivot = node.left
    node.left = pivot.right
    pivot.right = node
    update_height(node)
    update_height(pivot)
    return pivot


def rotate_left(node):
    pivot = node.right
    node.right = pivot.left
    pivot.left = node
    update_height(node)
    update_height(pivot)
    return pivot


def avl_insert(node, value):
    if node is None:
        return TreeNode(value)
    if value < node.value:
        node.left = avl_insert(node.left, value)
    elif value > node.value:
        node.right = avl_insert(node.right, value)
    else:
        return node
    update_height(node)
    balance = height(node.left) - height(node.right)
    if balance > 1:
        if value > node.left.value:
            node.left = rotate_left(node.left)
        return rotate_right(node)
    if balance < -1:
        if value < node.right.value:
            node.right = rotate_right(node.right)
        return rotate_left(node)
    return node


def avl_demo():
    root = None
    for value in [3,1,2]:
        root = avl_insert(root, value)
    return [root.value, traversal(root, 'in'), root.height]


def is_red(node):
    return bool(node and node.red)


def red_black_insert(root, value):
    """Left-leaning red-black insertion: rotations and color splitting."""
    def insert(node):
        if node is None:
            return TreeNode(value)
        if value < node.value:
            node.left = insert(node.left)
        elif value > node.value:
            node.right = insert(node.right)
        if is_red(node.right) and not is_red(node.left):
            original_color = node.red
            node = rotate_left(node)
            node.red, node.left.red = original_color, True
        if is_red(node.left) and is_red(node.left.left):
            original_color = node.red
            node = rotate_right(node)
            node.red, node.right.red = original_color, True
        if is_red(node.left) and is_red(node.right):
            node.red = not node.red
            node.left.red = not node.left.red
            node.right.red = not node.right.red
        return node
    root = insert(root)
    root.red = False
    return root


def red_black_demo():
    root = None
    for value in [5,3,7,1,4,6,8]:
        root = red_black_insert(root, value)
    return [traversal(root, 'in'), root.red]


def treap_split(root, key):
    if root is None:
        return None, None
    if root.value < key:
        root.right, other = treap_split(root.right, key)
        return root, other
    other, root.left = treap_split(root.left, key)
    return other, root


def treap_merge(left, right):
    if not left or not right:
        return left or right
    if left.priority < right.priority:
        left.right = treap_merge(left.right, right)
        return left
    right.left = treap_merge(left, right.left)
    return right


def treap_demo():
    root = None
    for value in [3,1,4,2]:
        left, right = treap_split(root, value)
        root = treap_merge(treap_merge(left, TreeNode(value)), right)
    left, right = treap_split(root, 3)
    result = [traversal(left, 'in'), traversal(right, 'in')]
    result.append(traversal(treap_merge(left, right), 'in'))
    return result


def splay(root, key):
    if root is None or root.value == key:
        return root
    if key < root.value:
        if root.left is None:
            return root
        if key < root.left.value:
            root.left.left = splay(root.left.left, key)
            root = rotate_right(root)
        elif key > root.left.value:
            root.left.right = splay(root.left.right, key)
            if root.left.right:
                root.left = rotate_left(root.left)
        return rotate_right(root) if root.left else root
    if root.right is None:
        return root
    if key > root.right.value:
        root.right.right = splay(root.right.right, key)
        root = rotate_left(root)
    elif key < root.right.value:
        root.right.left = splay(root.right.left, key)
        if root.right.left:
            root.right = rotate_right(root.right)
    return rotate_left(root) if root.right else root


def btree_insert_search(values, target, degree=2):
    """B-tree minimum degree >=2: insertion, child splitting, and search."""
    root = {'keys': [], 'children': []}
    def split(parent, index):
        child = parent['children'][index]
        sibling = {'keys': child['keys'][degree:], 'children': child['children'][degree:]}
        parent['keys'].insert(index, child['keys'][degree - 1])
        child['keys'] = child['keys'][:degree - 1]
        child['children'] = child['children'][:degree]
        parent['children'].insert(index + 1, sibling)
    def insert(node, value):
        i = len(node['keys'])
        while i and value < node['keys'][i - 1]:
            i -= 1
        if not node['children']:
            node['keys'].insert(i, value)
        else:
            if len(node['children'][i]['keys']) == 2 * degree - 1:
                split(node, i)
                if value > node['keys'][i]:
                    i += 1
            insert(node['children'][i], value)
    for value in values:
        if len(root['keys']) == 2 * degree - 1:
            root = {'keys': [], 'children': [root]}
            split(root, 0)
        insert(root, value)
    node = root
    while node:
        i = 0
        while i < len(node['keys']) and target > node['keys'][i]:
            i += 1
        if i < len(node['keys']) and target == node['keys'][i]:
            return True
        node = node['children'][i] if node['children'] else None
    return False


def order_select(root, k):
    """Zero-based rank; subtree sizes are computed once for this static tree."""
    sizes = {}
    def measure(node):
        if node is None:
            return 0
        sizes[node] = 1 + measure(node.left) + measure(node.right)
        return sizes[node]
    measure(root)
    while root:
        left = sizes.get(root.left, 0)
        if k == left:
            return root.value
        if k < left:
            root = root.left
        else:
            k -= left + 1
            root = root.right
    raise ValueError('Rank outside tree')


def rooted_tree(graph, root=0):
    parent, depth, order = [-1] * len(graph), [0] * len(graph), [root]
    parent[root] = root
    for node in order:
        for child in graph[node]:
            if child != parent[node]:
                parent[child], depth[child] = node, depth[node] + 1
                order.append(child)
    return parent, depth, order


def lca(graph, a, b):
    parent, depth, order = rooted_tree(graph)
    while depth[a] > depth[b]:
        a = parent[a]
    while depth[b] > depth[a]:
        b = parent[b]
    while a != b:
        a, b = parent[a], parent[b]
    return a


def binary_ancestor(graph, node, distance):
    parent, depth, order = rooted_tree(graph)
    if distance > depth[node]:
        return None
    up = [parent]
    for _ in range(1, max(1, len(graph).bit_length())):
        up.append([up[-1][up[-1][i]] for i in range(len(graph))])
    bit = 0
    while distance:
        if distance & 1:
            node = up[bit][node]
        bit += 1
        distance >>= 1
    return node


def euler_flatten(graph):
    order, tin, tout = [], [0] * len(graph), [0] * len(graph)
    def visit(node, parent):
        tin[node] = len(order)
        order.append(node)
        for child in graph[node]:
            if child != parent:
                visit(child, node)
        tout[node] = len(order)
    visit(0, -1)
    return [order, tin, tout]


def heavy_light(graph):
    parent, depth, order = rooted_tree(graph)
    size, heavy = [1] * len(graph), [-1] * len(graph)
    for node in reversed(order):
        for child in graph[node]:
            if child != parent[node]:
                size[node] += size[child]
                if heavy[node] == -1 or size[child] > size[heavy[node]]:
                    heavy[node] = child
    head, position, cursor = [0] * len(graph), [0] * len(graph), 0
    def decompose(node, leader):
        nonlocal cursor
        head[node], position[node] = leader, cursor
        cursor += 1
        if heavy[node] != -1:
            decompose(heavy[node], leader)
        for child in graph[node]:
            if child != parent[node] and child != heavy[node]:
                decompose(child, child)
    decompose(0, 0)
    return [head, position]


def centroid_decompose(graph):
    removed, result = set(), [-1] * len(graph)
    def solve(start, ancestor):
        parent, order, size = {start: -1}, [start], {}
        for node in order:
            for child in graph[node]:
                if child not in removed and child != parent[node]:
                    parent[child] = node
                    order.append(child)
        for node in reversed(order):
            size[node] = 1 + sum(size[c] for c in graph[node] if parent.get(c) == node)
        total = len(order)
        centroid = start
        for node in order:
            largest = max([total - size[node]] + [size[c] for c in graph[node] if parent.get(c) == node])
            if largest <= total // 2:
                centroid = node
                break
        result[centroid] = ancestor
        removed.add(centroid)
        for child in graph[centroid]:
            if child not in removed:
                solve(child, centroid)
    solve(0, -1)
    return result


def reroot_distances(graph):
    parent, depth, order = rooted_tree(graph)
    size, answer = [1] * len(graph), [0] * len(graph)
    for node in reversed(order[1:]):
        size[parent[node]] += size[node]
    answer[0] = sum(depth)
    for node in order[1:]:
        answer[node] = answer[parent[node]] + len(graph) - 2 * size[node]
    return answer


def trie_build(words):
    """Words must exclude the reserved terminal marker '$'."""
    root = {}
    for word in words:
        node = root
        for char in word:
            node = node.setdefault(char, {})
        node['$'] = True
    return root


def trie_lookup(root, word, prefix=False):
    node = root
    for char in word:
        if char not in node:
            return False
        node = node[char]
    return prefix or '$' in node


def trie_delete(root, word):
    def remove(node, index):
        if index == len(word):
            node.pop('$', None)
        elif word[index] in node:
            if remove(node[word[index]], index + 1):
                del node[word[index]]
        return not node
    remove(root, 0)
    return root


def autocomplete(root, prefix):
    node = root
    for char in prefix:
        if char not in node:
            return []
        node = node[char]
    result = []
    def visit(node, word):
        if '$' in node:
            result.append(word)
        for char in sorted(node):
            if char != '$':
                visit(node[char], word + char)
    visit(node, prefix)
    return result


def binary_trie_xor(values, query, width=8):
    """Nonnegative values fitting width bits."""
    root = {}
    for value in values:
        node = root
        for bit in range(width - 1, -1, -1):
            node = node.setdefault((value >> bit) & 1, {})
    node, answer = root, 0
    for bit in range(width - 1, -1, -1):
        desired = 1 - ((query >> bit) & 1)
        if desired in node:
            answer |= 1 << bit
            node = node[desired]
        else:
            node = node[1 - desired]
    return answer


DEMOS = {
    'preorder-traversal': ("traversal(tree_sample(), 'pre')", [2,1,3]),
    'inorder-traversal': ("traversal(tree_sample(), 'in')", [1,2,3]),
    'postorder-traversal': ("traversal(tree_sample(), 'post')", [1,3,2]),
    'morris-traversal': ('morris(tree_sample())', [1,2,3]),
    'tree-serialization': ('serialize(deserialize(serialize(tree_sample())))', [2,1,None,None,3,None,None]),
    'build-tree-from-traversal-orders': ("traversal(build_orders([2,1,3], [1,2,3]), 'in')", [1,2,3]),
    'tree-diameter': ('diameter(tree_sample())', 2),
    'bst-search-insertion-and-deletion': ('bst_demo()', [True,[1,3,4,6]]),
    'avl-rotations': ('avl_demo()', [2,[1,2,3],2]),
    'red-black-balancing': ('red_black_demo()', [[1,3,4,5,6,7,8],False]),
    'treap-split-and-merge': ('treap_demo()', [[1,2],[3,4],[1,2,3,4]]),
    'splay-access': ('splay(tree_sample(), 1).value', 1),
    'b-tree-operations': ('btree_insert_search([10,20,5,6,12,30,7,17], 12)', True),
    'order-statistic-selection': ('order_select(tree_sample(), 1)', 2),
    'lowest-common-ancestor': ('lca([[1,2],[0,3,4],[0],[1],[1]], 3, 4)', 1),
    'binary-lifting-ancestors': ('binary_ancestor([[1,2],[0,3,4],[0],[1],[1]], 3, 2)', 0),
    'euler-tour-flattening': ('euler_flatten([[1,2],[0],[0]])', [[0,1,2],[0,1,2],[3,2,3]]),
    'heavy-light-decomposition': ('heavy_light([[1,2],[0,3],[0],[1]])', [[0,0,2,0],[0,1,3,2]]),
    'centroid-decomposition': ('centroid_decompose([[1],[0,2],[1,3],[2]])', [1,-1,1,2]),
    'tree-rerooting-dp': ('reroot_distances([[1],[0,2],[1]])', [3,2,3]),
    'trie-insertion': ("trie_lookup(trie_build(['cat','car']), 'cat')", True),
    'trie-search': ("trie_lookup(trie_build(['cat','car']), 'ca')", False),
    'prefix-lookup': ("trie_lookup(trie_build(['cat','car']), 'ca', True)", True),
    'trie-deletion': ("autocomplete(trie_delete(trie_build(['cat','car']), 'cat'), 'ca')", ['car']),
    'autocomplete-traversal': ("autocomplete(trie_build(['cat','car','dog']), 'ca')", ['car','cat']),
    'binary-trie-maximum-xor': ('binary_trie_xor([3,10,5,25,2,8], 5)', 28),
}
