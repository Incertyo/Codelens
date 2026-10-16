import { JavaScriptMeasurement } from '../javascript/measurement';
import { instrumentJavaScript } from '../javascript/instrument';
import {
  measurementRequestSchema,
  type MeasurementRequest,
  type MeasurementSize,
} from '../measurement';
import { compileJavaSubset } from './compiler';
import { inspectJavaSubset } from './analysis';
import { createJavaRuntime } from './runtime';

const execute = Function;
export function executeJavaSubsetMeasurement(
  request: MeasurementRequest,
  install?: (engine: JavaScriptMeasurement) => void,
): MeasurementSize {
  const validated = measurementRequestSchema.parse(request);
  const engine = new JavaScriptMeasurement(validated);
  install?.(engine);
  try {
    const inspection = inspectJavaSubset(validated.code);
    if (inspection.diagnostic) throw new Error(inspection.diagnostic);
    const entry = inspection.entries.find((candidate) => candidate.name === validated.entry);
    if (!entry || entry.reason || validated.args.length !== 1)
      throw new Error(entry?.reason || 'Choose a supported Java measurement entry.');
    const argument = validated.args[0];
    const integer = (value: unknown) =>
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= -2147483648 &&
      value <= 2147483647;
    if (
      !(entry.kinds.includes('int') && integer(argument)) &&
      !(entry.kinds.includes('string') && typeof argument === 'string') &&
      !(entry.kinds.includes('list') && Array.isArray(argument) && argument.every(integer))
    )
      throw new Error('Measurement arguments do not match the Java signature.');
    const compiled = compileJavaSubset(validated.code, false);
    const instrumented = instrumentJavaScript('', compiled.root);
    const entryFunction = execute(
      instrumented.hookName,
      '__java',
      `"use strict";${instrumented.code}\nreturn ${entry.name};`,
    )(
      Object.freeze({
        begin: engine.begin,
        line: engine.line,
        enter: engine.enter,
        returnValue: engine.returnValue,
        captureError: engine.captureError,
        throwValue: engine.throwValue,
        markException: engine.markException,
        caught: engine.caught,
        leave: engine.leave,
        end: engine.end,
      }),
      createJavaRuntime('', () => engine.output()),
    );
    engine.arm();
    entryFunction(...validated.args);
    return engine.result();
  } catch (error) {
    return engine.result(error);
  }
}
