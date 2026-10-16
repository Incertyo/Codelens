# Refactor LOC and intentional changes ledger

## Intentional changes

- **Python-only editor/execution**: Committed at df5659f. JavaScript execution in browser/editor was removed intentionally; JavaScript shares decode source-only with unsupported banner. Older browser specs that execute JavaScript in the editor are obsolete pending Python-only migration in Part B.
- **Phase 3 stabilization**: Resolved ESLint boundary violation in `shared/complexity.ts`, named limit in `complexity-comparison.tsx`, React hook encapsulation in `workspace.tsx`/`use-run-controller.ts`, and unused visualizer imports.
- **Python-only consolidation and findings L1–L4**: Uninstalled unused JS AST packages (`acorn`, `astring`, `@vscode/vscode-languagedetection`) and removed dead JS execution runtime, workers, and ML model assets. Streamlined SQLite catalog to 326 Python implementations. Resolved audit findings L1/L3 (saveStoredAnalysis acknowledgement), L2 (`checkCache` schema and offline-first cache serving), and L4 (stale sourceHash identity fallback prevention).

## Commit ledger

| Commit | Description | LOC delta | Notes |
| --- | --- | --- | --- |
| 5fda10e | Stabilize Phase 3 fallout: fix architecture boundaries, limits, and hook encapsulation | +7 (+39 / -32) | Part A stabilization |
| staged | Consolidate Python-only runtime, remove JS engine and resolve findings L1-L4 | -3595 (+390 / -3985) | Parts B & C consolidation |
