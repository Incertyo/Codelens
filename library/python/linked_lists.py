class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next
        self.random = None
        self.child = None


def linked(values):
    head = None
    for value in reversed(values):
        head = Node(value, head)
    return head


def values(head):
    result = []
    while head:
        result.append(head.value)
        head = head.next
    return result


def reverse(head):
    previous = None
    while head:
        following = head.next
        head.next = previous
        previous, head = head, following
    return previous


def reverse_segment(head, left, right):
    """One-based inclusive positions within the list."""
    dummy = Node(0, head)
    before = dummy
    for _ in range(left - 1):
        before = before.next
    current = before.next
    for _ in range(right - left):
        moving = current.next
        current.next = moving.next
        moving.next = before.next
        before.next = moving
    return dummy.next


def merge_lists(a, b):
    dummy = tail = Node(0)
    while a and b:
        if a.value <= b.value:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next


def remove_nth(head, n):
    dummy = Node(0, head)
    slow = fast = dummy
    for _ in range(n):
        fast = fast.next
        if fast is None:
            raise ValueError('n exceeds list length')
    while fast.next:
        slow, fast = slow.next, fast.next
    slow.next = slow.next.next
    return dummy.next


def reorder(head):
    if not head or not head.next:
        return head
    slow, fast = head, head.next
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    second = reverse(slow.next)
    slow.next = None
    first = head
    while second:
        a, b = first.next, second.next
        first.next = second
        second.next = a
        first, second = a, b
    return head


def copy_random(head):
    copies, current = {}, head
    while current:
        copies[current] = Node(current.value)
        current = current.next
    current = head
    while current:
        copies[current].next = copies.get(current.next)
        copies[current].random = copies.get(current.random)
        current = current.next
    return copies.get(head)


def random_demo():
    head = linked([1,2,3])
    head.random = head.next.next
    head.next.random = head
    copied = copy_random(head)
    return [values(copied), copied.random.value, copied.next.random.value, copied is not head]


def flatten(head):
    stack, current = [], head
    while current:
        if current.child:
            if current.next:
                stack.append(current.next)
            current.next = current.child
            current.child = None
        elif current.next is None and stack:
            current.next = stack.pop()
        current = current.next
    return head


def flatten_demo():
    head = linked([1,2,3])
    head.next.child = linked([4,5])
    return values(flatten(head))


def cycle_entry(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            slow = head
            while slow is not fast:
                slow, fast = slow.next, fast.next
            return slow
    return None


def cycle_demo(entry=False):
    head = linked([1,2,3])
    head.next.next.next = head.next
    found = cycle_entry(head)
    return found.value if entry else found is not None


def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow.value if slow else None


def list_palindrome(head):
    if not head:
        return True
    slow, fast = head, head.next
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    second = reverse(slow.next)
    a, b, answer = head, second, True
    while b:
        if a.value != b.value:
            answer = False
        a, b = a.next, b.next
    slow.next = reverse(second)
    return answer


def intersection(a, b):
    """Acyclic lists; compare node identity, not value."""
    first, second = a, b
    while first is not second:
        first = first.next if first else b
        second = second.next if second else a
    return first.value if first else None


def intersection_demo():
    shared = linked([8,9])
    return intersection(Node(1, shared), Node(2, Node(3, shared)))


def brent(head):
    if head is None:
        return 0
    power, length, slow, fast = 1, 1, head, head.next
    while fast and slow is not fast:
        if power == length:
            slow = fast
            power *= 2
            length = 0
        fast = fast.next
        length += 1
    return length if fast else 0


def brent_demo():
    head = linked([1,2,3])
    head.next.next.next = head.next
    return brent(head)


DEMOS = {
    'linked-list-reversal': ('values(reverse(linked([1,2,3])))', [3,2,1]),
    'reverse-a-linked-list-segment': ('values(reverse_segment(linked([1,2,3,4]), 2, 3))', [1,3,2,4]),
    'merge-sorted-linked-lists': ('values(merge_lists(linked([1,3]), linked([2,4])))', [1,2,3,4]),
    'remove-nth-node-from-the-end': ('values(remove_nth(linked([1,2,3]), 2))', [1,3]),
    'reorder-list': ('values(reorder(linked([1,2,3,4,5])))', [1,5,2,4,3]),
    'copy-list-with-random-pointers': ('random_demo()', [[1,2,3],3,1,True]),
    'flatten-a-multilevel-list': ('flatten_demo()', [1,2,4,5,3]),
    'floyd-cycle-detection': ('cycle_demo()', True),
    'cycle-entry-detection': ('cycle_demo(True)', 2),
    'middle-node': ('middle(linked([1,2,3,4,5]))', 3),
    'linked-list-palindrome': ('list_palindrome(linked([1,2,1]))', True),
    'intersecting-linked-lists': ('intersection_demo()', 8),
    'brent-cycle-detection': ('brent_demo()', 2),
}
