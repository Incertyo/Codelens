import { beforeEach, describe, expect, it } from 'vitest';
import { heuristicDetection, modelDetection, canAutoSwitch } from "../src/features/editor/public/language-detection";
import { useStore } from "../src/features/workspace/public/store";

describe('browser language detection', () => {
  it('rejects detected TypeScript rather than assigning the JavaScript runtime', () => {
    expect(modelDetection([{ languageId: 'ts', confidence: 0.99 }])).toMatchObject({
      kind: 'unsupported',
      languageId: 'ts',
    });
    expect(
      heuristicDetection('const values: number[] = [1,2,3];\nconsole.log(values);'),
    ).toMatchObject({ kind: 'unsupported', languageId: 'ts' });
  });
  it.each([
    ['python', 'def total(values):\n    return sum(values)\nprint(total([1,2,3]))'],
    ['javascript', 'function total(values) { return values.reduce((a,b)=>a+b,0); }'],
    ['python', '#!/usr/bin/env python3\nvalues = [1,2,3,4,5]\nprint(sum(values))'],
    ['javascript', '#!/usr/bin/env node\nvar values = [1,2,3,4,5];\nprint(values);'],
  ])('detects representative %s syntax locally', (language, code) => {
    expect(heuristicDetection(code)).toMatchObject({ kind: 'supported', language });
  });
  it.each([
    'x = 1',
    '   \n\t ',
    'value = another_value + third_value + fourth_value',
    'def f(value):\n    return value\nfunction other(value) { return value; }',
    '// function pretend(argument) { return argument; }\nvalue = another_long_value',
  ])('defers short or ambiguous drafts: %s', (code) => {
    expect(heuristicDetection(code)).toEqual({ kind: 'ambiguous' });
  });
  it.each([
    '#!/bin/bash\necho "a deliberately long shell script for detection"',
    'fn main() { println!("A sufficiently long Rust program"); }',
    'package main\nfunc main() { println(123456789); }',
  ])('flags unsupported syntax', (code) => {
    expect(heuristicDetection(code).kind).toBe('unsupported');
  });
  it.each([
    ['py', 'python'],
    ['js', 'javascript'],
  ])('maps %s only to the supported set', (languageId, language) => {
    expect(modelDetection([{ languageId, confidence: 0.9 }])).toMatchObject({
      kind: 'supported',
      language,
    });
  });
  it('does not promote a supported runner-up over an unsupported winner', () => {
    expect(
      modelDetection([
        { languageId: 'rs', confidence: 0.91 },
        { languageId: 'py', confidence: 0.1 },
      ]),
    ).toMatchObject({ kind: 'unsupported', languageId: 'rs' });
    expect(modelDetection([{ languageId: 'py', confidence: 0.64 }])).toEqual({ kind: 'ambiguous' });
    expect(
      modelDetection([
        { languageId: 'py', confidence: 0.7 },
        { languageId: 'js', confidence: 0.68 },
      ]),
    ).toEqual({ kind: 'ambiguous' });
    expect(modelDetection([{ languageId: 'py', confidence: NaN }])).toEqual({ kind: 'ambiguous' });
  });
});

describe('source and choice ownership', () => {
  beforeEach(() => useStore.setState(useStore.getInitialState(), true));
  it('defaults to Auto and switches a draft from an untouched editor without modifying it', () => {
    const s = useStore.getState();
    expect(s.languageMode).toBe('auto');
    s.setCode('function total(values) { return values.length; }');
    const draft = useStore.getState();
    expect(canAutoSwitch(draft)).toBe(true);
    draft.applyDetection('javascript', draft.sourceRevision);
    expect(useStore.getState()).toMatchObject({
      language: 'javascript',
      languageMode: 'auto',
      code: draft.code,
    });
  });
  it.each(['sample', 'library', 'share'] as const)(
    'never automatically switches a %s load',
    (origin) => {
      useStore.getState().setCode('function total(values) { return values.length; }', origin);
      const s = useStore.getState();
      s.applyDetection('javascript', s.sourceRevision);
      expect(useStore.getState().language).toBe('python');
      expect(useStore.getState().code).toBe(s.code);
    },
  );
  it('never overrides explicit language choice, even after choosing Auto again', () => {
    useStore.getState().chooseLanguage('javascript');
    useStore.getState().chooseLanguage('auto');
    useStore.getState().setCode('def total(values):\n    return sum(values)');
    const s = useStore.getState();
    s.applyDetection('python', s.sourceRevision);
    expect(useStore.getState().language).toBe('javascript');
    s.applyDetection('python', s.sourceRevision, true);
    expect(useStore.getState()).toMatchObject({
      language: 'python',
      languageMode: 'python',
      languageChosenManually: true,
      code: s.code,
    });
  });
  it('ignores stale results and results during execution', () => {
    useStore.getState().setCode('function total(values) { return values.length; }');
    const s = useStore.getState();
    s.applyDetection('javascript', s.sourceRevision - 1);
    useStore.getState().updateRun({ status: 'running' });
    s.applyDetection('javascript', s.sourceRevision);
    expect(useStore.getState().language).toBe('python');
  });
  it('consumes automatic switching eligibility on the first confident interpretation', () => {
    useStore.getState().setCode('def total(values):\n    return sum(values)');
    let s = useStore.getState();
    s.applyDetection('python', s.sourceRevision);
    s = useStore.getState();
    expect(s.autoSwitchEligible).toBe(false);
    s.setCode('function total(values) { return values.length; }');
    s = useStore.getState();
    s.applyDetection('javascript', s.sourceRevision);
    expect(useStore.getState().language).toBe('python');
  });
  it('keeps a previously edited library draft as a suggestion until Switch is clicked', () => {
    useStore.getState().setCode('original library source', 'library');
    useStore.getState().chooseLanguage('auto');
    useStore.getState().setCode('function total(values) { return values.length; }');
    const s = useStore.getState();
    expect(canAutoSwitch(s)).toBe(false);
    s.applyDetection('javascript', s.sourceRevision);
    expect(useStore.getState().language).toBe('python');
    s.applyDetection('javascript', s.sourceRevision, true);
    expect(useStore.getState().code).toBe(s.code);
  });
});
