# Refactor LOC and intentional changes ledger

## Catalog manifest hash
- **New manifest SHA-256**: `e72332afae4eedec9484b0dc7bcb0e7ee666afb499b81a8122a2ef4f99db868a`
- Verified byte-identical across all 326 Python catalog implementations (309 reference + 17 featured).

## Intentional changes & test removals

- **Python-only editor/execution**: Committed at `df5659f`. JavaScript execution in browser/editor was removed intentionally; JavaScript shares decode source-only with unsupported banner.
- **Python-only consolidation and findings L1–L4 (`ce8b65d`)**: Uninstalled unused JS AST packages (`acorn`, `astring`, `@vscode/vscode-languagedetection`) and removed dead JS execution runtime, workers, and ML model assets. Streamlined SQLite catalog to 326 Python implementations. Resolved audit findings L1/L3 (saveStoredAnalysis acknowledgement and payload sanitization), L2 (`checkCache` schema and offline-first cache serving), and L4 (stale sourceHash identity fallback prevention).
  - Removed `tests/javascript.test.ts` (-196 LOC): JS runtime unit tests removed because JS execution engine was decommissioned.
  - Removed `tests/language-detection.test.ts` (-136 LOC): language detection tests removed because ML auto-detection was decommissioned.
  - Removed `tests/e2e/opening-detection.spec.ts` (-239 LOC): browser opening detection tests removed because language detection was decommissioned.
  - Removed `tests/fixtures/language-detection-corpus.ts` (-67 LOC) & `scripts/evaluate-language-detection.ts` (-104 LOC).
- **Part D LOC reduction and dead code audit (`6ba6f46`)**: Removed residual language detection check from `page-intro.tsx` runtime manifest validation, pruned unused harness properties and dead JS strings from `tests/e2e/measurement.spec.ts` and `tests/measurement-programs.ts`.
- **Part E E2E test suite consolidation and trace-structures removal (`ad41aab`)**: Migrated remaining browser specs to Python-only testing. Removed obsolete `tests/e2e/trace-structures.spec.ts` (-214 LOC; belonged to removed JS runtime; visualizer coverage superseded by Python tests in `tests/visualizers.spec.ts`). Fixed LoadingScreen keyboard Escape cancellation and focus restoration on `.run-button` via Framer Motion `onExitComplete`.
- **Verification archive (`5ea4714`)**: Archived 13 historical `*_VERIFICATION.md` documents under `docs/archive` with index.
- **Vestigial JS cleanup (`6deeb70`)**: Removed obsolete `scripts/measure-visualizers.mjs` (-144 LOC), removed dead language selector in `scripts/preview-workspace.mjs`, enforced `z.literal('python')` in library contract, and simplified filebar extension to `.py`.
- **Comments and test cleanup (`ff7307b`)**: Stripped code comments across touched files and aligned `tests/analysis-db.test.ts` to python.

## Commit ledger

| Commit | Description | LOC delta | Notes |
| --- | --- | --- | --- |
| 5fda10e | Stabilize Phase 3 fallout: fix architecture boundaries, limits, and hook encapsulation | +7 (+39 / -32) | Part A stabilization |
| ce8b65d | Consolidate Python-only runtime, remove JS engine and resolve findings L1-L4 | -3594 (+396 / -3990) | Parts B & C consolidation |
| 6ba6f46 | Part D: dead code audit and manifest validation cleanup | -86 (+6 / -92) | Part D dead code audit |
| ad41aab | Consolidate E2E test suite for Python-only CodeLens and fix loading dialog accessibility | -208 (+117 / -325) | Part E E2E consolidation & trace-structures test removal |
| 5ea4714 | docs: archive historical verification documents under docs/archive with index | +21 (+21 / -0) | Part D verification archive |
| 6deeb70 | refactor: remove vestigial JavaScript references, dead measurement script and enforce Python-only library contract | -145 (+4 / -149) | Vestigial JS cleanup |
| ff7307b | clean: remove code comments across touched files and update analysis persistence test to python | -26 (+2 / -28) | Comments & test cleanup |

| Groq compatibility fix (this commit) | Scope best-effort JSON Schema to Groq; retain strict local validation | +156 source/test LOC (+159 / -3) | Generation options +8/-3; new real-SDK/local-HTTP regression test +151; no existing fixture/assertion removal |
