# Phase 2 verification

Verified locally on 13 October 2026, using Node 24.19.0, Next 16.4.0, AI SDK 7.0.138, Pyodide, and Playwright Chromium on Windows. No live provider key was configured.

## Implemented and checked

| Flow                                   | Evidence                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python + JavaScript → real execution   | All seven examples run in both languages through real browser workers, with expected stdout and bounded traces. JavaScript also has trusted-fixture unit execution tests; Python uses the actual Pyodide interpreter.                                                                                                     |
| Snapshots → advanced visuals           | Graph, queue, set, linked-list, matrix, map, stack, heap, and binary-tree browser views; stable alias/cycle fixtures and slotted Python nodes are covered by unit tests.                                                                                                                                                  |
| Calls → recursion scene                | Per-invocation IDs preserve arguments and returns. The browser test captures 288 calls, verifies all remain in the scene, checks that fewer than 100 nodes are rendered in the viewport, scrubs to a later frame, and confirms the current call is highlighted. Native keyboard panning preserves the trace position.     |
| Source → offline Breakdown             | Python `ast.parse` and JavaScript Acorn parsing produce outlines, function/arrow/lambda cards, parameters, return paths, annotations, concepts, and heuristic descriptions. A fixture containing `raise` is parsed without execution; comments/strings do not invent loop nodes.                                          |
| Breakdown ↔ editor                     | Clicking line notes highlights the matching editor line; clicking the editor updates the selected annotation. Both languages and the mobile layout are checked.                                                                                                                                                           |
| Explicit enrichment → route → provider | Actual AI SDK requests use a local compatible HTTP fixture and test key. Valid JSON is accepted, malformed JSON retried, incomplete schemas/source-reference errors rejected, and repeated failures return an offline fallback. Browser fixtures verify AST retention, AI playback notes, and clearing/fallback behavior. |
| Request limits                         | API tests verify 30,000-character code validation, 200,000-byte streamed-body limits, content type, client/global rate windows, and a 429 response with Retry-After.                                                                                                                                                      |
| Runtime failure → recovery             | Both languages handle runtime errors, infinite-loop truncation, supplied stdin, and external 12-second termination followed by a successful new run. Worker networking is blocked; core functionality works with external HTTPS blocked.                                                                                  |
| Sharing / privacy                      | Python clipboard-share browser round trip and Python/JavaScript compressed-hash unit round trips. AI request fixtures exclude stdin/stdout; server results do not contain the test key.                                                                                                                                   |

## Checks

- Strict typecheck and zero-warning ESLint pass.
- **61 unit/integration tests** pass across six suites, including caller-line restoration, exception origins through cleanup, and thrown `undefined` regressions.
- **11 Playwright tests** pass across both phase suites (about 2.6 minutes for the full run), including stdin exhaustion and user variables named `input`.
- Production build passes for `/`, `/design`, and dynamic `/api/analyze`.
- `npm audit --omit=dev`: **zero production vulnerabilities**.
- Axe reports zero violations in checked desktop/mobile Breakdown, structure panels, themes, overlay, and design-page states. Scrollable structures, variables, call frames, and output have keyboard access.
- Production Lighthouse accessibility: **100 desktop / 100 mobile**.
- Production scrubbing: **60.004 average fps** across 180 measured animation frames with a real 5,000-step Python trace; mean **16.666 ms**, p95 **16.700 ms**, maximum **16.800 ms**. The final counter matched the requested position `( 3141 / 5000 )`. This is a local headless Chromium measurement at 1440×1000 with full motion and synthetic native range-input changes; it is not a guarantee for every device.

## Remaining scope and practical limits

- Analysis, complexity/empirical measurement, optimized diffs, suggested tests, other-language simulations, and deployment configuration remain **Phase 3**. Their UI is explicitly reserved.
- JavaScript tracing supports synchronous scripts. Imports, async/await, Promise references, generators, and `with` are rejected with a clear error. Dynamic uninstrumented code is subject to the external deadline.
- No live paid provider/model was tested: the actual SDK was exercised against a local HTTP fixture. OpenAI, compatible, Anthropic, and Google adapters are configured/typechecked; real credentials/model access remain environment-dependent.
- AST pattern labels are heuristics rather than correctness proofs; AI notes are optional and labelled. Structure diagrams use captured fields and collection naming conventions. Node-link views cap at 80 nodes and six visible structures, consistent with snapshot caps; recursion uses a viewport instead of dropping calls.
- The API limiter is in memory per server process. Distributed hosting controls belong to the deployment phase.
- Five development-only lint-chain advisories remain from Phase 1; the production audit is clean. Educational workers do not provide a hardened hostile-code or absolute memory-isolation boundary.

Reproduce the production audits by running `npm run build`, starting `npm run start -- --port 3001`, then running `node scripts/audit-browser.mjs` and `node scripts/measure-scrubbing.mjs`. Reports/screenshots live in the ignored `artifacts/` directory. Decisions and exact limits are in [DECISIONS.md](DECISIONS.md).
