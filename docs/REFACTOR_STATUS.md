# Revamp status

- Branch: refactor/revamp. Owner authorized committing and pushing the verified Insights work; no public deployment, provider call or secret output performed.
- Consolidation Parts A–E are complete; baseline checks and LOC ledger are recorded in docs/REFACTOR_LOC.md.
- Python is the sole execution language. Reference programs, catalog/manifest inputs and golden expectations are frozen.
- Groq schema compatibility fix is committed as 77b22be; live provider/account success remains unverified.

## Current work

- Breakdown and Analysis are merged into Insights; Visualizer and Complexity remain separate.
- Latest request supersedes AST-first display: validated AI is primary; actual AST is a labelled fallback when notes fail, are unavailable or paused before completion.
- While first notes are pending, show Preparing AI notes. Existing valid notes survive later review failures. Missing AI prose is not filled with heuristics.
- Insights has four fixed sections: Overview, Structure and flow, Run evidence, Review. No cost estimates, memory guesses or estimate-status language. Separate Complexity tools remain intact.
- Cosmetic headings cannot invalidate otherwise valid notes or spend retries. Unicode dashes are supported; unusable headings are omitted. Strict schema and actual source/function/step reference checks remain.
- Structured prompts request no complexity guesses. Legacy omitted-format prompts/contracts remain exact; no golden regeneration.
- Automatic AI, privacy, quotas/cancellation, diff/apply/undo and real-worker tests remain. No new environment variable, route or dependency.
- Contract: docs/ai/INSIGHTS.md and specs/ai-primary-insights.md. DECISIONS records scope, false-rejection evidence and live-provider uncertainty.
- Latest verified merge and AI-primary report changes are prepared for the owner-requested commit/push; no unrelated changes reverted.

## Verification

- Test-first unit and production-browser regressions reproduced the prior cosmetic rejection, AST filling/costs and missing AI-first loading behavior.
- Full unit suite: 914/914, including real runtimes, full catalog/trace and legacy API contract goldens.
- Production build, incremental typecheck, scoped lint and catalog verification pass.
- Affected production browser batches: 21/21 main plus 6/6 cancellation/debounce/workspace accessibility; 27 distinct cases, no retries/skips/flaky cases.
- Coverage includes AI-first loading, genuine AST fallback, invalid notes, retained AI after review failure, no estimates, both samples/themes/mobile, axe, explicit actions, quotas and real measurement/test workers.
- Earlier cross-tab keyboard focus failure remains unresolved: assertion failed three times before this format pass. Retained unchanged, explicitly excluded; no further troubleshooting.
- Catalog blob and frozen inputs/goldens unchanged. Added-comment scan: zero candidates. LOC ledger updated; diff whitespace check passes.
- No full browser/final security gate or live provider check. check:env/smoke configuration unchanged.
- Local production preview: http://127.0.0.1:3001/ returns HTTP 200 with existing private configuration; owned server session 38921. No actual AI request made.

## Next

- Current AI-primary implementation and focused verification complete; refresh local preview for the new build.
- Separate acceptance: resolve the recorded keyboard focus issue and run the authorized final gate. Do not weaken assertions or regenerate frozen outputs.
