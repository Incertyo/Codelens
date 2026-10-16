import { runProtocol, authenticatedMessage } from "@/shared/worker-protocol";
import { limits } from "@/shared/limits";
import type { Language } from "../../shared/breakdown";
import { deadlineMeasurement, measurementOptionsSchema, measurementRequestSchema, measurementSeries, measurementSizeSchema, measurementSizes, type MeasurementArgument, type MeasurementOptions, type MeasurementRequest, type MeasurementSeries, type MeasurementSize } from "./measurement";

export type MeasurementProgress = {
  phase: 'loading' | 'running' | 'complete';
  index: number;
  total: number;
  n: number | null;
  result?: MeasurementSize;
};
export type MeasurementPlan = {
  code: string;
  entry: string;
  language: Language;
  sizes?: readonly number[];
  argumentsForSize: (n: number) => MeasurementArgument[];
  options?: Partial<MeasurementOptions>;
};

export class MeasurementRunner {
  private worker: Worker | null = null;
  private cancel: (() => void) | null = null;
  constructor(private createWorker?: (language: Language) => Worker) {}
  dispose() {
    this.cancel?.();
    this.cancel = null;
    this.worker?.terminate();
    this.worker = null;
  }
  async measure(
    plan: MeasurementPlan,
    progress: (value: MeasurementProgress) => void = () => {},
  ): Promise<MeasurementSeries> {
    this.dispose();
    if (!['python', 'javascript'].includes(plan.language))
      throw new Error('Measurement requires Python or JavaScript.');
    if (plan.code.length > limits.code) throw new Error('Code exceeds the 30,000-character limit.');
    const options = measurementOptionsSchema.parse(plan.options ?? {});
    const sizes = [...(plan.sizes ?? measurementSizes)];
    if (
      !sizes.length ||
      sizes.length > limits.measurementSizes ||
      sizes.some(
        (n, index) =>
          !Number.isSafeInteger(n) ||
          n < 1 ||
          n > limits.measurementN ||
          (index > 0 && n <= sizes[index - 1]),
      )
    )
      throw new Error('Choose at most ten strictly increasing positive measurement sizes.');
    const worker =
      this.createWorker?.(plan.language) ??
      (plan.language === 'python'
        ? new Worker('/tracer.worker.js')
        : new Worker(new URL("./workers/javascript.worker.ts", import.meta.url)));
    this.worker = worker;
    const nonce = crypto.randomUUID();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: {
      nonce: string;
      n: number;
      protocol: ReturnType<typeof runProtocol>;
      resolve: (value: MeasurementSize) => void;
      reject: (error: Error) => void;
    } | null = null;
    let rejectReady: (error: Error) => void = () => {};
    let resolveReady: () => void = () => {};
    let loading = true;
    let finished = false;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    const close = () => {
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      if (this.worker === worker) {
        this.worker = null;
        this.cancel = null;
      }
    };
    const fail = (error: Error) => {
      rejectReady(error);
      current?.reject(error);
      close();
    };
    this.cancel = () => fail(new Error('Measurement cancelled.'));
    timer = setTimeout(
      () => fail(new Error('The language runtime could not load within 90 seconds.')),
      limits.runtimeTimeoutMs,
    );
    const deadline = () => {
      const pending = current;
      if (!pending) return;
      close();
      pending.resolve(deadlineMeasurement(pending.n));
      current = null;
    };
    worker.onerror = () => fail(new Error('The measurement worker failed.'));
    worker.onmessage = (event) => {
      const data = event.data;
      if (!data || finished) return;
      if (loading) {
        if (!authenticatedMessage(data, nonce)) return;
        if (data.type === 'error') {
          fail(new Error('The measurement runtime could not load.'));
          return;
        }
        if (data.type === 'ready') {
          loading = false;
          clearTimeout(timer);
          resolveReady();
        }
        return;
      }
      if (!current || !current.protocol.accepts(data)) return;
      if (current.protocol.expired(performance.now())) {
        deadline();
        return;
      }
      if (data.type === 'started') {
        current.protocol.start();
        return;
      }
      if (current.protocol.phase !== 'started') return;
      if (data.type === 'error') {
        fail(new Error('The worker rejected the measurement request.'));
        return;
      }
      if (data.type !== 'measurement') return;
      const parsed = measurementSizeSchema.safeParse(data.measurement);
      if (!parsed.success || parsed.data.n !== current.n) {
        fail(new Error('The worker returned invalid measurement counters.'));
        return;
      }
      clearTimeout(timer);
      const pending = current;
      current = null;
      pending.resolve(parsed.data);
    };
    const results: MeasurementSize[] = [];
    try {
      progress({ phase: 'loading', index: 0, total: sizes.length, n: null });
      worker.postMessage({ mode: 'bootstrap', nonce, limits });
      await ready;
      for (const [index, n] of sizes.entries()) {
        if (finished) throw new Error('Measurement cancelled.');
        const request: MeasurementRequest = measurementRequestSchema.parse({
          code: plan.code,
          entry: plan.entry,
          n,
          args: plan.argumentsForSize(n),
          options,
        });
        if (new TextEncoder().encode(JSON.stringify(request)).length > limits.measurementRequestBytes)
          throw new Error('Measurement inputs exceed the 1 MiB request budget.');
        progress({ phase: 'running', index, total: sizes.length, n });
        if (finished) throw new Error('Measurement cancelled.');
        const result = await new Promise<MeasurementSize>((resolve, reject) => {
          const runNonce = crypto.randomUUID();
          const protocol = runProtocol(runNonce);
          protocol.send(performance.now(), options.timeoutMs);
          current = {
            nonce: runNonce,
            n,
            protocol,
            resolve,
            reject,
          };
          timer = setTimeout(deadline, options.timeoutMs);
          worker.postMessage({
            mode: 'measure',
            nonce,
            runNonce,
            measurement: request,
            language: plan.language,
            limits,
          });
        });
        results.push(result);
        progress({ phase: 'complete', index: index + 1, total: sizes.length, n, result });
        if (result.status !== 'complete') break;
      }
      return measurementSeries(results, sizes.length);
    } finally {
      close();
    }
  }
}
