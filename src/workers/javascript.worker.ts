import { instrumentJavaScript } from '../lib/javascript/instrument';
import { analyzeJavaScript } from '../lib/javascript/ast';
import { JavaScriptTrace } from '../lib/javascript/runtime';
import { inspectJavaScript } from '../lib/javascript/analysis';
import {
  executeJavaScriptMeasurement,
  type JavaScriptMeasurement,
} from '../lib/javascript/measurement';
import { measurementRequestSchema, type MeasurementRequest } from '../lib/measurement';
import { compileJavaSubset } from '../lib/java/compiler';
import { createJavaRuntime } from '../lib/java/runtime';
import { analyzeJavaSubset, inspectJavaSubset } from '../lib/java/analysis';
import { executeJavaSubsetMeasurement } from '../lib/java/measurement';
const execute = Function;
const trustedPost = self.postMessage.bind(self);
self.onmessage = ({ data: bootstrap }: { data: { nonce: string; mode: string } }) => {
  if (bootstrap.mode !== 'bootstrap' || typeof bootstrap.nonce !== 'string') return;
  const nonce = bootstrap.nonce;
  const send = (message: object) => trustedPost({ ...message, nonce });
  let currentMeasurement: JavaScriptMeasurement | null = null;
  let measurementLocked = false;
  const blockedProtocol = () => {
    throw new Error('Worker protocol messages are private.');
  };
  const receive = ({
    data,
  }: {
    data: {
      code: string;
      stdin: string;
      maxSteps: number;
      mode?: string;
      nonce: string;
      runNonce?: string;
      measurement?: MeasurementRequest;
      language?: string;
    };
  }) => {
    if (data.nonce !== nonce) return;
    self.onmessage = null;
    for (let target: object | null = self; target; target = Object.getPrototypeOf(target)) {
      if (Object.hasOwn(target, 'postMessage'))
        Object.defineProperty(target, 'postMessage', {
          value: blockedProtocol,
          writable: false,
          configurable: false,
        });
    }
    if (data.mode === 'measure') {
      if (typeof data.runNonce !== 'string') return;
      const runNonce = data.runNonce;
      const sendMeasurement = (message: object) => trustedPost({ ...message, nonce: runNonce });
      sendMeasurement({ type: 'started' });
      try {
        if (new TextEncoder().encode(JSON.stringify(data.measurement)).length > 1_048_576)
          throw new Error('Measurement request is too large.');
        const request = measurementRequestSchema.parse(data.measurement);
        if (!measurementLocked) {
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
            Object.defineProperty(self, key, {
              value: blocked,
              writable: false,
              configurable: false,
            });
          const output = () => currentMeasurement?.output();
          Object.defineProperty(self, 'console', {
            value: Object.freeze({ log: output, info: output, warn: output, error: output }),
            writable: false,
            configurable: false,
          });
          Object.defineProperty(self, 'input', {
            value: () => {
              throw new Error('Measurement has no stdin.');
            },
            writable: false,
            configurable: false,
          });
          measurementLocked = true;
        }
        sendMeasurement({
          type: 'measurement',
          measurement: (data.language === 'java'
            ? executeJavaSubsetMeasurement
            : executeJavaScriptMeasurement)(request, (engine) => {
            currentMeasurement = engine;
          }),
        });
      } catch {
        sendMeasurement({ type: 'error', message: 'Invalid measurement request.' });
      } finally {
        currentMeasurement = null;
        self.onmessage = receive;
      }
      return;
    }
    send({ type: 'started' });
    if (data.mode === 'inspect') {
      send({
        type: 'inspection',
        inspection:
          data.language === 'java' ? inspectJavaSubset(data.code) : inspectJavaScript(data.code),
      });
      return;
    }
    if (data.mode === 'analyze') {
      send({
        type: 'outline',
        outline:
          data.language === 'java' ? analyzeJavaSubset(data.code) : analyzeJavaScript(data.code),
      });
      return;
    }
    const trace = new JavaScriptTrace(Math.min(5000, Math.max(10, data.maxSteps || 5000)));
    try {
      const instrumented = instrumentJavaScript(
        data.language === 'java' ? '' : data.code,
        data.language === 'java' ? compileJavaSubset(data.code).root : undefined,
      );
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
        ...(data.language === 'java' ? ['__java'] : []),
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
        ...(data.language === 'java' ? [createJavaRuntime(data.stdin, trace.writeOutput)] : []),
      );
      send({
        type: 'result',
        result: {
          ...trace.result(),
          ...(data.language === 'java' ? { execution: 'java-subset-v1' } : {}),
        },
      });
    } catch (error) {
      send({
        type: 'result',
        result: {
          ...trace.result(error),
          ...(data.language === 'java' ? { execution: 'java-subset-v1' } : {}),
        },
      });
    }
  };
  self.onmessage = receive;
  send({ type: 'ready' });
};
