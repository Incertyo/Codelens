# Phase 3 shared core and AI pipeline

Authorized scope: Phase 3A and 3B only, behavior-preserving; no 3C/3D/3E, optional cleanup or L1–L8 fixes. Starting application commit: 6991e07 on local refactor/revamp. No application code or existing test has changed during preflight.

## Validation decision required before implementation

Phase 3A.3 asks for stricter shared validation while explicitly requiring a stop if that would change behavior. The two worker request validators differ in both directions; neither is uniformly stricter.

| Real worker measurement payload | JavaScript worker | Python worker |
| --- | --- | --- |
| Otherwise valid request, options is an empty object | Completes, using Zod option defaults | Error: The measurement worker could not process this request. |
| Full valid options plus an unexpected root field | Error: Invalid measurement request. | Completes, ignoring the extra field |

Source evidence: src/lib/measurement.ts:5–14 supplies option defaults and :36–44 makes requests strict; src/workers/javascript.worker.ts:53 parses with that schema. public/tracer.worker.js:113–145 manually checks option bounds without defaults and :147–158 forwards selected request fields, ignoring extras. The parent MeasurementRunner already normalizes options/validates its own outgoing requests; the demonstrated difference is directly observable at the worker protocol boundary, not a claimed ordinary UI regression.

Production evidence on the unchanged application:

- One production build passed. Diagnostic uses actual production JavaScript worker URL and classic /tracer.worker.js with real same-origin Pyodide; no mock worker or mocked trace output, no hosted calls.
- A fresh worker per input reproduces all four outcomes above in one passing browser case, no retries/skips, 10.93 s. Artifacts: ignored artifacts/refactor/phase3-validation/{worker-results.json,diagnostic-fresh.json,diagnostic-fresh.log,build.log}. The executable diagnostic and config are in the same ignored directory.
- The first diagnostic reused a worker after an invalid request and timed out. The diagnostic was narrowed to a fresh worker per input to isolate validation from recovery; no recovery defect was diagnosed or fixed. The same production build was reused; no application change or rebuild between runs.

Requested owner choice: preserve current worker-specific validation through explicit policies in shared helpers (recommended for exact parity), or separately approve stricter common validation as an intentional behavior change. Do not make either choice implicitly. This is a user-rule stop, not a skill or automatic approval rejection.

Owner response changes scope: make the editor and user-facing Run Python-only first, then continue 3A and 3B in this pass. Implement the Python-only change as an explicitly authorized behavior change, separate from the subsequent refactor. Preserve frozen catalog/reference programs and existing internal JavaScript golden coverage; do not silently delete immutable catalog data. The worker-policy evidence remains relevant if legacy internal worker paths are retained.

## Pending implementation and verification

Limits centralization/request injection, shared protocol and conformance tests, shared trace/message helpers and the AI pipeline have not been implemented. Classic-worker approach (a)/(b) is not yet selected. No dependency, manifest input, reference program, generated catalog, golden, provider fixture or environment variable/route changed. Application LOC delta for 3A/3B is zero so far.

After the decision, finish 3A's limits/protocol/validation sub-steps and 3B's mode-parameterized pipeline in small T0/T1 commits, preserving exact mode-specific prompts, errors, admission ordering, counted retries, Google schema adaptation and provider quota behavior. Run final T2 after both; no full browser/T3. Recommended later order remains 3C orchestration, 3D domain moves/names, then 3E cascade consolidation, but none is authorized in this request.
