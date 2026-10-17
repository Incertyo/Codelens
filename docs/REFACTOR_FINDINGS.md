# Revamp findings

## Automatic Insights follow-up

- Medium: new production keyboard coverage loses focus after ArrowRight from Insights to Complexity. The destination becomes selected but is not focused. Core run: 6/7 pass; isolated reruns reproduce twice, including with keyboard actions before accessibility scans. A diagnostic captured body as the active element; cause unresolved. No application focus workaround applied. Retain automatic-insights.spec.ts as the regression and isolate tab focus from disclosure/viewport/dynamic-mount effects. Stopped after three failures per the implementation-loop rule; remaining migrated browser specs are unverified.

Phase 0 observations and consolidated resolutions. All findings L1 to L8 and gate findings have been addressed under the authorized Python-only consolidation decisions.

| Severity / ID | Finding | Resolution & Status | Commit / Notes |
| --- | --- | --- | --- |
| P1 / L1 | suspected privacy-contract gap (save_analysis/save_complexity admitted before validation; non-catalog hash persistence) | Resolved. Route validates save payload, sanitizes persisted fields, and restricts saving strictly to Python. | `ce8b65d` |
| P2 / L2 | unreachable cache path (checkCache branch in analyze route was not in analyzeRequestSchema) | Resolved. Added checkCache to analyzeRequestSchema and served cached analysis before AI provider admission. | `ce8b65d` |
| P2 / L3 | false save acknowledgement (saved:true returned on failed DB write) | Resolved. saveStoredAnalysis return boolean is checked; returns 500 status on failure. | `ce8b65d` |
| P1 / L4 | stale identity and source provenance (fallback query used implementation_id without verifying sourceHash) | Resolved. Strict source hash match enforced in getStoredAnalysis; fallback bypassed when sourceHash provided. | `ce8b65d` |
| P2 / L5 | broad mutable store surface (workspace store patch accepted Partial<State>) | Resolved. Store patch replaced with explicit named actions across workspace and insight controllers. | `6b014e3`, `5fda10e` |
| P2 / L6 | silent fallbacks in repositories and clients | Resolved. Errors classified with safe fallback semantics without leaking secrets or failing silently. | `ce8b65d`, `5fda10e` |
| P2 / L7 | inconsistent-looking clamps between UI and runtime harnesses | Resolved. Centralized canonical limits and named constants in `src/shared/limits.ts`. | `95a743a` |
| P2 / L8 | unsupported detection weakness (heuristic false positives on non-Python) | Closed. JavaScript engine and automatic language detection removed in Python-only consolidation. | `ce8b65d` |
| P2 | historical documentation drift (README statements on Java/JS) | Resolved. README.md updated to reflect Python-only single language, removing JS/model references. | Fix commit |
| P3 | maintenance command verification limit (catalog export / seeder) | Resolved. Catalog verified byte-identical; manifest SHA-256 recorded. | `ce8b65d` |
| P2 | suspected source-label mismatch | Resolved. Complexity view displays Guide labels for static baseline and separates AI estimates. | `ce8b65d` |
| P2 | resolved verification artifact (ai-controls Monaco dev lifecycle) | Resolved. E2E verification standard requires production build (`npm run build`). | `b120f5c` |
