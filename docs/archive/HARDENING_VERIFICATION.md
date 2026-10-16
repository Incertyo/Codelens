# Diagnostic hardening verification

Local source pass on 15 October 2026 (Asia/Calcutta), against the existing CODEBASE_DIAGNOSTIC_REPORT.md and docs/DECISIONS.md. The diagnostic report was untracked at the start of this checkout and was left unchanged. No hosted provider, Redis service or deployment was contacted. Production tests use localhost, AI_ENABLED=false, CODELENS_STATIC_LIBRARY=1 and an intentionally nonexistent SQLite path. Unit library tests use local SQLite mode so the missing-database regression exercises that path.

## Regression evidence

| Fix | Observed failure before the fix | Verification after the fix |
| --- | --- | --- |
| Storage denial | Chromium getItem SecurityError removed the usable controls; setItem raised two unhandled client errors | Real JavaScript browser-worker run, editor, theme/motion controls and playback remain usable for both throwing methods |
| Worker protocol and deadline | Real worker accepted FORGED stdout; forged started and delayed single started allowed a 14-second native body past the intended bound | Real browser workers reject forged results; absent/wrong nonces on copies of real runtime results are ignored; forged, delayed and replayed started cannot reset the parent deadline |
| Python cap | Real Pyodide returned truncated=false when BaseException swallowed the private limit | Same program ends with 100 steps, truncated=true and a safety notice |
| JS defaults | Real instrumenter/runtime produced only module and f calls | Default callback produces its own call/return activation |
| JS constructors | Plain constructor return ref differed from the captured instance | Real runs with implicit/primitive/object constructor returns match the constructed result |
| Snapshot keys | Own __proto__ variable/field disappeared | Real runtime plus trace-schema validation preserves __proto__, constructor, toString and ordinary keys |
| BigInt and stack interop | Real BigInt snapshots produced no bitmask model; append-only output became a stack | Real JS snapshots feed detectVisualModels and yield the BitmaskView model; append-only arrays remain sequences |
| TypeScript | Model result mapped ts to JavaScript | Local model mapping and syntax detection return unsupported; production UI shows a TypeScript-specific message |
| Execution notes | Delayed notes repopulated after rerun, source A→B→A, stdin and cap changes | Four real-execution browser regressions reject late replies even when fetch cancellation is deliberately ignored |
| Graph DOM | Real 80-node adjacency run rendered 6,400 edges | Same run renders 300 edges, fewer than 1,600 descendants in the graph card, and an explicit 300-of-6400 notice |
| Heap disclosures | Closed disclosures mounted two inspector bodies for a real array trace | Closed disclosures mount no inspector bodies; expansion/collapse mounts/unmounts the selected body |
| Aggregate trace bytes | Repeated real JS/Pyodide snapshots completed with results over the selected budget | Both runtimes truncate before 5,000 steps and serialize below 16 MiB, with a serialized-size notice |
| Share expansion | Compressed JSON with small valid source fields and 250,000 padding characters was accepted | Bounded decoding rejects it; a deterministic mixed UTF-16 corpus, Unicode, control-character escaping and maximum supported source/input sizes round-trip |
| Readiness load | Twelve simultaneous GETs issued twelve store calls | Actual route against the local HTTP contract server coalesces them into one call, reuses it at 29 seconds and refreshes at 31 seconds; POST ceilings still apply |
| Analysis churn | Three rapid source edits started three real inspection workers | Production browser coalesces the edits into one real inspection request |

The protocol attack intentionally contains a fabricated message as user source; its execution uses the actual browser worker. Nonce mutation tests copy actual worker results rather than supplying handcrafted successful traces. AI-note HTTP responses are local test responses using sampled indices from real execution, not live model output. Readiness tests exercise the actual route/network contract, not real Redis Lua or hosted ACLs.

## Final checks

- ESLint: passed with zero warnings.
- TypeScript: passed.
- Unit tests: 598 passed in 17 files, including all 343 maintained implementation fixtures and the existing independent algorithm oracle checks. No reference program was changed.
- Production build: passed with the static catalog and nonexistent SQLite path.
- Full production Playwright suite: 71 passed in 10.9 minutes, including all 16 new hardening cases. The final run rebuilt production and used a dedicated artifacts/hardening/final-playwright output directory without concurrent Playwright runs.
- All 23 freshness-manifest inputs and src/generated/library.json match the captured baseline byte-for-byte. Read-only manifest verification passed. Export SHA-256: `054cf4d55ba35611b4eb2b6a917d32ee833908a5dbfa94d14f846e94149d1eac`.
- Comment audit: no added JavaScript/TypeScript comments across 31 changed/new code files, plus zero added Python comment tokens. Literal/regex contents are excluded from comment matching. git diff --check passed.
- React checklist: reviewed effect/subscription cleanup, cancellation and source guards, server-safe storage access, functional state updates, lazy inspector rendering and native disclosure accessibility. No further component changes were required.
- Gitleaks 8.30.1: publishable source scan passed with zero findings. A separate working-directory scan, excluding installed vendors/generated builds/runtime assets/reports, found six matches in pre-existing ignored environment files. All reported Secret fields are redacted. Those private files were neither changed nor copied into the publishable-source scan. This is not a clean whole-workstation secret-scan claim.

## Limits and decisions

The 16 implementation decisions, including constants, cache scope, compatibility choices and the bounded decoder's license notice, are recorded in docs/DECISIONS.md under Diagnostic hardening. README limitations reflect the new behavior.

This pass raises the bar for accidental and casual abuse and does not establish hostile-code isolation. The Python builtins-importer bridge bypass remains a known limitation and is not asserted fixed by any test. No separate origin, nonce CSP, mutual-recursion tree support or complete memory-budget redesign was attempted. The serialized trace budget does not bound interpreter identities, one candidate snapshot, native allocation, serialization peaks or every possible DOM/recursion shape. No new frame-time/FPS or low-memory-device guarantee is made.

Live provider correctness/quota/privacy settings, real Redis Lua/concurrency/ACLs, hosted Firewall/billing settings, other browser engines and deployment were not verified. Existing local SDK/HTTP fixtures do not establish those properties. The source-only pass makes no hosted changes.
