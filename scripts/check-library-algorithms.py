"""Deterministic oracle/edge checks of trusted library functions, beyond demos."""
import importlib.util
import itertools
import math
import random
from pathlib import Path

def module(name):
    spec = importlib.util.spec_from_file_location(name, Path('library/python') / (name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result

s = module('sorting')
g = module('graphs')
d = module('dynamic_programming')
t = module('trees')
q = module('range_queries')
m = module('mathematics')
strings = module('strings')
geometry = module('geometry')
arrays = module('arrays')
back = module('backtracking')
random_source = random.Random(73219)
checks = 0
def equal(actual, expected):
    global checks
    assert actual == expected, (actual, expected)
    checks += 1

for _ in range(80):
    values = [random_source.randrange(-20, 21) for _ in range(random_source.randrange(0, 120))]
    for sort in [s.bubble, s.insertion, s.selection, s.merge_sort, s.quicksort, s.heapsort, s.shell_sort, s.timsort, s.introsort, s.counting, s.pigeonhole]:
        equal(sort(values), sorted(values))
    equal(s.radix([abs(x) for x in values]), sorted(abs(x) for x in values))
    if values:
        k = random_source.randrange(len(values))
        equal(s.quickselect(values,k), sorted(values)[k])
        equal(s.median_of_medians(values,k), sorted(values)[k])
    text = ''.join(random_source.choice('abc') for _ in range(14))
    pattern = ''.join(random_source.choice('abc') for _ in range(random_source.randrange(0, 5)))
    expected = [i for i in range(len(text)-len(pattern)+1) if text[i:i+len(pattern)] == pattern]
    for matcher in [strings.kmp, strings.rabin_karp, strings.boyer_moore, strings.automaton_match]:
        equal(matcher(text,pattern), expected)
    equal(strings.suffix_array(text), sorted(range(len(text)),key=lambda i: text[i:]))
    equal(len(strings.manacher(text)),len(strings.expand_palindrome(text)))
    equal(strings.booth(text),min(text[i:]+text[:i] for i in range(len(text))))
    points = [tuple(random_source.randrange(0, 10) for _ in range(2)) for _ in range(10)]
    hull = geometry.monotone_hull(points)
    equal(set(map(tuple,geometry.graham(points))),set(map(tuple,hull)))
    equal(set(map(tuple,geometry.jarvis(points))),set(map(tuple,hull)))
    assert math.isclose(geometry.calipers(points),max(math.dist(a,b) for a in points for b in points))
    assert math.isclose(geometry.closest(points),min(math.dist(points[i],points[j]) for i in range(len(points)) for j in range(i)))
    assert math.isclose(back.closest_pair(points),min(math.dist(points[i],points[j]) for i in range(len(points)) for j in range(i)))
    nearest = geometry.kd_nearest(points,(3,4))
    assert math.isclose(math.dist(nearest,(3,4)),min(math.dist(p,(3,4)) for p in points))
    checks += 4

def brute_matching(graph, remaining=None):
    remaining = set(range(len(graph))) if remaining is None else remaining
    if not remaining:
        return 0
    first = min(remaining)
    return max([brute_matching(graph,remaining-{first})] + [1+brute_matching(graph,remaining-{first,second}) for second in graph[first] if second in remaining])

for _ in range(80):
    n = random_source.randrange(2, 8)
    edges = [(i,j,random_source.randrange(1,6)) for i in range(n) for j in range(i+1,n) if random_source.random() < .45]
    graph = [[] for _ in range(n)]
    for a,b,w in edges:
        graph[a].append(b)
        graph[b].append(a)
    equal(g.blossom(graph), brute_matching(graph))
                                                                                 
    directed = edges + [(b,a,random_source.randrange(1,6)) for a,b,w in edges if random_source.random() < .3]
    cuts = []
    for mask in range(1 << (n-2)):
        side = {0} | {i+1 for i in range(n-2) if mask & (1 << i)}
        cuts.append(sum(w for a,b,w in directed if a in side and b not in side))
    expected = min(cuts)
    equal(g.augmenting_flow(n,directed,0,n-1,False),expected)
    equal(g.augmenting_flow(n,directed,0,n-1,True),expected)
    equal(g.dinic(n,directed,0,n-1),expected)
    equal(g.push_relabel(n,directed,0,n-1),expected)
    equal(g.stoer_wagner(n,edges),min(sum(w for a,b,w in edges if (a in side) != (b in side)) for side in ({0} | {i+1 for i in range(n-1) if mask & (1 << i)} for mask in range((1 << (n-1))-1))))
    equal(g.kruskal(n,edges),g.prim(n,edges))
    equal(g.boruvka(n,edges),g.kruskal(n,edges))
    size = random_source.randrange(1, 6)
    cost = [[random_source.randrange(-4,10) for _ in range(size)] for _ in range(size)]
    optimum = min(sum(cost[i][p[i]] for i in range(size)) for p in itertools.permutations(range(size)))
    equal(g.hungarian(cost)[0],optimum)
    equal(d.subset_assignment(cost),optimum)
    left_graph = [[j for j in range(size) if random_source.random() < .4] for i in range(size)]
    full_graph = [[] for _ in range(2*size)]
    for i, neighbors in enumerate(left_graph):
        for j in neighbors:
            full_graph[i].append(size+j)
            full_graph[size+j].append(i)
    equal(g.hopcroft_karp(left_graph,size),brute_matching(full_graph))

for _ in range(60):
    values = [random_source.randrange(0, 10) for _ in range(8)]
    prefix = [0]
    for value in values:
        prefix.append(prefix[-1]+value)
    previous = [0]+[float('inf')]*len(values)
    for group in range(1,4):
        current = [float('inf')]*(len(values)+1)
        for end in range(group,len(values)+1):
            current[end] = min(previous[k]+(prefix[end]-prefix[k])**2 for k in range(group-1,end))
        equal(d.divide_conquer_partition(values,group),current[-1])
        previous = current
    n = len(values)
    table = [[0]*n for _ in values]
    for length in range(2,n+1):
        for start in range(n-length+1):
            end = start+length-1
            table[start][end] = min(table[start][k]+table[k+1][end] for k in range(start,end))+sum(values[start:end+1])
    equal(d.knuth_merge(values),table[0][-1])
    lines = [(slope,random_source.randrange(-10,11)) for slope in [5,3,0,-2,-4]]
    queries = list(range(-5,6))
    expected = [min(a*x+b for a,b in lines) for x in queries]
    equal(d.convex_hull_trick(lines,queries),expected)
    equal(d.li_chao(lines,queries),expected)
    weights, profits, capacity = [1,2,3,4],[random_source.randrange(1,10) for _ in range(4)],6
    optimum = max(sum(profits[i] for i in range(4) if mask & (1 << i)) for mask in range(16) if sum(weights[i] for i in range(4) if mask & (1 << i)) <= capacity)
    equal(back.branch_bound(weights,profits,capacity),optimum)
    equal(d.knapsack(weights,profits,capacity),optimum)
    segment, fenwick, lazy = q.SegmentTree(values), q.Fenwick(values), q.LazyTree(values)
    for i in range(5):
        left, right = sorted(random_source.sample(range(n+1),2))
        equal(segment.query(left,right),sum(values[left:right]))
        equal(fenwick.query(left,right),sum(values[left:right]))
        equal(lazy.range(left,right),sum(values[left:right]))
    a,b = [random_source.randrange(-3,4) for _ in range(3)],[random_source.randrange(-3,4) for _ in range(4)]
    expected = [sum(a[i]*b[k-i] for i in range(len(a)) if 0 <= k-i < len(b)) for k in range(len(a)+len(b)-1)]
    equal(m.convolution(a,b),expected)
    equal(m.ntt(m.ntt(values),True),values)
    equal(m.walsh(m.walsh(values),True),values)

                                                                                  
for insertion_order in [list(range(35)),list(reversed(range(35))),random_source.sample(range(35),35)]:
    avl = rb = None
    inserted = []
    for value in insertion_order:
        inserted.append(value)
        avl, rb = t.avl_insert(avl,value), t.red_black_insert(rb,value)
        equal(t.traversal(avl,'in'),sorted(inserted))
        equal(t.traversal(rb,'in'),sorted(inserted))
        def avl_height(node):
            if node is None:
                return 0
            left,right = avl_height(node.left),avl_height(node.right)
            assert abs(left-right) <= 1
            assert node.height == 1+max(left,right)
            return node.height
        def black_height(node):
            if node is None:
                return 1
            if node.red:
                assert not t.is_red(node.left) and not t.is_red(node.right)
            left,right = black_height(node.left),black_height(node.right)
            assert left == right
            return left+int(not node.red)
        avl_height(avl)
        assert not rb.red
        black_height(rb)
        checks += 2

equal(arrays.minimum_window('abc',''), '')
equal(strings.kmp('',''), [0])
equal(strings.suffix_array(''), [])
equal(strings.suffix_tree_contains('banana','xyz'), False)
equal(q.dynamic_connectivity(2,[]), [])
equal(m.crt([(2,4),(6,8)]), [6,8])
for n in range(2,400):
    equal(m.miller_rabin(n),all(n % divisor for divisor in range(2,math.isqrt(n)+1)))
for n in [9,15,25,49,91,143,221]:
    factor = m.pollard_rho(n)
    assert 1 < factor < n and n % factor == 0
    checks += 1
print(f'{checks} deterministic oracle and edge checks passed')
