self.onmessage = async ({ data }) => {
  try {
    const report = (progress, message) =>
      self.postMessage({ type: 'progress', phase: 'loading', progress, message });
    report(0, 'Loading the local Python runtime…');
    const runtimeAssets = await fetch('/runtime-assets.json').then((r) => r.json());
    if (!/^\/pyodide\/[a-f0-9]{16}$/.test(runtimeAssets.pyodide))
      throw new Error('Invalid local runtime manifest.');
    const runtimeBase = runtimeAssets.pyodide;
    const [manifest, tracer, outline, analysis] = await Promise.all([
      fetch(`${runtimeBase}/manifest.json`).then((r) => {
        if (!r.ok) throw new Error('Runtime assets missing. Run npm install.');
        return r.json();
      }),
      fetch('/tracer.py').then((r) => r.text()),
      fetch('/outline.py').then((r) => r.text()),
      fetch('/analysis.py').then((r) => r.text()),
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
    const request = JSON.stringify({
      code: String(data.code).slice(0, 30000),
      stdin: String(data.stdin).slice(0, 10000),
      maxSteps: Math.min(5000, Math.max(10, Number(data.maxSteps) || 5000)),
    });
    report(100, 'Python is ready.');
    self.postMessage({ type: 'started' });
    pyodide.globals.set('_request_json', request);
    if (data.mode === 'inspect') {
      self.postMessage({
        type: 'inspection',
        inspection: JSON.parse(pyodide.runPython('inspect_code(_request_json)')),
      });
      return;
    }
    if (data.mode === 'analyze') {
      self.postMessage({
        type: 'outline',
        outline: JSON.parse(pyodide.runPython('outline_code(_request_json)')),
      });
      return;
    }
    const result = JSON.parse(pyodide.runPython('run_trace(_request_json)'));
    self.postMessage({ type: 'result', result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
