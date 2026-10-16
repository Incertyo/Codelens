# Refactor LOC and intentional changes ledger

## Intentional changes

- **Python-only editor/execution**: Committed at df5659f. JavaScript execution in browser/editor was removed intentionally; JavaScript shares decode source-only with unsupported banner. Older browser specs that execute JavaScript in the editor are obsolete pending Python-only migration in Part B.
- **Phase 3 stabilization**: Resolved ESLint boundary violation in `shared/complexity.ts`, named limit in `complexity-comparison.tsx`, React hook encapsulation in `workspace.tsx`/`use-run-controller.ts`, and unused visualizer imports.

## Commit ledger

| Commit | Description | LOC delta | Notes |
| --- | --- | --- | --- |
