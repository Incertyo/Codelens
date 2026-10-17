'use client';
import { useStore } from '../workspace/public/store';
import { sourceDiff } from './model/analysis';
import type { useInsights } from './use-insights';

export function InsightActions({ controller }: { controller: ReturnType<typeof useInsights> }) {
  const { code, advice, tests, checking, verifyTests, rerunTest } = controller;
  if (!advice) return null;
  return <>
    {advice.optimization && <details><summary>Proposed changes · unverified</summary>
      <p>{advice.optimization.explanation}</p><p>Original lines: {advice.optimization.lines.join(', ')}. Review the diff before applying; then Run to check it.</p>
      <pre className="source-diff" aria-label="Optimization diff">{sourceDiff(code, advice.optimization.code).map((line, index) => <span key={index} className={`diff-${line.kind}`}>{line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '} {line.text}{'\n'}</span>)}</pre>
      <button className="analysis-button" onClick={() => useStore.getState().setCode(advice.optimization!.code)}>Apply proposed code to editor</button>
    </details>}
    {!!advice.tests.length && <details><summary>Suggested tests</summary>
      <p>AI expected outputs are unverified. Checking runs these suggestions in real local workers.</p>
      <button className="analysis-button" disabled={checking} onClick={() => void verifyTests()}>{checking ? 'Checking tests…' : 'Check suggested tests'}</button>
      {advice.tests.map((test, index) => {
        const checked = tests[index];
        return <div className="suggested-test" key={index}><h4>{test.name}</h4>
          <p>AI expected output · unverified: <code>{test.expectedOutput || '(empty)'}</code></p>
          {checked?.trace ? <><p>Real worker completed · {checked.trace.steps.length} steps. Observed output:</p><pre>{checked.trace.steps.at(-1)?.stdout || '(empty)'}</pre><button className="analysis-button" disabled={checking} onClick={() => void rerunTest(checked)}>Run this test</button></> : <p>{checked ? `Not runnable: ${checked.reason}` : 'Not checked yet.'}</p>}
        </div>;
      })}
    </details>}
  </>;
}
