# Revamp parity safety net

Phase 0 changes tests, local tools and documentation only. `pre-revamp` marks the clean, green application baseline plus owner rules/status. No application refactoring, bug fix, dependency change, push or deployment belongs to this phase.

## Golden records

- `tests/fixtures/revamp/catalog.json`: all 343 current exported implementations plus 17 explicit JavaScript examples, keyed by exact implementation/example id. Each record has language, exact source SHA-256, step count, normalized full-trace SHA-256, actual model outputs at five evenly spaced captured steps, complete AST outline and static inspection result. Historical inactive revisions are not the 343-current corpus.
- `contracts.json`: exact legacy and compact share strings/decodes; Unicode and invalid cases; AI notes/advice/simulation SDK bodies, local route status/body/cache headers, invalid requests, identity mismatch, save-mode missing-hash errors, cache miss and library inventory. These contain only authored test source, synthetic provider output and dummy fixture configuration. Real trace indices and AST entries supply request metadata; the hypothetical simulation response uses an actual JavaScript trace of the corresponding test calculation, not a claim to execute C++. Existing failure/quota tests remain authoritative for additional error paths.
- `frozen.json`: all freshness-manifest input digests plus exact catalog export digest, independent of the current exported manifest's own assertions.

Normalization sorts record keys, serializes Map/Set explicitly and sorts unordered Python set/frozenset members. It excludes only the trace's elapsed time. Ordered arrays, heap reference ids, frame ids, values, stdout, errors, truncation and static wording remain compared. It does not omit source locations or use semantic equivalence to excuse changes. It is finite characterization, not algorithm correctness proof. Golden fixtures are local repository-owned sample data, never user programs or hosted persistence.

Run `npx vitest run tests/refactor-parity.test.ts tests/refactor-contracts.test.ts tests/refactor-scripts.test.ts` after each later cluster. The ordinary full unit suite includes them automatically. Keep all surviving Python/JavaScript records unchanged. Phase 1 may change only explicitly removed Java/C++ contract cases and the unsupported-language compatibility cases it necessarily replaces.

Missing goldens first fail a real test. Generation is developer-only: explicitly set `CODELENS_UPDATE_GOLDENS=1` for the same targeted command, then unset it and verify in a fresh process. Never set this flag in CI, use it to bless a refactor mismatch, or regenerate frozen inputs as a shortcut. Review every deliberate contract change. There is no new application env variable or route.

## Local visual and performance tools

Start an AI-disabled production server on a free loopback port. These tools reject remote origins and abort non-GET or off-origin browser requests. They do not run in CI, call providers or change deployment configuration.

```sh
node scripts/refactor-visual-parity.mjs --url=http://127.0.0.1:3017 --output=artifacts/refactor/visual-before
node scripts/refactor-scrubbing.mjs http://127.0.0.1:3017
node scripts/refactor-metrics.mjs
```

The visual script captures editor, real trace/recursion, Breakdown, Analysis, measured Complexity and its scrolled chart, library, menu, graph and design screens in dark/light at 1440×1000 and 390×844: 40 screenshots. It fixes reduced motion, blurs transient focus before capture and masks the changing counter/footer timing text. Keep the same Chromium version, viewport, fonts and fixture source for later visual diffs. Screenshots and reports stay ignored under artifacts/refactor. Motion timing, intro timing, accessibility and real-worker Python behavior are separately asserted by existing browser tests; static captures cannot establish them.

The scrubbing tool creates actual capped 5,000-step traces in both real browser workers, drives 181 timeline positions through DOM events and verifies at least 100 distinct rendered counters. It reports 180 frame-clock intervals, average, p95 and maximum; these include local load and frame-clock quantization and are not a 60 fps promise.

The metrics script inventories Git-tracked source, logical installed direct-package bytes and modern production HTML script references. Reports come from explicitly saved local JSON unit/build files; the baseline document defines exclusions. For later measurements pass --unit-report=artifacts/refactor/final-unit.json, --build-report=artifacts/refactor/final-build.json and --output=artifacts/refactor/final-metrics.json. Do not include credentials, SQLite files or downloaded runtime contents in source LOC. Record final-vs-baseline changes without replacing the baseline.
