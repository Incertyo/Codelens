# Phase 2B cleanup ledger

The owner's continue after the Phase 2A report approves its proposed first batch: unused wrappers/alias, Lenis removal and equivalent AST predicate reuse. Optional broad export narrowing is deferred until shared-core ownership is established. No CSS, pipeline, worker-protocol, persistence, detection or UI behavior change is part of this batch. Findings L1–L8 remain separate, unfixed decisions.

## Cluster 1 — unused wrappers and alias

- Remove only buildEnrichmentForAlgorithm, StructureViews, inert GrowthLadder and the unused PythonRunner alias. Phase 2A's TypeScript reference scan and fresh scoped src/scripts/tests searches find no caller. None is an entry point, dynamic import, script, test, generated artifact or frozen input. Keep CodeRunner, StructureView/Diagram and all active chart/catalog composition.
- Remove only the now-unused detectStructures import from the plural wrapper's file; retain the Enrichment type import used by catalog metadata types.
- Existing related unit assertions pass unchanged before and after: 82/82 in six files. Incremental typecheck, cached changed-file eslint, quick goldens and one production build pass. Same-build visualizers, complexity and language-scope browser specs pass 17/17 with no retries/skips; the former Phase 1 language-scope verification gap is closed. Evidence: ignored artifacts/refactor/phase2b/wrappers-* reports/logs.
- React skill review: only unmounted declarations/imports are removed; mounted JSX, hooks, state, event listeners, server/client boundaries, accessible labels and reduced-motion behavior are unchanged. No new dependency or provider request is introduced.

## Cluster 2 — unused Lenis dependency

- Lenis has no source/script/config consumer; removed installed version 1.3.26 offline with ignore-scripts/no-audit/no-fund. Exactly node_modules/lenis disappears from the lockfile; every other package entry is byte-equivalent as parsed JSON, and only the root Lenis dependency changes. Nothing is added or upgraded. Direct runtime packages decrease 23 to 22, all direct dependencies 37 to 36. GSAP/Framer Motion remain.
- The direct installed package occupied 457,528 bytes before removal and no longer exists locally. This is not a measured route/bundle saving. Evidence: dependency-before.json and dependency-delta.json in ignored artifacts/refactor/phase2b.
- Manifest-related Vitest selection unexpectedly includes the entire suite: 1,021/1,021 pass, including goldens, without fixture changes. The additional maintenance-script selection passes 7/7 and incremental typecheck/quick goldens pass. Changed-code lint scope is empty for the two JSON manifest edits. One production build passes; same-build selected intro cases in opening-detection plus loading-sizing pass 10/10, no retries/skips, 54.94 s. Evidence: ignored lenis-* logs/reports.
- Verification gotcha: avoid manifest-only related selection in future because it expands to all tests; use explicit existing maintenance tests for this scope. This broad invocation was not an intentional extra full gate; phase-end T2 remains necessary after the later instrumenter change.

## Next cluster

Reuse javascript/ast.ts isNode from the instrumenter instead of its equivalent local isNodeValue predicate. Preserve the AST traversal order and actual instrumenter/runtime output, verified by existing real traces/goldens.

T0 remains incremental typecheck, changed-file cached lint and related unit tests; T1 quick goldens plus affected production specs, one build per sub-step; T2 full units/goldens at phase end. Tests and golden fixtures are not rewritten. Source-only local work; no network installs, hosted calls, push or deployment. Stop after this batch before Phase 3A.
