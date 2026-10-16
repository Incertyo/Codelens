# A/B/C verification — 2026-10-14

Source-only implementation; no deployment and no comment stripping.

| Check                             | Result                                                               |
| --------------------------------- | -------------------------------------------------------------------- |
| `npm run lint`                    | Passed, zero warnings                                                |
| `npm run typecheck`               | Passed                                                               |
| `npm test`                        | 573 tests passed in 16 files                                         |
| Production `npm run build`        | Passed, webpack compilation and static catalog manifest verification |
| `npm run test:e2e -- --workers=2` | 54 tests passed against the final production build, 4.6 minutes      |

Production browser verification used Node 24, Chromium, `AI_ENABLED=false`, `CODELENS_STATIC_LIBRARY=1`, a nonexistent SQLite path and `PLAYWRIGHT_PORT=3107`. The suite starts and closes its own server. A preceding single-worker production run passed all 53 tests then present. The final run includes the additional pasted-sample ownership regression and post-commit focus restoration fix.

## Google provider evidence

The actual installed Google SDK and `/api/analyze` route were checked with the user's ignored local Google AI Studio credential and environment-supplied model. Harmless fixture source was used; no model ID was hardcoded and no credentials were printed or copied into source/client assets.

- Live notes returned HTTP 200, `source=ai` and fully validated enrichment, using two provider attempts.
- Live analysis suggestions returned HTTP 200, `source=ai` and validated advice, using one provider attempt.
- A live C++ simulation probe reached Google twice with HTTP 200 responses, but neither trace passed validation. The route returned `source=static` and the explicit unavailable-simulation reason. No invalid trace was accepted or repaired. Provider access does not guarantee usable generated simulations.
- Shared storage for these live provider checks was the local HTTP Redis contract fixture, **not hosted Redis**. Hosted Redis, dashboard spending/bot controls, branch protection and public deployment were not changed or verified here.

The live notes probe exposed Google's constrained-decoding schema state limit. The implementation now sends the shape without large bounds while preserving full original SDK/Zod and local reference validation. SDK contract tests cover the environment model/header, strict output rejection, counted validation retries, and HTTP 429/RESOURCE_EXHAUSTED with exactly one call in notes, analysis and simulation modes. Production browser tests cover the privacy notice, provider-quota pause and continued local breakdown/trace operation.

## Local detection and opening intro

Unit tests exercise representative supported syntax/shebangs, short/ambiguous/unsupported inputs, supported-only model mappings, confidence/margin thresholds, source provenance, stale revisions, execution guards and sticky manual choice. Browser tests load the real worker CPU model and hashed model/weight assets, verify immutable caching and same-origin requests with no POST, map TypeScript to JavaScript, and preserve pasted code/manual/sample/library/share ownership.

Browser tests verify SSR coverage/inert markup, real readiness and minimum duration, refresh/new-tab repetition, click/Enter/Escape skipping, reduced-motion static text/fade, mobile accessibility, focus containment/restoration, bounded Monaco failure and an inline watchdog when hydration scripts fail. Existing per-run cancellation, execution, analysis, visualizer, recovery and accessibility stories also pass. Test helpers wait for the page intro before typing; focus restoration occurs after React commits removal of inert, preventing the race found under parallel browser load.
