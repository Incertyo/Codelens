# Replacement Step 1, Part 1 — verification

Verified locally on 15 October 2026, Windows, Node 24.19.0, Next 16.4.0, Pyodide 0.28.3 and production Chromium workers. This replaces the earlier trace-based measurement path. It completes the measurement-engine part, not profile coverage or automatic dual graphs. No deployment, push, hosted provider or hosted store was used.

## Real known-answer runs

Each row passed through both the actual instrumenter/Pyodide unit engines and the actual production browser workers. Expected classes are test assertions only; they are never supplied to the measurement engine or fit selection. All use the default size sequence and automatic stopping at resource bounds.

| Authored test algorithm | Time best fit | Auxiliary-space best fit | JavaScript / Python |
| --- | --- | --- | --- |
| Linear scan | O(n) | O(1) | Both pass |
| Iterative binary search, absent target | O(log n) | O(1) | Both pass |
| Recursive binary search, absent target | O(log n) | O(log n) | Both pass |
| Bubble sort, reverse order | O(n²) | O(1) | Both pass |
| Merge sort, reverse order | O(n log n) | O(n) | Both pass |
| Recursive Fibonacci | O(2ⁿ) | O(n) | Both pass |
| Memoized Fibonacci | O(n) | O(n) | Both pass |
| n by n DP grid | O(n²) | O(n²) | Both pass |
| Counting loop | O(n) | O(1) | Both pass |

Linear-scan tests also distinguish total-space O(n) from auxiliary-space O(1). These matches are local estimates from finite deterministic inputs, not proofs or a guarantee for every algorithm/input. Fibonacci and expensive grid sizes can exhaust the budget; those points are excluded, never fitted as completed work. Fewer than six valid points or closely matched models remain inconclusive even when the best label matches the expected class.

## Regression and protocol evidence

- The first JavaScript constant-space checks failed because a small loop's binding was missed by the 16-line cadence. Sampling the first 16 lines as well as calls/returns and the ongoing cadence makes both real engines pass all nine known-answer classes without changing expected classes or special-casing algorithms.
- Real JavaScript and Pyodide runs exceed 5,000 line events without any snapshots. Results contain counters/status/reason only, no steps, heap, stdout, input values or returned values. Ordinary Run still uses its original trace caps.
- Actual array inputs above the old 80-item clipping preserve all 400 elements in the input baseline. Return aliases/cycles are deduplicated; a 12,000-character string uses the stated 10,000-unit cap without inventing another copy for a returned alias. Multiple arguments and omitted demo calls are executed, not represented by handcrafted counters.
- Every traversal bound is exercised by actual allocations. Four independently executed partial sizes with positive counters still receive no fit. Swallowed private limit exceptions retain budget-exceeded status in both engines. Minimum-point and tied-model inconclusive behavior uses actual runs.
- Own __proto__ inputs initially failed in both real engines after the request schema stripped the field. Tuple-entry validation plus Object.fromEntries preserves all own fields and ordinary JSON-object methods. Unit regressions and final production worker checks pass afterward.
- Selecting a named JavaScript function expression by its different binding name initially returned zero line events. Arming at trusted entry invocation fixes it independently of display name. The unit regression and final browser check pass.
- Production tests verify one worker/bootstrap per complete analysis, fresh execution bindings across sizes, a distinct authenticated run nonce per size, termination after analysis/cancellation, and automatic reduction on budget exhaustion (including a failure at the final requested size).
- Copies of actual worker counters with missing/wrong nonces are ignored. A replayed authenticated started message cannot extend the deadline. A native 14-second body with a blocked casual postMessage attempt is stopped by the default absolute parent limit with unavailable counters, not fabricated measurements. Deadline timings are test assertions for safety, never a fitted metric.
- Browser tests bundle the actual parent MeasurementRunner and target the actual production workers; no fake worker or manufactured successful result replaces execution. All nine algorithms are checked in each language. Measured series are attached to the local Playwright test results without source or runtime values.
- The manual UI uses the new engine: ten default points, both peak series in a counter table, auxiliary fit/runner-up/error, sampling definition, cancellation and source remount cleanup. Checked DOM arithmetic matches total minus input for real runs. Both themes, log toggle, equivalent data table, keyboard cancellation, mobile overflow and axe pass. Existing trace heatmaps and separate AI actions remain.

