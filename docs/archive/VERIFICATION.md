# Current verification — Phase 3

Verified locally on 14 October 2026, Windows / AMD Ryzen 7 5800H, Node 24.19.0, Next 16.4.0, Pyodide 0.28.3 and Headless Chromium 156. The historical Phase 1 report below describes earlier scope; this section and PHASE_3_VERIFICATION.md are the current record.

## Final checks

- Lint and strict typecheck pass with zero warnings/errors.
- **508 unit tests / 12 suites pass**, including all 343 current maintained code variants through real traced runtimes.
- **35 Playwright stories pass against the production build**. The final command builds then starts next start. CODELENS_STATIC_LIBRARY=1 and a deliberately nonexistent SQLite path verify deployment catalog independence.
- Production build passes. Its functions-config-manifest records /api/analyze maxDuration: 25, allowing the shared-store check and the total 18-second provider deadline. All AI modes retain 3,500 output tokens and one retry.
- Source catalog integrity: 309 algorithms, 343 current implementations, 690 stored/exported revisions, 23 maintained-source manifest files; all 343 current source hashes match exported code.
- Axe: zero violations in the tested Analysis, simulation, suggestions, desktop/mobile, both-theme and existing visualizer states. Lighthouse accessibility: **100 desktop / 100 mobile**. These are automated checks, not a manual assistive-technology certification.
- Shares fill source/language/stdin only, and never auto-execute or grant simulation consent. Delayed analysis cannot overwrite changed source.

## Actual 5,000-step measurements

These are measurements from this machine and bounded fixtures, with other automated browser work stopped. They are not performance guarantees, asymptotic proofs or GPU presentation measurements. Complexity fitting separately uses real function event counts, never wall-clock time.

| Production trace / interaction      | Steps      | Measured frame intervals        | Mean interval / rate                      | p95 interval         | Largest interval | Largest synchronous committed update |
| ----------------------------------- | ---------- | ------------------------------- | ----------------------------------------- | -------------------- | ---------------- | ------------------------------------ |
| Python array timeline, full motion  | 5,000      | 180                             | **16.758 ms / 59.672 animation frames/s** | **16.800 ms**        | **33.200 ms**    | Not timed by this script             |
| 16 JS visualizer cases, full motion | 5,000 each | 180 each after 11 warmup frames | **60.000–60.004 animation frames/s**      | **16.700–16.800 ms** | **16.800 ms**    | **8.700 ms** maximum                 |

The Python run reached the expected counter **(3141 / 5000)**. It included an observed 33.2 ms interval; this evidence does not establish that every frame stays within 16.7 ms. All 16 JS cases verified the changed DOM counter and renderer inside each measured native input event: **zero deferred commits and zero page errors**. Browser frame timestamps have normal quantization.

The initial Phase 3 run was 16.667 ms mean for the Python fixture and 9.9 ms maximum committed JS update. The table records the final refreshed measurements rather than substituting the earlier, more favorable Python interval. Raw final reports are artifacts/scrubbing.json and artifacts/visualizer-performance.json; reproduce with the README scripts on an otherwise idle production server on port 3001.

## Scope and unresolved external verification

Analysis is implemented with conservative AST candidates, restricted documented entry generators, real worker estimates/heatmaps, AI proposals/diffs and locally checked suggested tests. C++/Java use explicit per-run, structurally validated AI simulation and are always labelled AI-simulated, may be inaccurate. Native C++/Java execution is not supplied. No mocked interpreter substitutes for Python/JavaScript.

Vercel uses a source-verified static catalog; local SQLite maintenance remains intact. The shared Redis limiter, security headers and content-addressed immutable runtime assets are implemented. Missing shared storage fails closed. Its local HTTP contract fixture is not live hosted Redis proof. Live provider, hosted Redis and Vercel cloud smoke tests remain **unverified**. Vercel connector and CLI both rejected authentication; reauthentication is required before publishing/testing a cloud URL. No live deployment success is claimed.

Optimized code is an unverified proposal; every AI expected output stays unverified even beside an observed real output. Native/imported internals are untraced, so measured estimates describe captured step growth. The compatible CSP permits necessary inline/eval/WASM behavior; worker memory and Python introspection remain outside a hardened security guarantee. All earlier size/execution/privacy limits remain.

