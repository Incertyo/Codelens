# V2 Step 1 verification — 15 October 2026

Local source changes only, on Windows with Node 24.19.0, Next 16.4.0, real Acorn/Astring instrumentation, Pyodide 0.28.3 and production Chromium browser workers. No hosted service, deployment or push was used. Existing hardening work and the original diagnostic report remain intact.

## Feature and regression evidence

- Before implementation, the new numerical suite failed because the fixed-reference module did not exist. The new production JavaScript browser story failed against the preceding build because the seven-class ladder was absent. The before-run artifact is under ignored artifacts/v2-step1-before.
- Six new numerical tests cover all seven fixed functions and dash identities, domain/id rejection, through-origin NNLS, affine overhead and nonnegative constraints, zero-log shapes, real instrumented event counts, exact constant fits, anchored million-size exponential fits, static-label agreement/disagreement, neighbours, and operation formatting through Number.MAX_SAFE_INTEGER. Large exponential formatting stays finite without constructing an enormous BigInt.
- Three new production stories execute actual workers: JavaScript and Python each collect five measured samples and verify seven overlays, the estimated curve, five measured circles, distinct dash patterns, the scale table, exact measured counts in the hidden equivalent table, keyboard Space on the log toggle, finite SVG coordinates, light/dark themes, reduced motion, mobile overflow and axe. Both stories observe zero POST uploads. A third real early-exit loop has an O(n) AST candidate but identical event counts at all tested sizes; it verifies neutral O(n)/O(1) disagreement and the two-class endpoint table.
- The first after-build browser run caught mobile overflow in the hidden table, also detected by the retained Phase 3 accessibility story. Moving the visually hidden clipping to a wrapper fixed the interaction with existing generic table CSS. The final production rerun passes all twelve stories together. Tiny scaled reference values use scientific notation rather than being rounded to zero in the equivalent data table.
- The nine existing Phase 3 stories remain. The five-row assertion in tests/e2e/phase-three.spec.ts now selects the exact-count table by caption because the page has two new legitimate tables. Its count and every other existing assertion are preserved. No screenshots or tests for the three-tab layout were removed; tab consolidation belongs to Step 3.

## Completed checks

| Check | Result |
| --- | --- |
| npm run lint | Passed, zero warnings |
| npm run typecheck | Passed |
| npm test | 604 tests passed in 18 files; all 343 maintained implementation fixtures retained |
| Production npm run build | Passed, including read-only catalog manifest verification |
| Relevant production Playwright | 12 passed together in 2.0 minutes: complexity.spec.ts and phase-three.spec.ts |
| npm run smoke -- http://127.0.0.1:3001 | Passed all eight local AI-off checks; no provider call |
| Formatting and git diff --check | Passed for all changed Step 1 code; no whitespace errors |
| Catalog preservation | All 23 manifest inputs and exported catalog byte-for-byte unchanged |
| Comment audit | Zero additions across 37 changed/new JS/TS files, plus zero CSS comment additions |
| Gitleaks 8.30.1 | Publishable-source scan passed, zero findings; private ignored files, vendors and builds excluded |

Production build/browser/smoke used AI_ENABLED=false, CODELENS_STATIC_LIBRARY=1 and an intentionally nonexistent SQLite path. Unit tests use local SQLite mode and local HTTP provider/store fixtures. No source, stdin, output or variable value was sent to a hosted service. Unit seeding created zero new revisions.

Catalog export SHA-256 remains `054cf4d55ba35611b4eb2b6a917d32ee833908a5dbfa94d14f846e94149d1eac`. Comment audit uses TypeScript parser/scanner ranges with literal exclusion and a separate PostCSS comment check. Python was unchanged in this step. The Gitleaks scan copies only Git-visible publishable files to an external temporary directory, never ignored private environment files. This is not a clean whole-working-directory secret-scan claim; the earlier hardening report records ignored-environment findings.

Mobile screenshots for both real runtimes are under ignored artifacts/v2-step1-javascript-mobile.png and artifacts/v2-step1-python-mobile.png; the JavaScript mobile capture was visually inspected. Final Playwright artifacts use a separate artifacts/v2-step1-final-playwright directory. The React checklist covered component extraction, native controls, source-remount ownership, existing cancellation/debounce, theme tokens, semantic labels/tables, bounded chart sampling and absence of new animation/fetch effects.

## Decisions and remaining verification

All eleven decisions, including fixed model ids, normalized NNLS, preserved affine fitting, clipping/flooring, numerical limits, table semantics, neighbouring classes, qualitative English thresholds, component boundaries and test changes, are enumerated in DECISIONS.md under V2 Step 1. README and DEPLOYMENT describe the comparison and its limitations. There are no new routes or variables, so .env.example, check:env and smoke retain their existing contracts; no dashboard action is required for this step.

The full production Playwright suite was not rerun for Step 1; its next required gates are after Steps 3 and 5. Other browser engines, manual assistive-technology testing, frame-time/low-memory benchmarking, hosted environment configuration, provider/Redis behavior and deployment were not verified. Fits remain estimates at deterministic tested sizes, not asymptotic proofs. The scale table is a unit-cost illustration, not extrapolated measured work or elapsed time. Stop after this step until the owner says continue.
