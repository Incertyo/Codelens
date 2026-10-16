import { describe, it, expect } from 'vitest';
import { algorithmTopics, algorithms, searchAlgorithms } from "../src/lib/algorithm-catalog";
import { examples } from "../src/lib/examples";
describe('algorithm library integrity', () => {
  it('contains a broad, linked hierarchy without duplicate IDs', () => {
    expect(algorithmTopics.length).toBeGreaterThanOrEqual(16);
    expect(algorithms.length).toBeGreaterThanOrEqual(300);
    expect(new Set(algorithms.map((a) => a.id)).size).toBe(algorithms.length);
    for (const topic of algorithmTopics)
      for (const sub of topic.subtopics)
        for (const algorithm of sub.algorithms) {
          expect(algorithm.topicId).toBe(topic.id);
          expect(algorithm.subtopicId).toBe(sub.id);
          expect(algorithm.description.length).toBeGreaterThan(15);
        }
  });
  it('searches names, techniques and topics globally and handles an empty result', () => {
    expect(searchAlgorithms('dijkstra').some((a) => a.name === 'Dijkstra’s algorithm')).toBe(true);
    expect(searchAlgorithms('BFS').some((a) => a.exampleId === '04')).toBe(true);
    expect(searchAlgorithms('DSU').some((a) => a.exampleId === '14')).toBe(true);
    expect(searchAlgorithms('binary indexed tree').some((a) => a.name === 'Fenwick tree')).toBe(
      true,
    );
    expect(searchAlgorithms('shortest graphs').length).toBeGreaterThan(0);
    expect(searchAlgorithms('totally-unknown-algorithm')).toEqual([]);
  });
  it('maps every runnable library entry to a real sample', () => {
    const ids = algorithms.flatMap((a) => (a.exampleId ? [a.exampleId] : []));
    expect(new Set(ids).size).toBe(examples.length);
    for (const id of ids) {
      const sample = examples.find((e) => e.id === id)!;
      expect(sample).toBeDefined();
      expect(sample.code.trim().length).toBeGreaterThan(20);
    }
    expect(new Set(examples.map((e) => e.id)).size).toBe(examples.length);
  });
});
