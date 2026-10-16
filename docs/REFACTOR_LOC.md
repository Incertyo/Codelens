# Refactor LOC and intentional changes ledger

## Intentional changes

- **Python-only editor/execution**: Committed at df5659f. JavaScript execution in browser/editor was removed intentionally; JavaScript shares decode source-only with unsupported banner. Older browser specs that execute JavaScript in the editor are obsolete pending Python-only migration in Part B.
- **Python-only consolidation and findings L1–L4**: Uninstalled unused JS AST packages (`acorn`, `astring`, `@vscode/vscode-languagedetection`) and removed dead JS execution runtime, workers, and ML model assets. Streamlined SQLite catalog to 326 Python implementations. Resolved audit findings L1/L3 (saveStoredAnalysis acknowledgement), L2 (`checkCache` schema and offline-first cache serving), and L4 (stale sourceHash identity fallback prevention).
- **Part D LOC reduction and dead code audit**: Removed residual language detection check from `page-intro.tsx` runtime manifest validation, pruned unused harness properties and dead JS strings from `tests/e2e/measurement.spec.ts` and `tests/measurement-programs.ts`.
- **Part E E2E test suite consolidation and trace-structures removal**: Migrated remaining browser specs to Python-only testing (`ai-controls`, `complexity`, `hardening`, `insights-advice`, `language-scope`, `library`, `measurement`, `navigation`, `python-only`, `refactor-characterization`, `visualizers`). Removed obsolete `tests/e2e/trace-structures.spec.ts` (belonged to the removed JavaScript browser runtime feature; visualizer coverage superseded by Python tests in `tests/visualizers.spec.ts` and `tests/e2e/workspace.spec.ts`). Fixed LoadingScreen keyboard Escape cancellation and focus restoration on `.run-button` via Framer Motion `onExitComplete`.

## Commit ledger

| Commit | Description | LOC delta | Notes |
| --- | --- | --- | --- |
| 5fda10e | Stabilize Phase 3 fallout: fix architecture boundaries, limits, and hook encapsulation | +7 (+39 / -32) | Part A stabilization |
| ce8b65d | Consolidate Python-only runtime, remove JS engine and resolve findings L1-L4 | -3594 (+396 / -3990) | Parts B & C consolidation |
| 6ba6f46 | Part D: dead code audit and manifest validation cleanup | -86 (+6 / -92) | Part D dead code audit |
| ad41aab | Consolidate E2E test suite for Python-only CodeLens and fix loading dialog accessibility | -208 (+117 / -325) | Part E E2E consolidation & trace-structures test removal |
