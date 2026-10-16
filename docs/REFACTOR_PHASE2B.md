# Phase 2B cleanup ledger

The owner's continue after the Phase 2A report approves its proposed first batch: unused wrappers/alias, Lenis removal and equivalent AST predicate reuse. Optional broad export narrowing is deferred until shared-core ownership is established. No CSS, pipeline, worker-protocol, persistence, detection or UI behavior change is part of this batch. Findings L1–L8 remain separate, unfixed decisions.

## Cluster 1 — unused wrappers and alias

- Remove only buildEnrichmentForAlgorithm, StructureViews, inert GrowthLadder and the unused PythonRunner alias. Phase 2A's TypeScript reference scan and fresh scoped src/scripts/tests searches find no caller. None is an entry point, dynamic import, script, test, generated artifact or frozen input. Keep CodeRunner, StructureView/Diagram and all active chart/catalog composition.
- Remove only the now-unused detectStructures import from the plural wrapper's file; retain the Enrichment type import used by catalog metadata types.
- Existing related unit assertions pass unchanged before and after: 82/82 in six files. Incremental typecheck, cached changed-file eslint, quick goldens and one production build pass. Same-build visualizers, complexity and language-scope browser specs pass 17/17 with no retries/skips; the former Phase 1 language-scope verification gap is closed. Evidence: ignored artifacts/refactor/phase2b/wrappers-* reports/logs.
- React skill review: only unmounted declarations/imports are removed; mounted JSX, hooks, state, event listeners, server/client boundaries, accessible labels and reduced-motion behavior are unchanged. No new dependency or provider request is introduced.

## Next clusters

- Lenis has no source/script/config consumer; installed version 1.3.26 occupies 457,528 direct package bytes. Remove it offline, inspect the exact dependency/lockfile delta and retain GSAP/Framer Motion. This disk inventory is not a measured route/bundle saving.
- Reuse javascript/ast.ts isNode from the instrumenter instead of its equivalent local isNodeValue predicate. Preserve the AST traversal order and actual instrumenter/runtime output, verified by existing real traces/goldens.

T0 remains incremental typecheck, changed-file cached lint and related unit tests; T1 quick goldens plus affected production specs, one build per sub-step; T2 full units/goldens at phase end. Tests and golden fixtures are not rewritten. Source-only local work; no network installs, hosted calls, push or deployment. Stop after this batch before Phase 3A.
