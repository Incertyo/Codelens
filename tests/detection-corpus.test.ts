import { expect, it } from 'vitest';
import { detectionCorpus } from "./fixtures/language-detection-corpus";

it('labels 40 authored local cases evenly across supported and unsupported classes', () => {
  expect(detectionCorpus).toHaveLength(40);
  expect(new Set(detectionCorpus.map((row) => row.id)).size).toBe(40);
  for (const label of ['python', 'javascript', 'ts', 'cpp', 'java'])
    expect(detectionCorpus.filter((row) => row.label === label)).toHaveLength(8);
  expect(
    detectionCorpus.every(
      (row) => row.code.replace(/\s/g, '').length >= 32 && row.code.length <= 30000,
    ),
  ).toBe(true);
});
