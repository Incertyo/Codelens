import math


def cross(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def on_segment(a, b, p):
    return cross(a,b,p) == 0 and min(a[0],b[0]) <= p[0] <= max(a[0],b[0]) and min(a[1],b[1]) <= p[1] <= max(a[1],b[1])


def segment_intersection(a, b, c, d):
    first, second, third, fourth = cross(a,b,c), cross(a,b,d), cross(c,d,a), cross(c,d,b)
    if ((first > 0 and second < 0) or (first < 0 and second > 0)) and ((third > 0 and fourth < 0) or (third < 0 and fourth > 0)):
        return True
    return on_segment(a,b,c) or on_segment(a,b,d) or on_segment(c,d,a) or on_segment(c,d,b)


def point_in_polygon(polygon, point):
    inside = False
    for i, a in enumerate(polygon):
        b = polygon[(i + 1) % len(polygon)]
        if on_segment(a,b,point):
            return True
        if (a[1] > point[1]) != (b[1] > point[1]):
            x = a[0] + (point[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
            if point[0] < x:
                inside = not inside
    return inside


def polygon_area(polygon):
    total = 0
    for i, a in enumerate(polygon):
        b = polygon[(i + 1) % len(polygon)]
        total += a[0] * b[1] - a[1] * b[0]
    return abs(total) / 2


def line_intersection(a, b, c, d):
    """Infinite lines; None denotes parallel or coincident lines."""
    first, second = (b[0]-a[0],b[1]-a[1]), (d[0]-c[0],d[1]-c[1])
    denominator = first[0] * second[1] - first[1] * second[0]
    if denominator == 0:
        return None
    difference = (c[0]-a[0],c[1]-a[1])
    ratio = (difference[0] * second[1] - difference[1] * second[0]) / denominator
    return [a[0] + ratio * first[0], a[1] + ratio * first[1]]


def circle_intersection(a, radius_a, b, radius_b):
    """Nonnegative radii; None for infinitely many points, [] for no intersection."""
    distance = math.dist(a,b)
    if distance == 0:
        return None if radius_a == radius_b else []
    if distance > radius_a + radius_b or distance < abs(radius_a - radius_b):
        return []
    along = (radius_a**2 - radius_b**2 + distance**2) / (2 * distance)
    height = math.sqrt(max(0, radius_a**2 - along**2))
    dx, dy = (b[0]-a[0])/distance, (b[1]-a[1])/distance
    center = (a[0]+along*dx,a[1]+along*dy)
    first = [center[0]-height*dy,center[1]+height*dx]
    if height == 0:
        return [first]
    return [first,[center[0]+height*dy,center[1]-height*dx]]


def graham(points):
    points = sorted(set(tuple(p) for p in points))
    if len(points) < 2:
        return [list(p) for p in points]
    pivot = min(points, key=lambda p: (p[1],p[0]))
    candidates = sorted((p for p in points if p != pivot), key=lambda p: (math.atan2(p[1]-pivot[1],p[0]-pivot[0]), math.dist(p,pivot)))
    hull = [pivot]
    for point in candidates:
        while len(hull) > 1 and cross(hull[-2],hull[-1],point) <= 0:
            hull.pop()
        hull.append(point)
    return [list(p) for p in hull]


def monotone_hull(points):
    points = sorted(set(tuple(p) for p in points))
    if len(points) < 2:
        return [list(p) for p in points]
    def chain(points):
        hull = []
        for point in points:
            while len(hull) > 1 and cross(hull[-2],hull[-1],point) <= 0:
                hull.pop()
            hull.append(point)
        return hull
    return [list(p) for p in chain(points)[:-1] + chain(reversed(points))[:-1]]


def jarvis(points):
    points = sorted(set(tuple(p) for p in points))
    if len(points) < 2:
        return [list(p) for p in points]
    hull, start, current = [], points[0], points[0]
    while True:
        hull.append(list(current))
        candidate = next(p for p in points if p != current)
        for point in points:
            turn = cross(current,candidate,point)
            if turn < 0 or (turn == 0 and math.dist(current,point) > math.dist(current,candidate)):
                candidate = point
        current = candidate
        if current == start:
            return hull


def calipers(points):
    hull = monotone_hull(points)
    if len(hull) < 2:
        return 0.0
    if len(hull) == 2:
        return math.dist(hull[0],hull[1])
    opposite, best, n = 1, 0.0, len(hull)
    for i in range(n):
        following = (i + 1) % n
        while abs(cross(hull[i],hull[following],hull[(opposite + 1) % n])) > abs(cross(hull[i],hull[following],hull[opposite])):
            opposite = (opposite + 1) % n
        best = max(best, math.dist(hull[i],hull[opposite]), math.dist(hull[following],hull[opposite]))
    return best


def closest(points):
    """Divide-and-conquer distance; sorting each strip gives O(n log^2 n)."""
    def solve(points):
        if len(points) <= 3:
            return min((math.dist(points[i],points[j]) for i in range(len(points)) for j in range(i)), default=float('inf'))
        middle = len(points) // 2
        distance = min(solve(points[:middle]), solve(points[middle:]))
        strip = sorted((p for p in points if abs(p[0]-points[middle][0]) < distance), key=lambda p: p[1])
        for i in range(len(strip)):
            for j in range(i + 1, min(i + 8,len(strip))):
                distance = min(distance,math.dist(strip[i],strip[j]))
        return distance
    return solve(sorted(points))


def sweep_intersections(segments):
    """Endpoint sweep with an active interval set and exact segment checks.
    O(n^2) worst case; this is not the Bentley–Ottmann event algorithm.
    """
    events = sorted((min(a[0],b[0]), max(a[0],b[0]), i) for i,(a,b) in enumerate(segments))
    active, result = [], []
    for start, end, index in events:
        active = [(right,other) for right,other in active if right >= start]
        for right, other in active:
            if segment_intersection(*segments[index], *segments[other]):
                result.append(sorted([other,index]))
        active.append((end,index))
    return sorted(result)


def kd_nearest(points, target):
    def build(points, depth):
        if not points:
            return None
        axis = depth % len(target)
        points = sorted(points, key=lambda p: p[axis])
        middle = len(points) // 2
        return [points[middle],axis,build(points[:middle],depth+1),build(points[middle+1:],depth+1)]
    best, best_distance = None, float('inf')
    def visit(node):
        nonlocal best, best_distance
        if node is None:
            return
        point, axis, left, right = node
        distance = math.dist(point,target)
        if distance < best_distance:
            best, best_distance = point, distance
        difference = target[axis] - point[axis]
        near, far = (left,right) if difference < 0 else (right,left)
        visit(near)
        if abs(difference) <= best_distance:
            visit(far)
    visit(build(points,0))
    return list(best) if best is not None else None


def half_planes(planes, bound=10):
    """Clip a bounding square by a*x+b*y<=c. Returns the bounded intersection.
    The chosen square is part of the problem; unbounded regions are clipped.
    """
    polygon = [[-bound,-bound],[bound,-bound],[bound,bound],[-bound,bound]]
    for a,b,c in planes:
        result = []
        for i, first in enumerate(polygon):
            second = polygon[(i + 1) % len(polygon)]
            f, s = a*first[0]+b*first[1]-c, a*second[0]+b*second[1]-c
            if f <= 0:
                result.append(first)
            if (f <= 0) != (s <= 0):
                ratio = f / (f-s)
                result.append([first[0]+ratio*(second[0]-first[0]),first[1]+ratio*(second[1]-first[1])])
        polygon = result
    return polygon


DEMOS = {
    'orientation-via-cross-product': ('cross((0,0),(2,0),(1,1))', 2),
    'segment-intersection': ('segment_intersection((0,0),(2,2),(0,2),(2,0))', True),
    'point-in-polygon': ('point_in_polygon([(0,0),(4,0),(4,4),(0,4)], (2,2))', True),
    'polygon-area': ('polygon_area([(0,0),(4,0),(4,3),(0,3)])', 12.0),
    'line-intersection': ('line_intersection((0,0),(2,2),(0,2),(2,0))', [1.0,1.0]),
    'circle-intersection': ('circle_intersection((0,0), 1, (2,0), 1)', [[1.0,0.0]]),
    'graham-scan-convex-hull': ('graham([(0,0),(2,0),(2,2),(0,2),(1,1)])', [[0,0],[2,0],[2,2],[0,2]]),
    'andrew-monotone-chain-hull': ('monotone_hull([(0,0),(2,0),(2,2),(0,2),(1,1)])', [[0,0],[2,0],[2,2],[0,2]]),
    'jarvis-march': ('jarvis([(0,0),(2,0),(2,2),(0,2),(1,1)])', [[0,0],[2,0],[2,2],[0,2]]),
    'rotating-calipers': ('calipers([(0,0),(3,0),(3,4),(0,4)])', 5.0),
    'closest-pair-of-points': ('closest([(0,0),(5,5),(1,0),(8,8)])', 1.0),
    'sweep-line-geometric-intersection': ('sweep_intersections([[(0,0),(2,2)],[(0,2),(2,0)],[(3,0),(4,1)]])', [[0,1]]),
    'kd-tree-nearest-neighbor-search': ('kd_nearest([(0,0),(5,5),(2,1)], (2,2))', [2,1]),
    'half-plane-intersection': ('polygon_area(half_planes([(-1,0,0),(0,-1,0),(1,0,2),(0,1,3)]))', 6.0),
}
