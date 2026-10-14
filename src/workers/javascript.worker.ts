import { instrumentJavaScript } from '../lib/javascript/instrument';
import { analyzeJavaScript } from '../lib/javascript/ast';
import { JavaScriptTrace } from '../lib/javascript/runtime';
import { inspectJavaScript } from '../lib/javascript/analysis';
const execute = Function;
const send = self.postMessage.bind(self);
self.onmessage = ({
  data,
}: {
  data: { code: string; stdin: string; maxSteps: number; mode?: string };
}) => {
  if (data.mode === 'inspect') { send({type:'inspection', inspection:inspectJavaScript(data.code)}); return; }
  if (data.mode === 'analyze') {
    send({ type: 'outline', outline: analyzeJavaScript(data.code) });
    return;
  }
  const trace = new JavaScriptTrace(Math.min(5000, Math.max(10, data.maxSteps || 5000)));
  send({ type: 'started' });
  try {
    const instrumented = instrumentJavaScript(data.code);
    const blocked = () => {
      throw new Error(
        'Network access and asynchronous work are disabled in the execution sandbox.',
      );
    };
    for (const key of [
      'fetch',
      'XMLHttpRequest',
      'importScripts',
      'WebSocket',
      'WebTransport',
      'EventSource',
      'Worker',
      'SharedWorker',
      'open',
      'setTimeout',
      'setInterval',
      'queueMicrotask',
    ])
      Object.defineProperty(self, key, { value: blocked, writable: false, configurable: false });
    Object.defineProperty(self, 'console', {
      value: Object.freeze({
        log: trace.output,
        info: trace.output,
        warn: trace.output,
        error: trace.output,
      }),
      writable: false,
      configurable: false,
    });
    const lines = data.stdin.length ? data.stdin.split(/\r?\n/) : [];
    if (data.stdin.endsWith('\n')) lines.pop();
    let cursor = 0;
    Object.defineProperty(self, 'input', {
      value: () => {
        if (cursor >= lines.length) throw new Error('No more stdin values.');
        return lines[cursor++];
      },
      writable: false,
      configurable: false,
    });
    execute(
      instrumented.hookName,
      `"use strict";\n${instrumented.code}`,
    )(
      Object.freeze({
        begin: trace.begin,
        line: trace.line,
        enter: trace.enter,
        returnValue: trace.returnValue,
        captureError: trace.captureError,
        throwValue: trace.throwValue,
        markException: trace.markException,
        caught: trace.caught,
        leave: trace.leave,
        end: trace.end,
      }),
    );
    send({ type: 'result', result: trace.result() });
  } catch (error) {
    send({ type: 'result', result: trace.result(error) });
  }
};
