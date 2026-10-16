import { limits } from "@/shared/limits";
import type { HeapObject, Step, TraceResult, Value } from "../../../shared/trace";
import { MAX_TRACE_BYTES, TRACE_NOTICE_RESERVE } from "../../../shared/trace";
type Getters = Record<string, () => unknown>;
type Frame = {
  id: string;
  func: string;
  line: number;
  getters: Getters;
  returned?: unknown;
  exception?: boolean;
  constructorCall?: boolean;
};
export class TraceLimit extends Error {}
export class JavaScriptTrace {
  readonly steps: Step[] = [];
  private frames: Frame[] = [];
  private globals: Getters = Object.create(null);
  private lastActive: Frame[] = [];
  private identities = new WeakMap<object, string>();
  private objectCount = 0;
  private callCount = 0;
  private stdout = '';
  private specialIds = new Map<string, string>();
  private started = performance.now();
  private lastLine = 1;
  private errorOrigins = new Map<unknown, { line: number; frames: Frame[] }>();
  private serializedBytes = 2;
  private limitMessage: string | null = null;
  private encoder = new TextEncoder();
  constructor(private maxSteps: number = limits.steps) {}
  private append(step: Step) {
    const bytes = this.encoder.encode(JSON.stringify(step)).length + 1;
    if (this.serializedBytes + bytes > MAX_TRACE_BYTES - TRACE_NOTICE_RESERVE) {
      this.limitMessage = 'Trace stopped at the serialized-size safety limit.';
      throw new TraceLimit(this.limitMessage);
    }
    this.serializedBytes += bytes;
    this.steps.push(step);
  }
  private check() {
    if (
      this.limitMessage ||
      this.steps.length >= this.maxSteps - 1 ||
      performance.now() - this.started > limits.traceTimeoutMs
    ) {
      this.limitMessage ??=
        'Trace stopped at the safety limit. The program may contain an infinite loop.';
      throw new TraceLimit(this.limitMessage);
    }
  }
  private snapshot(
    event: Step['event'],
    line = this.lastLine,
    explanation?: string,
    frames = this.frames,
  ): Step {
    const heap: Record<string, HeapObject> = Object.create(null);
    const special = (type: string, text: string): Value => {
      const key = type + ':' + text;
      let ref = this.specialIds.get(key);
      if (!ref) {
        ref = `h${++this.objectCount}`;
        this.specialIds.set(key, ref);
      }
      if (!heap[ref] && Object.keys(heap).length >= limits.heapObjects) return '[value truncated]';
      heap[ref] = { type, fields: Object.assign(Object.create(null), { value: text }) };
      return { ref };
    };
    const value = (v: unknown, depth = 0): Value => {
      if (v === null || typeof v === 'boolean') return v;
      if (typeof v === 'number') return Number.isFinite(v) ? v : special('number', String(v));
      if (typeof v === 'string') return v.slice(0, limits.valueCharacters) + (v.length > limits.valueCharacters ? '…' : '');
      if (typeof v === 'bigint') return special('bigint', v.toString().slice(0, limits.valueCharacters) + 'n');
      if (v === undefined) return special('undefined', 'undefined');
      if (typeof v === 'function') return '<function>';
      if (typeof v === 'symbol') return String(v);
      if (typeof v !== 'object') return String(v);
      let ref = this.identities.get(v);
      if (!ref) {
        ref = `h${++this.objectCount}`;
        this.identities.set(v, ref);
      }
      if (heap[ref]) return { ref };
      if (Object.keys(heap).length >= limits.heapObjects || depth >= limits.snapshotDepth) return '[value truncated]';
      const obj: HeapObject = {
        type: Array.isArray(v)
          ? 'array'
          : v instanceof Map
            ? 'map'
            : v instanceof Set
              ? 'set'
              : 'object',
      };
      heap[ref] = obj;
      if (Array.isArray(v)) {
        obj.items = v.slice(0, limits.collectionElements).map((i) => value(i, depth + 1));
        obj.truncated = v.length > limits.collectionElements;
      } else if (v instanceof Map) {
        obj.entries = [];
        let n = 0;
        for (const [k, item] of v) {
          if (n++ >= limits.collectionElements) break;
          obj.entries.push([value(k, depth + 1), value(item, depth + 1)]);
        }
        obj.truncated = v.size > limits.collectionElements;
      } else if (v instanceof Set) {
        obj.items = [];
        let n = 0;
        for (const item of v) {
          if (n++ >= limits.collectionElements) break;
          obj.items.push(value(item, depth + 1));
        }
        obj.truncated = v.size > limits.collectionElements;
      } else {
        const fields: Record<string, Value> = Object.create(null);
        const descriptors = Object.getOwnPropertyDescriptors(v);
        const names = Object.keys(descriptors);
        for (const key of names.slice(0, limits.collectionElements)) {
          const descriptor = descriptors[key];
          fields[key] = 'value' in descriptor ? value(descriptor.value, depth + 1) : '[accessor]';
        }
        obj.fields = fields;
        obj.truncated = names.length > limits.collectionElements;
      }
      return { ref };
    };
    const vars = (getters: Getters) => {
      const result: Record<string, Value> = Object.create(null);
      for (const [name, get] of Object.entries(getters).slice(0, limits.variables)) {
        try {
          const v = get();
          if (typeof v === 'function' || (name === 'this' && (v === undefined || v === globalThis)))
            continue;
          result[name] = value(v);
        } catch {}
      }
      return result;
    };
    const callStack = frames.slice(-limits.frames).map((frame) => ({
      id: frame.id,
      func: frame.func,
      line: frame.line,
      locals: vars(frame.getters),
    }));
    if (event === 'return' && callStack.length)
      callStack[callStack.length - 1].locals['↳ return'] = value(frames.at(-1)?.returned);
    const step: Step = {
      index: this.steps.length,
      line: Math.max(1, line),
      event,
      func: frames.at(-1)?.func ?? '<module>',
      callStack,
      globals: vars(this.globals),
      heap,
      stdout: this.stdout,
    };
    if (explanation) step.explanation = explanation;
    return step;
  }
  begin = (getters: Getters) => {
    this.globals = getters;
    this.frames = [{ id: `c${++this.callCount}`, func: '<module>', line: 1, getters }];
    this.append(this.snapshot('call', 1));
  };
  line = (line: number, getters: Getters) => {
    this.check();
    this.lastLine = line;
    const frame = this.frames.at(-1);
    if (frame) {
      frame.line = line;
      frame.getters = getters;
    }
    this.lastActive = this.frames.map((f) => ({ ...f }));
    this.append(this.snapshot('line', line));
  };
  enter = (func: string, line: number, getters: Getters, constructorCall = false) => {
    this.check();
    this.frames.push({ id: `c${++this.callCount}`, func, line, getters, constructorCall });
    this.lastActive = this.frames.map((f) => ({ ...f }));
    this.append(this.snapshot('call', line));
  };
  returnValue = (value: unknown) => {
    const frame = this.frames.at(-1);
    if (frame) frame.returned = value;
    return value;
  };
  captureError = (error: unknown) => {
    if (!this.errorOrigins.has(error))
      this.errorOrigins.set(error, {
        line: this.lastLine,
        frames: this.lastActive.map((frame) => ({ ...frame })),
      });
  };
  throwValue = (line: number, error: unknown, getters: Getters) => {
    this.lastLine = line;
    const frame = this.frames.at(-1);
    if (frame) {
      frame.line = line;
      frame.getters = getters;
    }
    this.lastActive = this.frames.map((f) => ({ ...f }));
    this.errorOrigins.set(error, { line, frames: this.lastActive.map((f) => ({ ...f })) });
    return error;
  };
  markException = (error: unknown) => {
    const frame = this.frames.at(-1);
    if (frame) frame.exception = true;
    this.captureError(error);
  };
  caught = (line: number, error: unknown, getters: Getters) => {
    this.check();
    const origin = this.errorOrigins.get(error);
    const frame = this.frames.at(-1);
    if (frame) {
      frame.line = line;
      frame.getters = getters;
    }
    this.append(
      this.snapshot(
        'exception',
        origin?.line ?? this.lastLine,
        this.errorText(error),
        origin?.frames ?? this.frames,
      ),
    );
    this.errorOrigins.delete(error);
  };
  leave = () => {
    const frame = this.frames.at(-1);
    if (!frame) return;
    if (!frame.exception) {
      if (
        frame.constructorCall &&
        (frame.returned === null || !['object', 'function'].includes(typeof frame.returned))
      ) {
        try {
          frame.returned = frame.getters.this();
        } catch {}
      }
      this.check();
      this.append(this.snapshot('return', frame.line));
    }
    this.frames.pop();
    const parent = this.frames.at(-1);
    if (parent) {
      this.lastLine = parent.line;
      this.lastActive = this.frames.map((f) => ({ ...f }));
    }
  };
  end = () => {
    this.leave();
  };
  output = (...values: unknown[]) => {
    this.writeOutput(
      values.map((v) => (typeof v === 'string' ? v : this.format(v))).join(' ') + '\n',
    );
  };
  writeOutput = (text: string) => {
    this.check();
    this.stdout = (this.stdout + text).slice(0, limits.stdout);
    this.append(this.snapshot('output'));
  };
  private format(v: unknown): string {
    try {
      return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
    } catch {
      return '[circular object]';
    }
  }
  private errorText(error: unknown): string {
    return error instanceof Error
      ? `${error.name}: ${error.message}`.slice(0, 500)
      : `Thrown: ${String(error)}`.slice(0, 500);
  }
  result(error?: unknown): TraceResult {
    const failed = arguments.length > 0;
    if (
      !this.steps.length &&
      error &&
      typeof error === 'object' &&
      'loc' in error &&
      error.loc &&
      typeof error.loc === 'object' &&
      'line' in error.loc
    )
      this.lastLine = Number(error.loc.line) || 1;
    let truncated = !!this.limitMessage || error instanceof TraceLimit;
    const message = failed ? this.errorText(error) : null;
    if (failed || truncated) {
      const origin = this.errorOrigins.get(error);
      if (this.steps.length >= this.maxSteps) this.steps.pop();
      let last = truncated
        ? null
        : this.snapshot(
            'exception',
            origin?.line ?? this.lastLine,
            message ?? undefined,
            origin?.frames ?? (this.lastActive.length ? this.lastActive : this.frames),
          );
      if (
        last &&
        this.serializedBytes + this.encoder.encode(JSON.stringify(last)).length >
          MAX_TRACE_BYTES - 1024
      ) {
        truncated = true;
        this.limitMessage = 'Trace stopped at the serialized-size safety limit.';
        last = null;
      }
      this.steps.push(
        last ?? {
          index: this.steps.length,
          line: this.steps.at(-1)?.line ?? this.lastLine,
          event: 'exception',
          func: this.steps.at(-1)?.func ?? '<module>',
          callStack: [],
          globals: Object.create(null),
          heap: Object.create(null),
          stdout: this.steps.at(-1)?.stdout ?? '',
          explanation:
            this.limitMessage ??
            'Trace stopped at the safety limit. The program may contain an infinite loop.',
        },
      );
    }
    return {
      steps: this.steps,
      truncated,
      error: truncated ? null : message,
      elapsed: Math.round(performance.now() - this.started),
    };
  }
}