See PHASE_3_VERIFICATION.md for boundary evidence and README.md for setup, environment, build, architecture, language extension and production smoke steps. DECISIONS.md records all 16 Phase 3 decisions.

---

# Phase 1 verification

Verified locally on 13 October 2026 with Node 24.19.0, Next 16.4.0, Pyodide 0.28.x, and Playwright Chromium 156 on Windows. No API key was configured.

## User story and evidence

The user pastes Python into Monaco, runs it in a browser Web Worker, receives real execution snapshots, and inspects them through synchronized playback and visualization. No application API or server execution participates in this flow.

| Boundary           | Result | Evidence                                                                                                                                                 |
| ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page/editor        | Pass   | Desktop/mobile screenshots; real keyboard paste updates source                                                                                           |
| UI → worker        | Pass   | Button and Ctrl/⌘+Enter trigger a real Python run                                                                                                        |
| Worker → trace     | Pass   | Seven examples, recursion, alias mutation, stdin, exceptions, finite/truncated traces                                                                    |
| Trace → UI         | Pass   | Line highlight/arrow, breakpoint pause, forward/back, start/end, output, arrays, pointers, matrix                                                        |
| URL → source       | Pass   | Clipboard share URL opens and reproduces the program/output                                                                                              |
| Failure → recovery | Pass   | Infinite-loop trace truncation; disabling tracing still hits the external 12-second timeout; a subsequent run succeeds                                   |
| Network boundary   | Pass   | Browser test attempts `fetch` through an indirect Python bridge; it is rejected after bootstrap. Blocking all external HTTPS still permits visualization |
| Themes/navigation  | Pass   | Light/dark toggle, reduced motion, native modal Escape/focus behavior, phase placeholders, and `/design`                                                 |

## Checks

- `npm run lint`: passes with zero warnings.
- `npm run typecheck`: passes in strict mode.
- `npm test`: 17 tests pass (actual Pyodide interpreter and share validation).
- `npm run test:e2e`: 5 tests pass (1.6 minutes on the final full suite).
- `npm run build`: production build passes; `/`, `/design`, and not-found prerender successfully.
- `npm audit --omit=dev`: zero production dependency vulnerabilities.
- Axe: zero violations in checked dark/light desktop, overlay menu, mobile workspace, and design-page states.
- Lighthouse production accessibility: **100 desktop / 100 mobile**. Reports: `artifacts/lighthouse-desktop.json` and `artifacts/lighthouse-mobile.json`. Automated audits do not replace a full manual accessibility audit.

## Playback measurement

A real Python program created a 5,000-step trace with five numeric array values and a moving pointer. A production-browser test scrubbed to a different trace index on each animation frame, with full motion enabled, at 1440 × 1000 in headless Chromium:

- 180 measured frames
- Mean frame time: **16.666 ms (~60.002 fps)**
- 95th percentile: **16.700 ms**
- Maximum: **16.800 ms**
- Counter reached the expected `( 3141 / 5000 )`, confirming the timeline really changed.

The raw measurement is `artifacts/scrubbing.json`; reproduce using `node scripts/measure-scrubbing.mjs` with a production server on port 3001. This is evidence for this bounded fixture on this machine, not a guarantee for every device or program. Large, object-heavy snapshots remain capped and may cost more to render.

## Limits / remaining work

- Only Phase 1 is implemented. Breakdown, Analysis, JS tracing, advanced node-link/recursion views, AI enrichment, and deployment configuration remain future phases.
- First use loads the local Python runtime; workers initialize fresh on every run. No PWA/service-worker installation is included.
- Arbitrary additional Python packages and networking are unavailable. The runtime uses the bundled standard library. Python introspection and memory use are not fully sandboxed; this is an educational local runner.
- Five high-severity npm audit entries remain in the **development-only** lint chain (`braces`, `micromatch`, `fast-glob`, Next's ESLint plugin/config). The available `braces` release is still 3.0.3; npm's suggested forced Next-config downgrade does not supply a compatible fix. Production dependency audit is clean. Monaco's DOMPurify dependency is overridden to patched 3.4.17; Vitest was upgraded to 5.0.4.
- The final visual pass prioritizes matrices over supporting arrays, so knapsack's DP grid appears immediately. Source/color adjustments are followed by appropriate checks and refreshed screenshots.
