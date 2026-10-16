# Revamp feature inventory

Phase 0 retains every feature. Coverage below names executable tests, not a coverage percentage or a claim of exhaustive correctness. All existing assertions remain unchanged.

| Feature or contract | Covering tests / local check | Phase 0 additions |
| --- | --- | --- |
| Editor, examples, source preservation, New and one-level undo | navigation.spec.ts; opening-detection.spec.ts; workspace.spec.ts | None needed |
| 309-entry library, topics, search, source loading, failures and revisions | catalog.test.ts; library.test.ts; e2e/library.spec.ts; navigation.spec.ts | 343 current implementations in refactor-parity.test.ts; library API inventory golden |
| Python tracing, stdin, errors, aliases, limits | tracer.test.ts; library.test.ts; workspace.spec.ts; hardening.spec.ts | Full normalized trace hashes from real Pyodide |
| JavaScript instrumentation and runtime semantics | javascript.test.ts; phase-two.spec.ts; measurement.spec.ts | Full normalized trace hashes from real instrumenter/runtime; 17 explicit JS examples |
| All visual models, pointers, overlays and fallback | detectors.test.ts; structures.test.ts; visualizers.spec.ts; loading-sizing.spec.ts | Real trace-derived sampled model outputs for the complete catalog |
| Recursion view, zoom and active-call following | phase-two.spec.ts; loading-sizing.spec.ts; structures.test.ts | Local trace/recursion screenshot matrix |
| Playback, scrubbing and breakpoints | workspace.spec.ts; phase-two.spec.ts; hardening.spec.ts | Playback-speed characterization; real 5,000-step scrubbing measurements |
| Legacy/compact sharing and bounded decompression | share.test.ts; workspace.spec.ts; phase-three.spec.ts | Exact encoded/decoded share goldens including Unicode and legacy Java/C++ |
| AST Breakdown, outline, function/line navigation | outline.test.ts; phase-two.spec.ts | Complete catalog outline goldens |
| Static complexity, safe drivers, heatmaps and source identity | analysis.test.ts; phase-three.spec.ts; hardening.spec.ts | Complete catalog inspection goldens |
| Actual time/space measurement, caps, fitting and cancellation | measurement.test.ts; measurement.spec.ts; complexity.test.ts; complexity.spec.ts | Local complexity screenshot matrix |
| AI notes, execution epochs, stale replies and static fallback | analyze.test.ts; phase-two.spec.ts; hardening.spec.ts | Golden SDK request/route response contract using local HTTP fixtures |
| AI advice, suggested tests and verified reruns | phase3-ai.test.ts; phase-three.spec.ts; google-ai.test.ts | Golden advice request/response contract with real AST/trace metadata |
| Diff, explicit apply, stale-state invalidation and undo | analysis.test.ts; phase-three.spec.ts covers diff; navigation.spec.ts covers New undo | refactor-characterization.spec.ts covers explicit proposal apply and Monaco undo |
| Auto detection, unsupported winners, model assets and manual authority | language-detection.test.ts; opening-detection.spec.ts; hardening.spec.ts | None needed before Phase 1 corpus evaluation |
| Intro, stalled hydration/assets, repeated runs and cancellation | intro.test.ts; opening-detection.spec.ts; navigation.spec.ts; runtime-assets.spec.ts | Existing timing/focus assertions retained |
| Themes, preferences, menu, design and accessibility | workspace.spec.ts; visualizers.spec.ts; complexity.spec.ts | Preference persistence across reload; local screenshot matrix in both themes and mobile |
| AI admission, readiness cache, quotas, kill switch and error secrecy | ai-controls.test.ts; ai-readiness.test.ts; analyze.test.ts; ai-controls.spec.ts; google-ai.test.ts | Local route goldens; existing failure/retry tests retained |
| CSP, content-addressed URLs and cache headers | phase-three.spec.ts production headers story; runtime-assets.spec.ts | Baseline initial-JS route measurements |
| check:env | Previously a manual check | refactor-scripts.test.ts uses isolated synthetic env files; values never printed |
| smoke | Existing local end-to-end script | Execute unchanged against local production server; no provider opt-in |
| library seed / verify / export | library.test.ts checks seed idempotency/history; production prebuild verifies manifest | Read-only verifier characterization and frozen input fingerprint guard; exporter is not invoked because its output is frozen |
| Current Java subset and C++ opt-in simulation | java.test.ts; java.spec.ts; phase3-ai.test.ts; phase-three.spec.ts; google-ai.test.ts | Simulation SDK/route golden; preserved during Phase 0; removal explicitly authorized for Phase 1 only |

The catalog goldens sample five evenly spaced step positions including endpoints, deduplicating repeated indices. Existing dedicated visualizer tests cover models that a demo's five samples might miss. Real worker nonce/deadline/lockdown contracts remain covered by production browser tests; Node trace goldens do not replace them. Hosted provider behavior, Redis Lua semantics and dashboard controls remain unverified.
