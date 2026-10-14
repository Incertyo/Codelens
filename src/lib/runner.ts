import { MAX_CODE_LENGTH, RUN_TIMEOUT_MS, traceSchema, type TraceResult } from './trace';
import {
  breakdownSchema,
  normalizePythonOutline,
  type BreakdownData,
  type Language,
} from './breakdown';
import { inspectionSchema, type Inspection } from './analysis';
export type RunProgress = { phase: 'loading' | 'running'; progress: number; message: string };
export class CodeRunner {
  private worker: Worker | null = null;
  private cancelPending: (() => void) | null = null;
  dispose() {
    this.cancelPending?.();
    this.cancelPending = null;
    this.worker?.terminate();
    this.worker = null;
  }
  run(
    code: string,
    stdin: string,
    maxSteps: number,
    progress: (p: RunProgress) => void,
    language: Language = 'python',
  ): Promise<TraceResult> {
    return this.start(code, stdin, maxSteps, progress, language, 'run') as Promise<TraceResult>;
  }
  analyze(code: string, language: Language): Promise<BreakdownData> {
    return this.start(code, '', 5000, () => {}, language, 'analyze') as Promise<BreakdownData>;
  }
  inspect(code: string, language: Language): Promise<Inspection> {
    return this.start(code, '', 5000, () => {}, language, 'inspect') as Promise<Inspection>;
  }
  private start(
    code: string,
    stdin: string,
    maxSteps: number,
    progress: (p: RunProgress) => void,
    language: Language,
    mode: 'run' | 'analyze' | 'inspect',
  ): Promise<TraceResult | BreakdownData | Inspection> {
    this.dispose();
    if (!['python', 'javascript'].includes(language))
      return Promise.reject(
        new Error('Real execution is available for Python and JavaScript only.'),
      );
    if (code.length > MAX_CODE_LENGTH)
      return Promise.reject(new Error('Code exceeds the 30,000-character limit.'));
    return new Promise((resolve, reject) => {
      const worker =
        language === 'python'
          ? new Worker('/tracer.worker.js')
          : new Worker(new URL('../workers/javascript.worker.ts', import.meta.url));
      this.worker = worker;
      let timer: ReturnType<typeof setTimeout>;
      const finish = () => {
        clearTimeout(timer);
        worker.terminate();
        if (this.worker === worker) this.worker = null;
        this.cancelPending = null;
      };
      this.cancelPending = () => {
        finish();
        reject(new Error('Run cancelled.'));
      };

      timer = setTimeout(() => {
        finish();
        reject(
          new Error(
            'The language runtime could not load within 90 seconds. Check runtime assets and retry.',
          ),
        );
      }, 90000);
      worker.onerror = (e) => {
        finish();
        reject(new Error(e.message || 'The language worker could not start.'));
      };
      worker.onmessage = (e) => {
        if (e.data.type === 'inspection') {
          const parsed = inspectionSchema.safeParse(e.data.inspection);
          finish();
          if (parsed.success) resolve(parsed.data);
          else reject(new Error('The worker returned invalid AST analysis.'));
        }
        if (e.data.type === 'progress') progress(e.data);
        if (e.data.type === 'started') {
          clearTimeout(timer);
          progress({ phase: 'running', progress: 100, message: 'Tracing your code…' });
          timer = setTimeout(() => {
            finish();
            reject(
              new Error(
                'Execution stopped after 12 seconds. Your code may contain an infinite loop or an expensive operation.',
              ),
            );
          }, RUN_TIMEOUT_MS);
        }
        if (e.data.type === 'result') {
          const parsed = traceSchema.safeParse(e.data.result);
          finish();
          if (parsed.success) resolve(parsed.data);
          else reject(new Error('The worker returned an invalid trace.'));
        }
        if (e.data.type === 'error') {
          finish();
          reject(new Error(e.data.message));
        }
        if (e.data.type === 'outline') {
          try {
            const data =
              language === 'python'
                ? normalizePythonOutline(e.data.outline)
                : breakdownSchema.parse(e.data.outline);
            finish();
            resolve(data);
          } catch {
            finish();
            reject(new Error('The worker returned an invalid structure outline.'));
          }
        }
      };
      worker.postMessage({ code, stdin, maxSteps, mode });
    });
  }
}
export { CodeRunner as PythonRunner };
