# Revamp module notes

Resume from docs/REFACTOR_STATUS.md. Baseline, audit and approved Phase 2B work are complete. The active branch is refactor/revamp; never push, deploy, call hosted services, print secrets or add code comments.

The latest owner instruction expands implementation to all 3A–3E and explicitly skips builds, tests and verification. That overrides the former per-sub-step stops and verification tiers for this pass only. Implementation is local and unverified. Do not convert this waiver into a claim of passing checks.

Architecture is documented in docs/ARCHITECTURE.md; ordered CSS ownership is docs/STYLES.md. Shared/domain code replaces the former lib/components layout. src/lib retains frozen authored inputs and narrow compatibility entries for unchanged provider fixture imports and the frozen seed script.

The editor/Run boundary is Python-only. Internal JavaScript runners, instrumenter and frozen catalog/golden coverage remain. The direct-worker measurement mismatch is preserved: JavaScript defaults empty options and rejects extra fields; Python requires options and ignores extra root fields. Shared bounds/helpers do not tighten either validator.

The classic Python worker uses generated shared helpers, not a module-worker conversion. generate-worker-core uses the installed TypeScript compiler and is part of predev/prebuild/copy-runtime. Python requests carry named canonical limits. Notes/advice retain separate schemas/prompts/actions but share generation lifecycle. The cache hook is inert. Findings L1–L8 remain deferred; naming the store mutation API does not assert a race-condition fix.

Frozen manifest inputs, generated catalog and golden expectation files must remain untouched. Provider fixture contents remain unchanged; the advice fixture file is renamed by domain. Other test edits are import/setup/action-name adjustments, not regenerated expectations.

Deferred acceptance when requested: T0 typecheck/lint/related units; quick goldens, one production build and affected specs using npx playwright test <specs> --workers=1; full T2 including all goldens. Never run browser specs against Next dev or the rebuilding test:e2e hook. Full production browser, visual, bundle, accessibility, security and catalog/comment checks belong to Phase 4/final-gate authorization.

Some older browser stories still assume selectable JavaScript/Auto. Their Python-only migration remains separate acceptance work; do not silently skip their feature assertions. No new environment variable, provider, dependency or route is introduced by Phase 3.
