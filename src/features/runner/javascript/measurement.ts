import { limits } from "@/shared/limits";
import { instrumentJavaScript } from "./instrument";
import { inspectJavaScript } from "./analysis";
import { measurementRequestSchema, type MeasurementOptions, type MeasurementRequest, type MeasurementSize } from "../measurement";

type Getters = Record<string, () => unknown>;
type Frame = { getters: Getters; returned?: unknown };
const execute = Function;
class MeasurementLimit extends Error {}

export class JavaScriptMeasurement {
  private globals: Getters = Object.create(null);
  private frames: Frame[] = [];
  private active = false;
  private entered = false;
  private armed = false;
  private options: MeasurementOptions;
  private started = performance.now();
  private events = 0;
  private lines = 0;
  private peak = 0;
  private input = 0;
  private samples = 0;
  private partial = false;
  private exhausted = false;
  constructor(private request: MeasurementRequest) {
    this.options = request.options;
  }
  arm = () => {
    this.armed = true;
  };
  private tick() {
    if (
      this.exhausted ||
      this.events >= this.options.eventBudget ||
      performance.now() - this.started >= this.options.timeoutMs
    ) {
      this.exhausted = true;
      throw new MeasurementLimit();
    }
    this.events++;
  }
  private units(roots: unknown[], bindings = 0, frames = 0) {
    let units = bindings + frames,
      visits = 0;
    const seen = new Set<object>();
    const strings = new Set<string>();
    const pending = roots.map((value) => ({ value, depth: 0 }));
    while (pending.length) {
      if (++visits > this.options.maxVisits) {
        this.partial = true;
        break;
      }
      const { value, depth } = pending.pop()!;
      if (typeof value === 'string') {
        if (!strings.has(value)) units += Math.min(limits.measurementString, value.length);
        strings.add(value);
        continue;
      }
      if (value === null || typeof value !== 'object' || seen.has(value)) continue;
      if (seen.size >= this.options.maxObjects || depth >= this.options.maxDepth) {
        this.partial = true;
        break;
      }
      seen.add(value);
      units++;
      const enqueue = (item: unknown) => {
        if (pending.length + visits >= this.options.maxVisits) {
          this.partial = true;
          return false;
        }
        pending.push({ value: item, depth: depth + 1 });
        return true;
      };
      if (Array.isArray(value)) {
        units += value.length;
        for (const key of Reflect.ownKeys(value)) {
          if (key === 'length') continue;
          if (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)
            units++;
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (!enqueue(descriptor && 'value' in descriptor ? descriptor.value : undefined)) break;
        }
      } else if (ArrayBuffer.isView(value)) {
        units += 'length' in value ? Number(value.length) : value.byteLength;
      } else if (value instanceof ArrayBuffer) {
        units += value.byteLength;
      } else if (value instanceof Map) {
        units += value.size;
        for (const [key, item] of Map.prototype.entries.call(value))
          if (!enqueue(key) || !enqueue(item)) break;
      } else if (value instanceof Set) {
        units += value.size;
        for (const item of Set.prototype.values.call(value)) if (!enqueue(item)) break;
      } else {
        for (const key of Reflect.ownKeys(value)) {
          units++;
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (!enqueue(descriptor && 'value' in descriptor ? descriptor.value : undefined)) break;
        }
      }
      if ((visits & 255) === 0 && performance.now() - this.started >= this.options.timeoutMs) {
        this.exhausted = true;
        throw new MeasurementLimit();
      }
    }
    return units;
  }
  private sample() {
    if (!this.active || this.partial) return;
    const roots: unknown[] = [];
    let bindings = 0;
    for (const getters of [this.globals, ...this.frames.map((frame) => frame.getters)]) {
      for (const [name, get] of Object.entries(getters)) {
        try {
          const value = get();
          if (name === 'this') {
            if (value !== undefined && value !== globalThis) roots.push(value);
            continue;
          }
          bindings++;
          if (typeof value !== 'function') roots.push(value);
        } catch {}
      }
    }
    for (const frame of this.frames) if (frame.returned !== undefined) roots.push(frame.returned);
    this.samples++;
    this.peak = Math.max(this.peak, this.units(roots, bindings, this.frames.length));
  }
  begin = (getters: Getters) => {
    this.tick();
    this.globals = getters;
  };
  end = () => {
    this.tick();
  };
  line = (_line: number, getters: Getters) => {
    this.tick();
    const frame = this.frames.at(-1);
    if (!this.active || !frame) return;
    frame.getters = getters;
    this.lines++;
    if (this.lines <= this.options.sampleEvery || this.lines % this.options.sampleEvery === 0)
      this.sample();
  };
  enter = (_name: string, _line: number, getters: Getters) => {
    this.tick();
    if (!this.armed) return;
    if (!this.entered) {
      this.entered = true;
      this.active = true;
      this.input = this.units(this.request.args);
      this.request.args = [];
    }
    if (!this.active) return;
    this.frames.push({ getters });
    this.sample();
  };
  returnValue = (value: unknown) => {
    const frame = this.frames.at(-1);
    if (frame) frame.returned = value;
    return value;
  };
  leave = () => {
    this.tick();
    this.sample();
    this.frames.pop();
  };
  output = () => {
    this.tick();
  };
  captureError = () => {};
  markException = () => {};
  caught = (_line: number, _error: unknown, getters: Getters) => {
    this.tick();
    const frame = this.frames.at(-1);
    if (frame) frame.getters = getters;
    this.sample();
  };
  throwValue = (_line: number, error: unknown) => error;
  result(error?: unknown): MeasurementSize {
    this.armed = this.active = false;
    const failed = arguments.length > 0;
    return {
      n: this.request.n,
      status: this.exhausted
        ? 'budget-exceeded'
        : failed
          ? 'error'
          : this.partial
            ? 'partial'
            : 'complete',
      lineEvents: this.lines,
      events: this.events,
      totalPeak: this.peak,
      auxiliaryPeak: Math.max(0, this.peak - this.input),
      inputUnits: this.input,
      samples: this.samples,
      reason: this.exhausted
        ? 'Measurement event or execution-time budget exceeded.'
        : failed
          ? String(error instanceof Error ? `${error.name}: ${error.message}` : error).slice(0, limits.measurementReason)
          : this.partial
            ? 'Memory traversal bound reached; this size is partial and excluded from fits.'
            : null,
    };
  }
}

export function executeJavaScriptMeasurement(
  request: MeasurementRequest,
  install?: (engine: JavaScriptMeasurement) => void,
): MeasurementSize {
  const validated = measurementRequestSchema.parse(request);
  const engine = new JavaScriptMeasurement(validated);
  install?.(engine);
  try {
    const inspected = inspectJavaScript(validated.code);
    if (inspected.diagnostic || inspected.preparationReason)
      throw new Error(inspected.diagnostic || inspected.preparationReason!);
    if (
      !/^[A-Za-z_$][\w$]*$/.test(validated.entry) ||
      inspected.entries.filter((entry) => entry.name === validated.entry).length !== 1
    )
      throw new Error('Choose a unique named top-level entry function.');
    const instrumented = instrumentJavaScript(inspected.moduleCode);
    const entry = execute(
      instrumented.hookName,
      `"use strict";\n${instrumented.code}\nreturn ${validated.entry};`,
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
    );
    engine.arm();
    entry(...validated.args);
    return engine.result();
  } catch (error) {
    return engine.result(error);
  }
}
