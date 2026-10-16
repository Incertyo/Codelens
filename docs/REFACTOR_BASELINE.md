# Revamp baseline

Captured before application changes at 70adfb5; local tag pre-revamp points to the rules/status-only commit 2ef477c. The initial application tree was clean; the owner’s pre-existing AGENTS.md edit was preserved in that commit. All measurements are local, not cross-device performance guarantees.

## Environment and checks

v24.19.0; Windows 10.0.26220; AMD Ryzen 7 5800H with Radeon Graphics; 16 logical CPUs; 31.3 GiB RAM. AI disabled; no hosted services. Unit tests use local SQLite; production uses the static catalog with a nonexistent SQLite path.

| Check | Baseline result |
| --- | --- |
| Unit | 698/698 in 21 files; 62.12 s |
| Typecheck / lint | Pass / pass |
| Production build | Pass; 60.46 s including prebuild verifier |
| Production Chromium | 92 passed, 0 unexpected; 513.02 s; two workers |

The first unit invocation incorrectly forced static-catalog mode and failed the missing-SQLite characterization; the corrected invocation passed all tests without source changes. SDK schema-compatibility warnings in local fixtures are informational.

## Source footprint

Physical lines include blanks and existing comments, exclude only the terminal empty split, and use Git-tracked files. Directory totals are recursive and overlap; do not sum them. Copied runtime assets, builds, SQLite, credentials and artifacts are excluded. Root total includes the lockfile and minified catalog; it is not authored application LOC.

| Directory | Files | LOC | Bytes |
| --- | ---: | ---: | ---: |
| . | 207 | 47816 | 3048187 |
| (root) | 18 | 11955 | 513971 |
| .github | 1 | 51 | 1306 |
| .github/workflows | 1 | 51 | 1306 |
| docs | 19 | 1270 | 218317 |
| library | 17 | 5110 | 168504 |
| library/python | 16 | 5047 | 166275 |
| public | 5 | 730 | 37809 |
| scripts | 15 | 1227 | 51866 |
| src | 95 | 20885 | 1779523 |
| src/app | 11 | 5417 | 109645 |
| src/components | 36 | 6797 | 251670 |
| src/generated | 1 | 1 | 1094243 |
| src/lib | 45 | 8422 | 315457 |
| src/workers | 2 | 248 | 8508 |
| tests | 37 | 6588 | 276891 |
| tests/e2e | 13 | 2441 | 111598 |

## Installed direct dependencies

Logical file bytes of each installed direct package directory, including nested contents if present, excluding shared hoisted transitive packages. Sizes are disk inventories, not bundle savings; they must not be summed as a deduplicated dependency closure. No package is added by Phase 0.

| Package | Kind | Installed version | Bytes |
| --- | --- | --- | ---: |
| @ai-sdk/anthropic | dependencies | 4.0.79 | 2367089 |
| @ai-sdk/google | dependencies | 4.0.94 | 2336608 |
| @ai-sdk/openai | dependencies | 4.0.92 | 3134038 |
| @fontsource/doto | dependencies | 5.3.0 | 182029 |
| @fontsource/jetbrains-mono | dependencies | 5.3.0 | 1801962 |
| @fontsource/space-grotesk | dependencies | 5.3.0 | 377540 |
| @monaco-editor/react | dependencies | 4.7.0 | 152819 |
| @vscode/vscode-languagedetection | dependencies | 1.0.23 | 1811325 |
| acorn | dependencies | 8.19.0 | 568532 |
| ai | dependencies | 7.0.138 | 8170661 |
| astring | dependencies | 1.9.0 | 273164 |
| framer-motion | dependencies | 12.43.0 | 4792116 |
| gsap | dependencies | 3.15.0 | 6258071 |
| lenis | dependencies | 1.3.26 | 457528 |
| lucide-react | dependencies | 0.468.0 | 28578348 |
| lz-string | dependencies | 1.5.0 | 175825 |
| monaco-editor | dependencies | 0.57.0 | 101674083 |
| next | dependencies | 16.4.0 | 192532111 |
| pyodide | dependencies | 0.28.3 | 12716002 |
| react | dependencies | 19.3.0 | 178663 |
| react-dom | dependencies | 19.3.0 | 8063782 |
| zod | dependencies | 4.6.7 | 6148944 |
| zustand | dependencies | 5.0.15 | 95173 |
| @axe-core/playwright | devDependencies | 4.13.0 | 47180 |
| @playwright/test | devDependencies | 1.64.0 | 28542 |
| @tailwindcss/postcss | devDependencies | 4.3.3 | 100480 |
| @types/node | devDependencies | 24.19.2 | 2613701 |
| @types/react | devDependencies | 19.3.0 | 408108 |
| @types/react-dom | devDependencies | 19.3.0 | 32862 |
| eslint | devDependencies | 9.39.5 | 3008896 |
| eslint-config-next | devDependencies | 16.4.0 | 218404 |
| lighthouse | devDependencies | 13.5.0 | 20282492 |
| prettier | devDependencies | 3.9.10 | 9959033 |
| tailwindcss | devDependencies | 4.3.3 | 772893 |
| tsx | devDependencies | 4.23.15 | 396881 |
| typescript | devDependencies | 5.9.3 | 23625066 |
| vitest | devDependencies | 5.0.4 | 3177352 |

