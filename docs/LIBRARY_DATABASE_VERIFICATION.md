# Library database verification

Completed locally on Windows with Node 24.19, Python 3.13, Next 16.4, and headless Chromium.

## Coverage and real execution

- SQLite holds the full 309-entry catalog across 16 topics / 44 subtopics, 309 Python reference implementations, and 34 featured-language variants for 17 examples: **343 current code variants**.
- Every current stored program runs through the actual Python/Pyodide tracer or JavaScript instrumentation/runtime in `tests/library.test.ts`. All produce their expected output without errors or reaching the 5,000-step trace cap. This includes advanced graph/flow/matching, trees, range structures, DP optimization, transforms and geometry entries.
- **5,429** deterministic independent checks validate sorting/search-related selections, pattern matching, hulls and distance queries, enumerated cuts for flow/min-cut, brute-force general/bipartite matching and assignment, knapsack, DP optimization, range sums, transforms, primality and red-black/AVL invariants. These supplement the manually specified demonstration expectations; they are not a claim of formal correctness for all possible inputs.
- API tests cover retrieval and version identity, missing programs/languages/revisions, invalid query values and SQL-injection-shaped identifiers, plus a missing-database 503 response.
- Seeding tests operate on a temporary copy: unchanged source creates no revisions; a changed record creates one new revision and preserves the preceding code. Documentation extraction uses deterministic source order to avoid unnecessary version changes.
- SQLite `integrity_check`: **ok**; `foreign_key_check`: **zero violations**.

## Completed checks

| Check                                   | Result                                               |
| --------------------------------------- | ---------------------------------------------------- |
| `npm run lint`                          | Pass                                                 |
| `npm run typecheck`                     | Pass                                                 |
| `npm test`                              | **467 tests passed**, 10 suites                      |
| `npx prettier --check .`                | Pass                                                 |
| `npm run build`                         | Pass; `/api/library` built as a Node route           |
| Production file tracing                 | Includes `data/codelens.sqlite`                      |
| Production opening accessibility        | Lighthouse **100/100**, desktop and mobile           |
| Selected library / expanded information | Axe: zero violations, desktop and light-theme mobile |

The full browser suite ran the 21 existing stories plus two database stories: 22 passed, and one database story exposed an incorrect heading level in the selected preview. After correcting that level, both database stories passed on a focused rerun. A subsequently added delayed-response story also passed, verifying that a pending load cannot overwrite an edited draft. This gives **24 verified browser scenarios**; it is deliberately distinguished from claiming one all-green 24-story run.

The database stories load and execute nonfeatured Dijkstra, Fenwick, Blossom, and FFT implementations; select a JavaScript featured example; recover from a storage-loading failure with the editor preserved; and validate delayed-load protection. Existing stories cover all 17 featured examples through real browser workers, navigation/search, fresh code/undo, loading/cancellation, themes/mobile layouts, safety limits, sharing, breakdown, and specialized visualizers.

## Production preview and regression repair

`scripts/preview-library.mjs` checks the production SQLite → API → editor → Python worker → output path, confirms the full index counts, and captures the selected code and mobile library. It audits expanded workspace information and the mobile library, switches to light theme, reloads with that saved preference, and finishes with **zero page errors**.

This preview exposed a production-only Monaco error: CSS minification shortened a keyword color to `#111`, while Monaco token rules require six/eight hex digits. `monacoTokenColor` now expands shortened three/four-digit hex values before defining the editor theme, with five regression cases. The corrected production page passes light-theme switching and reload.

`scripts/preview-workspace.mjs` additionally passed matching opening/run loaders and cancellation with zero page errors. The production 5,000-step scrubbing measurement averaged **60.002 fps** over 180 frames, with 16.666 ms average / 16.8 ms maximum refresh interval and the expected timeline counter. This was measured during this database change before the theme-normalization repair; the repair only changes palette initialization, not stepping or rendering. Timings describe this machine and workload, not a device-independent guarantee.

Screenshots and audit JSON are written to ignored `artifacts/`, including `database-library-selection.png`, `database-library-workspace.png`, and `database-library-mobile.png`. Browser development audits can emit Monaco's pre-existing duplicate `axe-core` module warning; these are distinguished from page errors.

Phase 3 analysis, other-language simulation and deployment remain paused. The schema, source workflow, educational variants and future persistent-host considerations are described in `LIBRARY_DATABASE.md`.
