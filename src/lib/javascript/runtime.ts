import type { HeapObject, Step, TraceResult, Value } from '../trace';
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
  private globals: Getters = {};
  private lastActive: Frame[] = [];
  private identities = new WeakMap<object, string>();
  private objectCount = 0;
  private callCount = 0;
  private stdout = '';
  private specialIds = new Map<string, string>();
  private started = performance.now();
  private lastLine = 1;
  private errorOrigins = new Map<unknown, { line: number; frames: Frame[] }>();
  constructor(private maxSteps = 5000) {}
  private check() {
    if (this.steps.length >= this.maxSteps - 1 || performance.now() - this.started > 10000)
      throw new TraceLimit(
        'Trace stopped at the safety limit. The program may contain an infinite loop.',
      );
  }
  private snapshot(
    event: Step['event'],
    line = this.lastLine,
    explanation?: string,
    frames = this.frames,
  ): Step {
    const heap: Record<string, HeapObject> = {};
    const special = (type: string, text: string): Value => {
      const key = type + ':' + text;
      let ref = this.specialIds.get(key);
      if (!ref) {
        ref = `h${++this.objectCount}`;
        this.specialIds.set(key, ref);
      }
      if (!heap[ref] && Object.keys(heap).length >= 128) return '[value truncated]';
      heap[ref] = { type, fields: { value: text } };
      return { ref };
    };
    const value = (v: unknown, depth = 0): Value => {
      if (v === null || typeof v === 'boolean') return v;
      if (typeof v === 'number') return Number.isFinite(v) ? v : special('number', String(v));
      if (typeof v === 'string') return v.slice(0, 200) + (v.length > 200 ? '…' : '');
      if (typeof v === 'bigint') return special('bigint', v.toString().slice(0, 200) + 'n');
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
      if (Object.keys(heap).length >= 128 || depth >= 6) return '[value truncated]';
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
        obj.items = v.slice(0, 80).map((i) => value(i, depth + 1));
        obj.truncated = v.length > 80;
      } else if (v instanceof Map) {
        obj.entries = [];
        let n = 0;
        for (const [k, item] of v) {
          if (n++ >= 80) break;
          obj.entries.push([value(k, depth + 1), value(item, depth + 1)]);
        }
        obj.truncated = v.size > 80;
      } else if (v instanceof Set) {
        obj.items = [];
        let n = 0;
        for (const item of v) {
          if (n++ >= 80) break;
          obj.items.push(value(item, depth + 1));
        }
        obj.truncated = v.size > 80;
      } else {
        const fields: Record<string, Value> = {};
        const descriptors = Object.getOwnPropertyDescriptors(v);
        const names = Object.keys(descriptors);
        for (const key of names.slice(0, 80)) {
          const descriptor = descriptors[key];
          fields[key] = 'value' in descriptor ? value(descriptor.value, depth + 1) : '[accessor]';
        }
        obj.fields = fields;
        obj.truncated = names.length > 80;
      }
      return { ref };
    };
    const vars = (getters: Getters) => {
      const result: Record<string, Value> = {};
      for (const [name, get] of Object.entries(getters).slice(0, 80)) {
        try {
          const v = get();
          if (typeof v === 'function' || (name === 'this' && (v === undefined || v === globalThis)))
            continue;
          result[name] = value(v);
        } catch {}
      }
      return result;
    };
    const callStack = frames.slice(-80).map((frame) => ({
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
    this.steps.push(this.snapshot('call', 1));
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
    this.steps.push(this.snapshot('line', line));
  };
  enter = (func: string, line: number, getters: Getters, constructorCall = false) => {
    this.check();
    this.frames.push({ id: `c${++this.callCount}`, func, line, getters, constructorCall });
    this.lastActive = this.frames.map((f) => ({ ...f }));
    this.steps.push(this.snapshot('call', line));
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
    this.steps.push(
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
        (frame.returned === null || typeof frame.returned !== 'object')
      ) {
        try {
          frame.returned = frame.getters.this();
        } catch {}
      }
      this.check();
      this.steps.push(this.snapshot('return', frame.line));
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
    this.check();
    this.stdout = (
      this.stdout +
      values.map((v) => (typeof v === 'string' ? v : this.format(v))).join(' ') +
      '\n'
    ).slice(0, 20000);
    this.steps.push(this.snapshot('output'));
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
    const truncated = error instanceof TraceLimit;
    const message = failed ? this.errorText(error) : null;
    if (failed) {
      const origin = this.errorOrigins.get(error);
      if (this.steps.length >= this.maxSteps) this.steps.pop();
      this.steps.push(
        this.snapshot(
          'exception',
          origin?.line ?? this.lastLine,
          truncated ? (error as Error).message : (message ?? undefined),
          origin?.frames ?? (this.lastActive.length ? this.lastActive : this.frames),
        ),
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
