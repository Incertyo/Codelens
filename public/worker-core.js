(() => { const exports = {};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measurementBounds = exports.limits = void 0;
exports.limits = Object.freeze({
    code: 30000,
    stdin: 10000,
    steps: 5000,
    workerMinSteps: 10,
    editorMinSteps: 100,
    runTimeoutMs: 12000,
    runtimeTimeoutMs: 90000,
    traceTimeoutMs: 10000,
    variables: 80,
    heapObjects: 128,
    collectionElements: 80,
    snapshotDepth: 6,
    frames: 80,
    valueCharacters: 200,
    stdout: 20000,
    traceBytes: 16 * 1024 * 1024,
    traceNoticeBytes: 128 * 1024,
    integerBits: 660,
    safeInteger: 9007199254740991,
    exceptionCharacters: 300,
    errorCharacters: 500,
    graphNodes: 80,
    graphEdges: 300,
    renderedCells: 80,
    renderedViews: 6,
    measurementEvents: 3000000,
    measurementMinEvents: 10,
    measurementTimeoutMs: 10000,
    measurementMinTimeoutMs: 50,
    measurementSampleEvery: 16,
    measurementObjects: 20000,
    measurementDepth: 256,
    measurementVisits: 100000,
    measurementString: 10000,
    measurementSizes: 10,
    measurementN: 1000000,
    measurementArguments: 16,
    measurementRequestBytes: 1048576,
    measurementReason: 600,
    entryName: 100,
    shareFragment: 100000,
    shareJson: 250000,
    aiDeadlineMs: 18000,
    aiAttempts: 2,
    aiOutputTokens: 3500,
    aiBodyBytes: 200000,
    readinessEntries: 256,
    readinessTtlMs: 30000,
    analysisDebounceMs: 600,
    complexityDebounceMs: 400,
    breakdownDebounceMs: 300,
    libraryTimeoutMs: 15000,
    implementationId: 200,
    requestImplementationId: 250,
    hashCharacters: 64,
    aiFunctions: 40,
    aiParameters: 30,
    aiParameterCharacters: 160,
    aiSampleSteps: 32,
    aiPurposeCharacters: 600,
    aiTextCharacters: 500,
    aiHintCharacters: 200,
    testArgumentInteger: 10000,
    testArgumentElements: 128,
    aiSummaryCharacters: 1200,
    aiPatternCharacters: 100,
    aiAnnotations: 100,
    aiStepNoteCharacters: 400,
    aiComplexityCharacters: 50,
    aiSuggestions: 10,
    aiHighlights: 20,
    aiOperations: 20,
    aiIssues: 12,
    aiOptimizationLines: 30,
    aiTestNameCharacters: 120,
    aiExpectedOutputCharacters: 2000,
    aiTests: 5,
    inspectionEntries: 40,
    outlineSnippetCharacters: 160,
    libraryAlgorithmId: 240,
    introMinMs: 1400,
    introSkipMs: 600,
    introMaxMs: 10000,
    introManifestTimeoutMs: 5000,
    detectionTimeoutMs: 15000,
    detectionDebounceMs: 350,
    detectionMinCharacters: 32,
    limiterTimeoutMs: 2000,
    clientMinuteDefault: 30,
    clientMinuteTest: 5,
    globalMinuteDefault: 60,
    globalMinuteTest: 10,
    dailyDefault: 1000,
    sqliteBusyMs: 5000,
});
exports.measurementBounds = Object.freeze({
    eventBudget: [exports.limits.measurementMinEvents, exports.limits.measurementEvents],
    timeoutMs: [exports.limits.measurementMinTimeoutMs, exports.limits.measurementTimeoutMs],
    sampleEvery: [1, exports.limits.measurementSampleEvery],
    maxObjects: [1, exports.limits.measurementObjects],
    maxDepth: [1, exports.limits.measurementDepth],
    maxVisits: [1, exports.limits.measurementVisits],
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asynchronousCapabilities = exports.networkCapabilities = void 0;
exports.privateSender = privateSender;
exports.authenticatedMessage = authenticatedMessage;
exports.runProtocol = runProtocol;
exports.lockProtocol = lockProtocol;
exports.lockCapabilities = lockCapabilities;
function privateSender(post, nonce) {
    return (message) => post({ ...message, nonce });
}
function authenticatedMessage(data, nonce) {
    return !!data && typeof data === 'object' && 'nonce' in data && data.nonce === nonce;
}
function runProtocol(nonce) {
    let phase = 'loading';
    let deadline = Infinity;
    return {
        accepts(data) { return phase !== 'finished' && authenticatedMessage(data, nonce); },
        expired(now) { return now >= deadline; },
        send(now, timeoutMs) {
            if (phase !== 'loading')
                return false;
            phase = 'sent';
            deadline = now + timeoutMs;
            return true;
        },
        start() {
            if (phase !== 'sent')
                return false;
            phase = 'started';
            return true;
        },
        get phase() { return phase; },
        finish() { phase = 'finished'; },
    };
}
function lockProtocol(scope) {
    const blocked = () => { throw new Error('Worker protocol messages are private.'); };
    for (let target = scope; target; target = Object.getPrototypeOf(target)) {
        if (Object.hasOwn(target, 'postMessage'))
            Object.defineProperty(target, 'postMessage', { value: blocked, writable: false, configurable: false });
    }
}
function lockCapabilities(scope, keys, message) {
    const blocked = () => { throw new Error(message); };
    for (const key of keys)
        Object.defineProperty(scope, key, { value: blocked, writable: false, configurable: false });
}
exports.networkCapabilities = ['fetch', 'XMLHttpRequest', 'importScripts', 'WebSocket', 'WebTransport', 'EventSource', 'Worker', 'SharedWorker', 'open'];
exports.asynchronousCapabilities = [...exports.networkCapabilities, 'setTimeout', 'setInterval', 'queueMicrotask'];

self.codelensWorkerCore = Object.freeze(exports); })();
