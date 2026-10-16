(() => {
  const trustedPost = self.postMessage.bind(self);
  self.onmessage = async ({ data: bootstrap }) => {
    if (bootstrap.mode !== 'bootstrap' || typeof bootstrap.nonce !== 'string') return;
    self.onmessage = null;
    const nonce = bootstrap.nonce;
    const send = (message) => trustedPost({ ...message, nonce });
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
      pyodide.runPython(tracer);
      pyodide.runPython(outline);
      pyodide.runPython(analysis);
      pyodide.runPython(measurement);
      const blocked = () => {
        throw new Error('Network access is disabled in the execution sandbox.');
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
      ]) {
        Object.defineProperty(self, key, { value: blocked, writable: false, configurable: false });
      }
      const blockedProtocol = () => {
        throw new Error('Worker protocol messages are private.');
      };
      for (let target = self; target; target = Object.getPrototypeOf(target)) {
        if (Object.hasOwn(target, 'postMessage'))
          Object.defineProperty(target, 'postMessage', {
            value: blockedProtocol,
            writable: false,
            configurable: false,
          });
      }
      const receive = ({ data }) => {
        if (data.nonce !== nonce) return;
        self.onmessage = null;
        if (data.mode === 'measure') {
          if (typeof data.runNonce !== 'string') return;
          const runNonce = data.runNonce;
          const sendMeasurement = (message) => trustedPost({ ...message, nonce: runNonce });
          sendMeasurement({ type: 'started' });
          try {
            const request = data.measurement;
            if (
              !request ||
              typeof request.code !== 'string' ||
              request.code.length > 30000 ||
              typeof request.entry !== 'string' ||
              request.entry.length < 1 ||
              request.entry.length > 100 ||
              !Number.isInteger(request.n) ||
              request.n < 1 ||
              request.n > 1000000 ||
              !Array.isArray(request.args) ||
              request.args.length > 16 ||
              new TextEncoder().encode(JSON.stringify(request)).length > 1048576
            )
              throw new Error('Invalid measurement request.');
            const options = request.options;
            const bounds = {
              eventBudget: [10, 3000000],
              timeoutMs: [50, 10000],
              sampleEvery: [1, 16],
              maxObjects: [1, 20000],
              maxDepth: [1, 256],
              maxVisits: [1, 100000],
            };
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
            code: String(data.code).slice(0, 30000),
            stdin: String(data.stdin).slice(0, 10000),
            maxSteps: Math.min(5000, Math.max(10, Number(data.maxSteps) || 5000)),
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
