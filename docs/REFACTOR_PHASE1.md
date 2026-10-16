# Phase 1 removal ledger

## Frozen-input exception

- Modified freshness input: src/lib/javascript-examples.ts; remove only its obsolete Java/C++ guard, leaving every authored program byte unchanged.
- Deliberate library:export: zero new revisions; 690 historical/current revision records retained.
- Old manifest digest: c168206846c561a62e45f8a90ff586cbc5d9d09610f3852c2c73341bd4869d12.
- New manifest digest: cc36b9679563fec3862b35d316bb3c3399ca052633e412bd45db550084efc005.
- Old full export SHA-256: d2f57ef116702deca75662b76139359a91d0ad0e8faabb5bf4ed89cebf6b4f38.
- New full export SHA-256: 863599fe77305f1db3ce09ea4726237fd9f7c6ea415ecfdfb417a3bbbbb03051.
- Identical serialized index/implementation data SHA-256: b915c1bb9fd0b37a0778cbb1b0f9b5e5c2bc0e33c9af90bc3e7f78e561c34193.
- Only that manifest entry changed; every other freshness input matches. Frozen-fixture metadata tracks this explicit exception. Trace/contract golden files are unchanged.

## Removal evidence

- Removed src/lib/java/{compiler,runtime,analysis,measurement,example}.ts and src/lib/ai/simulation.ts after removing their imports/call sites. Targeted static searches found no surviving caller; no deleted module is a Next convention, worker entry, dynamic import or package script. The shared JavaScript worker remains.
- Removed tests/java.test.ts and tests/e2e/java.spec.ts and simulation-specific test blocks under the owner’s explicit Phase 1 instruction, not as unused-test cleanup. Deleted docs/JAVA_SUBSET.md active feature instructions; historical verification reports are retained for Phase 4.
- Removed only simulation selectors in globals.css, its loading/banner/consent UI and its generation/schema/validator path. No generic style consolidation.
- No exclusively unused package: compiler/runtime used no dependency; provider SDKs, Zod and worker/runtime packages remain required. Model removal is not approved and the measured criterion was not met.

## Test changes

- Added language-scope.test.ts and e2e/language-scope.spec.ts: narrow type, unsupported mappings/schemas, pre-admission 410, exact old shares, re-sharing, disabled execution, New/Undo recovery and real JS run after explicit selection.
- language-detection.test.ts and opening-detection.spec.ts move Java/C++ positive cases to unsupported regressions, preserving manual/Auto/source ownership checks with JavaScript as the manual choice.
- analyze.test.ts drops two Java-only cases; analysis.test.ts drops simulation validation/heatmap exclusions; phase3-ai.test.ts and google-ai.test.ts drop only simulation cases. Daily-limit/provider-quota matrices retain notes/advice rows in ai-controls.test.ts and google-ai.test.ts.
- phase-three.spec.ts drops only two simulation stories; advice, measured complexity, heatmap, stale response, real suggested-test, library identity and security-header stories remain.
- refactor-contracts.test.ts compares the unchanged baseline after projecting out only simulationRequest, responses.simulation and its third provider call. Old Java/C++ share fixtures still compare exactly.
- Added quick-golden selector test and an evenly labelled 40-case corpus test; full 360-record runtime/model/outline/inspection parity remains available at T2.

## Lean verification

T0 passes: incremental typecheck, cached changed-file eslint and 639 related unit cases. Quick golden T1 passes, comparing all selected surviving fields without rewriting fixtures. The privacy/quota browser story passes with its updated source-notice selector.

The owner corrected T1 to production-only verification. One production build passed; diagnosis run 1 of the existing exhausted-budget case passed (1/1, no retries, 7.94 s). Under the specified decision rule the earlier Monaco disposal/error overlays were development-server artifacts. No application change, baseline worktree run or bisect was needed.

Reusing that exact build, opening-detection, ai-controls, phase-three, workspace and library passed 33/33, with no retries or skips, in 275.82 s. T2 passed 1,021/1,021 across 26 files in 63.30 s, including 360 real-runtime records plus inventory guard and both API/share contract assertions; no golden was regenerated. Evidence: ignored artifacts/refactor/phase1-production/{build.log,diagnosis.json,t1.json,t2.json}. Incremental T0 typecheck passed for the documentation-only verification commit; no changed-code eslint/related-test scope exists. The earlier code commit's T0 remains green.

No full browser suite, bundle analysis, secret scan or T3 gate was run. The newly added e2e/language-scope.spec.ts was outside the owner's five-spec resumption list and was not run in this resumption; its unit counterparts passed in T2. Local HTTP fixtures and installed runtimes only. Application Next configuration is unchanged; earlier dev harnesses/logs remain ignored under artifacts/refactor/phase1. Continue directly to the report-only lean Phase 2A audit.
