import catalog from '../../src/generated/library.json';
import { examples } from "../../src/lib/examples";
import { exampleCode } from "../../src/lib/javascript-examples";

export type DetectionLabel = 'python' | 'javascript' | 'ts' | 'cpp' | 'java';
export type DetectionCase = { id: string; label: DetectionLabel; code: string };
const reference = catalog.index.implementations.filter(
  (row) => row.language === 'python' && row.variant === 'reference',
);
const python = reference
  .filter((_, index) => index % 40 === 0)
  .slice(0, 8)
  .map((row) => ({
    id: row.id,
    label: 'python' as const,
    code: catalog.implementations.find((implementation) => implementation.id === row.id)!.code,
  }));
const javascript = examples
  .slice(0, 8)
  .map((example) => ({
    id: `example:${example.id}`,
    label: 'javascript' as const,
    code: exampleCode(example, 'javascript'),
  }));
const unsupported: Record<'ts' | 'cpp' | 'java', string[]> = {
  ts: [
    'interface Point { x: number; y: number; }\nfunction distance(p: Point) { return Math.hypot(p.x,p.y); }',
    'function total(values: number[]): number { let sum=0; for(const value of values) sum+=value; return sum; }',
    'const values: number[] = [3,1,2,4];\nvalues.sort((a,b)=>a-b);\nconsole.log(values);',
    'class Counter { private value: number = 0; increment(): number { return ++this.value; } }',
    'const total = (values: number[]): number => values.reduce((sum,value)=>sum+value,0);',
    'enum Direction { North, South, East, West }\nconst direction = Direction.North;\nconsole.log(direction);',
    'type Pair = [number, number];\nconst origin: Pair = [0,0];\nconsole.log(origin);',
    'function first<T>(values: T[]): T | undefined { return values.length ? values[0] : undefined; }',
  ],
  cpp: [
    '#include <iostream>\nint main() { int sum=0; for(int i=0;i<10;i++) sum+=i; std::cout << sum; }',
    '#include <vector>\n#include <algorithm>\nint main() { std::vector<int> values{3,1,2}; std::sort(values.begin(),values.end()); }',
    'int binary_search(const int* values, int size, int target) { int lo=0,hi=size-1; while(lo<=hi){int mid=(lo+hi)/2;if(values[mid]==target)return mid;if(values[mid]<target)lo=mid+1;else hi=mid-1;} return -1; }',
    'template<typename T> T maximum(T a, T b) { return a > b ? a : b; }\nint main() { return maximum(3,7); }',
    'struct Node { int value; Node* next; explicit Node(int value):value(value),next(nullptr){} };\nint main(){Node first(1);}',
    '#include <queue>\nint main(){std::queue<int> queue;queue.push(1);queue.push(2);queue.pop();return queue.front();}',
    '#include <numeric>\n#include <vector>\nint main(){std::vector<int> values{1,2,3};return std::accumulate(values.begin(),values.end(),0);}',
    'class Counter { private: int value=0; public: int next() { return ++value; } };\nint main() { Counter counter; return counter.next(); }',
  ],
  java: [
    'public class Main { public static void main(String[] args) { int sum=0;for(int i=0;i<10;i++)sum+=i;System.out.println(sum); } }',
    'class Counter { private int value = 0; int increment() { return ++value; } int current() { return value; } }',
    'import java.util.ArrayList;\nclass Values { static ArrayList<Integer> create() { ArrayList<Integer> values=new ArrayList<>();values.add(1);return values; } }',
    'public class Search { public static int find(int[] values,int target) { for(int i=0;i<values.length;i++) if(values[i]==target)return i; return -1; } }',
    'class Node { final int value; Node next; Node(int value,Node next) { this.value=value;this.next=next; } }',
    'public class Fibonacci { public static int fib(int n) { if(n<2)return n;return fib(n-1)+fib(n-2); } }',
    'enum Direction { NORTH, SOUTH, EAST, WEST; boolean vertical() { return this==NORTH || this==SOUTH; } }',
    'public class Main { public static void main(String[] args) { String text="level";System.out.println(new StringBuilder(text).reverse().toString()); } }',
  ],
};
export const detectionCorpus: DetectionCase[] = [
  ...python,
  ...javascript,
  ...Object.entries(unsupported).flatMap(([label, codes]) =>
    codes.map((code, index) => ({
      id: `${label}:${index + 1}`,
      label: label as DetectionLabel,
      code,
    })),
  ),
];
