(() => {
  const trustedPost = self.postMessage.bind(self);
  importScripts('/worker-core.js');
  const { limits, measurementBounds, privateSender, lockProtocol, lockCapabilities, networkCapabilities } = self.codelensWorkerCore;
  delete self.codelensWorkerCore;
  self.onmessage = async ({ data: bootstrap }) => {
    if (bootstrap.mode !== 'bootstrap' || typeof bootstrap.nonce !== 'string') return;
    self.onmessage = null;
    const nonce = bootstrap.nonce;
    const send = privateSender(trustedPost, nonce);
    try {
      const report = (progress, message) =>
        send({ type: 'progress', phase: 'loading', progress, message });
      report(0, 'Loading the local Python runtime…');
      const runtimeAssets = await fetch('/runtime-assets.json').then((r) => r.json());
      if (!/^\/pyodide\/[a-f0-9]{16}$/.test(runtimeAssets.pyodide))
        throw new Error('Invalid local runtime manifest.');
      const runtimeBase = runtimeAssets.pyodide;
      const loadHarness = async (path) => {
        const unavailable = () =>
          new Error(
            `Could not load Python runtime asset ${path}. Rebuild and restart the local preview, then reload the page.`,
          );
        const response = await fetch(path, { cache: 'no-store' });
        if (
          !response.ok ||
          /(?:text\/html|application\/xhtml\+xml)/i.test(response.headers.get('content-type') || '')
        )
          throw unavailable();
        const source = await response.text();
        if (!source.trim() || source.trimStart().startsWith('<')) throw unavailable();
        return source;
      };
      const [manifest, tracer, outline, analysis, measurement] = await Promise.all([
        fetch(`${runtimeBase}/manifest.json`).then((r) => {
          if (!r.ok) throw new Error('Runtime assets missing. Run npm install.');
          return r.json();
        }),
        loadHarness('/tracer.py'),
        loadHarness('/outline.py'),
        loadHarness('/analysis.py'),
        loadHarness('/measurement.py'),
      ]);
      const total = manifest.reduce((sum, a) => sum + a.bytes, 0);
      let downloaded = 0;
      await Promise.all(
        manifest.map(async (asset) => {
          const response = await fetch(`${runtimeBase}/${asset.name}`);
          if (!response.ok) throw new Error(`Could not load ${asset.name}.`);
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            downloaded += value.byteLength;
            report(
              Math.min(85, Math.floor((downloaded / total) * 85)),
              'Loading Python / WebAssembly',
            );
          }
        }),
      );
      report(88, 'Initializing Python…');
      importScripts(`${runtimeBase}/pyodide.js`);
      const pyodide = await loadPyodide({
        indexURL: `${runtimeBase}/`,
        stdout: () => {},
        stderr: () => {},
      });
      report(96, 'Preparing the execution tracer…');
      pyodide.globals.set('_codelens_limits_json', JSON.stringify(limits));
      pyodide.runPython('import json as _limits_json; _codelens_limits = _limits_json.loads(_codelens_limits_json)');
      pyodide.globals.delete('_codelens_limits_json');
      pyodide.runPython(tracer);
      pyodide.runPython(outline);
      pyodide.runPython(analysis);
      pyodide.runPython(measurement);
      lockCapabilities(self, networkCapabilities, 'Network access is disabled in the execution sandbox.');
      lockProtocol(self);
      const receive = ({ data }) => {
        if (data.nonce !== nonce) return;
        self.onmessage = null;
        if (data.mode === 'measure') {
          if (typeof data.runNonce !== 'string') return;
          const runNonce = data.runNonce;
          const sendMeasurement = privateSender(trustedPost, runNonce);
          sendMeasurement({ type: 'started' });
          try {
            const request = data.measurement;
            if (
              !request ||
              typeof request.code !== 'string' ||
              request.code.length > limits.code ||
              typeof request.entry !== 'string' ||
              request.entry.length < 1 ||
              request.entry.length > limits.entryName ||
              !Number.isInteger(request.n) ||
              request.n < 1 ||
              request.n > limits.measurementN ||
              !Array.isArray(request.args) ||
              request.args.length > limits.measurementArguments ||
              new TextEncoder().encode(JSON.stringify(request)).length > limits.measurementRequestBytes
            )
              throw new Error('Invalid measurement request.');
            const options = request.options;
            const bounds = measurementBounds;
            if (
              !options ||
              Object.entries(bounds).some(
                ([key, [min, max]]) =>
                  !Number.isInteger(options[key]) || options[key] < min || options[key] > max,
              )
            )
              throw new Error('Invalid measurement limits.');
            pyodide.globals.set(
              '_measurement_request_json',
              JSON.stringify({
                code: request.code,
                entry: request.entry,
                n: request.n,
                args: request.args,
                options,
                limits: data.limits || bootstrap.limits || limits,
              }),
            );
            sendMeasurement({
              type: 'measurement',
              measurement: JSON.parse(pyodide.runPython('measure_code(_measurement_request_json)')),
            });
          } catch {
            sendMeasurement({
              type: 'error',
              message: 'The measurement worker could not process this request.',
            });
          } finally {
            pyodide.globals.delete('_measurement_request_json');
            self.onmessage = receive;
          }
          return;
        }
        try {
          const request = JSON.stringify({
            code: String(data.code).slice(0, limits.code),
            stdin: String(data.stdin).slice(0, limits.stdin),
            limits: data.limits || bootstrap.limits || limits,
            maxSteps: Math.min(limits.steps, Math.max(limits.workerMinSteps, Number(data.maxSteps) || limits.steps)),
          });
          send({ type: 'started' });
          pyodide.globals.set('_request_json', request);
          if (data.mode === 'inspect') {
            send({
              type: 'inspection',
              inspection: JSON.parse(pyodide.runPython('inspect_code(_request_json)')),
            });
            return;
          }
          if (data.mode === 'analyze') {
            send({
              type: 'outline',
              outline: JSON.parse(pyodide.runPython('outline_code(_request_json)')),
            });
            return;
          }
          const result = JSON.parse(pyodide.runPython('run_trace(_request_json)'));
          send({ type: 'result', result });
        } catch (error) {
          send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
      };
      self.onmessage = receive;
      report(100, 'Python is ready.');
      send({ type: 'ready' });
    } catch (error) {
      send({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
})();
