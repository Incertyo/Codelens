import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import snapshot from '../src/generated/library.json';
import { selectQuickGoldens } from "../scripts/golden-quick-selection.mjs";

it('selects 25 references across all topics, every JS example and all recorded detector kinds', () => {
  const goldens = JSON.parse(readFileSync('tests/fixtures/revamp/catalog.json', 'utf8'));
  const selection = selectQuickGoldens(snapshot, goldens);
  expect(selection.implementations).toHaveLength(25);
  expect(new Set(selection.implementations).size).toBe(25);
  expect(selection.examples).toHaveLength(17);
  expect(selection.topics).toEqual(snapshot.index.topics.map((row) => row.id).sort());
  const kinds = [
    ...new Set(
      Object.values(goldens.cases).flatMap((row) =>
        (row as { models: { models: { kind: string }[] }[] }).models.flatMap((sample) =>
          sample.models.map((model) => model.kind),
        ),
      ),
    ),
  ].sort();
  expect(selection.modelKinds).toEqual(kinds);
  expect(selectQuickGoldens(snapshot, goldens)).toEqual(selection);
});