## Completed checks

| Check | Result |
| --- | --- |
| ESLint | Passed, zero warnings |
| Strict typecheck | Passed |
| Unit suite | 641 tests passed in 19 files, including 37 new measurement cases and all 343 maintained implementation fixtures |
| Additional final total/auxiliary assertions | Both real linear-scan engines passed |
| Production build | Passed, with read-only catalog verification and no runtime SQLite dependency |
| Relevant production Playwright | 36 passed together in 5.9 minutes: complexity, hardening, measurement and Phase 3 stories |
| Final engine production recheck | 7 passed in 1.9 minutes after the last entry-binding fix, including all nine known algorithms in each language and the named-expression regression |
| Local AI-off smoke | Passed, including the new trusted-harness asset check |
| Catalog manifest/export | All 23 manifest inputs and export hash unchanged |
| Comment audit | Zero added comments across 45 changed/new JS/TS files, both changed/new Python files and changed CSS |
| Gitleaks 8.30.1 | Publishable source passed with zero findings; ignored private env files/vendors/builds excluded |

Production verification used AI_ENABLED=false, CODELENS_STATIC_LIBRARY=1, a nonexistent SQLite path and port 3118; port 3001 was occupied by the earlier local preview. Unit tests use local SQLite and local HTTP provider/store fixtures. Seeding created zero revisions. Smoke was run against the live local test server; an earlier attempt after Playwright had closed its server failed to connect and is not a hosted-service failure. The full production suite was not rerun in this part; the 36 relevant stories include the retained protocol, storage, race and dense-graph hardening cases.

Export SHA-256: `054cf4d55ba35611b4eb2b6a917d32ee833908a5dbfa94d14f846e94149d1eac`.

The final engine check follows a fresh production build. The preceding 36-story run predates only the final entry-binding activation adjustment; ordinary Run/protocol behavior was unchanged by that adjustment. Lint/typecheck/unit checks and all seven engine stories cover the final engine source. No single final full-suite pass is implied.

Source audits compare comments using TypeScript parser/scanner ranges, Python tokenization and PostCSS; git diff --check passes. Secret scanning copies only Git-visible publishable files to an external temporary directory with full redaction, not ignored environment files. This is not a clean whole-working-directory secret-scan claim; earlier hardening records pre-existing ignored-environment findings.

## Decisions, boundaries and next part

All 15 decisions are enumerated under Replacement V2 Step 1 — Part 1 in DECISIONS.md. README, DEPLOYMENT and smoke describe the new mode/static harness. No dynamic route or environment variable was added, so .env.example and check:env retain their contract. No dashboard action is required.

The model is sampled user-data reachability and frame/binding counts, not bytes, full closure/allocator/GC reconstruction or a total-memory bound. Native/imported internals, temporary allocations between samples, custom container/proxy behavior and interpreter/global mutations remain limitations. Fresh globals reset program bindings, not imported-module caches or JavaScript intrinsics. The educational sandbox and known Python builtins-importer bridge limitation are preserved; no hostile-code isolation claim or bypass-fixed test is added.

Unverified: hosted behavior/configuration, other browser engines, manual assistive-technology use, low-memory/device performance and universal correctness of fitted classes. Profile coverage and coverage/mismatch reporting have not begun. The current UI still uses explicit measurement and its earlier single-parameter picker. Automatic dual charts, include-input graph toggle, result caching and pasted-code generator resolution belong to Parts 2–4. Stop here; Part 2 batch 1 requires the owner's continue.