## Initial JavaScript by route

Unique modern script src files in the production prerendered HTML, excluding nomodule polyfills. Gzip is the sum of level-9 compressed files, not observed HTTP transfer. Lazy chunks, workers, Monaco, Pyodide and model assets are additional. APIs have no client initial JS.

| Route | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| / | 1016171 | 313476 |
| /design | 612707 | 188863 |
| /_not-found | 579697 | 176258 |
| /api/analyze | Server only | Server only |
| /api/library | Server only | Server only |

## Scrubbing and visual evidence

Chromium 156.0.8078.4 headless, 1440x1000, full motion, loopback production server, no concurrent test workload. Both actual browser workers produced 5,000 captured steps; 181 distinct rendered counters were observed per language across 180 measured frame intervals.

| Language | Average frame ms | p95 ms | Maximum ms |
| --- | ---: | ---: | ---: |
| javascript | 16.666 | 16.700 | 16.800 |
| python | 16.666 | 16.700 | 16.800 |

These frame-clock intervals include Chromium quantization and this machine’s load; they do not establish a universal frame-rate guarantee. This is a changing-array fixture, not a dense-graph benchmark. Raw report: ignored artifacts/refactor/scrubbing.json. Captured 40 screenshots in ignored artifacts/refactor/visual-before: both themes, desktop/mobile, ten screens including the scrolled chart. Manually inspected representative desktop complexity and mobile graph captures; this is a baseline, not a later before/after visual comparison.

## Reproduction

Run npm test, npm run typecheck, npm run lint, npm run build with AI_ENABLED=false. Use CODELENS_STATIC_LIBRARY=1 only for production build/start/browser checks, not the SQLite unit suite. Save JSON unit/build reports under artifacts/refactor, then run node scripts/refactor-metrics.mjs. Run the browser suite with PLAYWRIGHT_PORT set to a free loopback port. See REFACTOR_PARITY.md for golden checks and local screenshot commands.

## Phase 0 safety-net completion

- Final unit suite: 1068/1068 in 24 files; 61.07 s. Added 370 cases comprise corpus characterization and script/contracts, not 370 distinct feature claims.
- The original full production Playwright suite passed 92/92; the two new characterization stories separately passed 2/2 in 13.9 s. A combined 94-case invocation was not repeated because no application/runtime/style/config/dependency code changed.
- Final lint and typecheck pass. Production build and local smoke pass; smoke includes the existing real Java subset until its authorized Phase 1 removal.
- Independent frozen guard: 23 input digests unchanged; catalog SHA-256 d2f57ef116702deca75662b76139359a91d0ad0e8faabb5bf4ed89cebf6b4f38. No catalog regeneration.
- New-code parser audit: seven TS/MJS files, zero comments. Redacted staged and publishable-source gitleaks scans are recorded under ignored artifacts/refactor. No secrets or artifacts are committed.
- Application source, workers, CSS, routes, package manifests and installed dependencies are unchanged from pre-revamp. Recorded initial-route JS byte deltas are therefore zero; no new bundle-savings claim is made.
- Unverified: hosted services/dashboard controls, other browsers/devices, later visual parity and native-runtime equivalence beyond existing tests. The catalog exporter was not rerun; frozen outputs and existing seed/manifest/runtime tests remain the safety net.
- Three suspected contract/documentation issues and two maintenance/test limits are recorded in REFACTOR_FINDINGS.md. No product bug was fixed, no feature removed, no dependency added and no push/deploy performed.
