# Phase 2.5 verification

Verified on 14 October 2026 on Windows, Node 24.19.0, Next 16.4.0, actual Pyodide and Chromium browser Workers. Phase 3 remains paused.

## Implemented flow

Source → cached language-aware lexical evidence → actual Worker execution → bounded Step snapshots → client-only detection → modular React/SVG canvas. No new server execution or AI requests are involved. All thirteen requested specialized model categories are implemented, plus ordinary sequence/matrix/map/node fallbacks and the Scalar State Monitor.

| Verification gate          | Evidence                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All 13 detector categories | `tests/detectors.test.ts` covers every model, racecar pointer bindings, operation-based stacks, heapq evidence, intervals, windows, buckets, sets, tries, DSU, segment/Fenwick ranges, bit registers, and DP dependencies.                                                                                                          |
| Detector edge cases        | Aliases/all-frame lookup, nearest local pointers, cycles, invalid parents, Unicode indexing differences, native JS pop arguments, indexed-write exclusions, literals/comments, empty states, and 80-cell/six-view caps.                                                                                                             |
| Python queue snapshots     | Real Pyodide captures Queue, LifoQueue and PriorityQueue contents without synchronization internals.                                                                                                                                                                                                                                |
| Browser user flows         | `tests/visualizers.spec.ts` executes the palindrome, parentheses validator, heapq top-K and XOR scripts; verifies pointer translation/reversibility, vertical order/TOP movement, tree/array agreement, and changing bit states. Additional real JS/Python runs cover every remaining specialized renderer and the scalar fallback. |
| Accessibility              | New canvas states checked by axe in dark/light themes, including empty queues/sets/heaps/sequences/strings; DP/scalar mobile layout checked. Overflow areas use native keyboard scrolling. Yellow highlights also have labels, indices or shape.                                                                                    |
| Regression                 | All existing Phase 1/2 unit and eleven browser tests are retained, including original examples, share links, offline parsing, AI contracts, timeouts/recovery and recursion viewport behavior. The baseline was 61 unit tests (four more than the brief's older 57 count).                                                          |

## Final checks

| Check                       | Result                                                                                                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript           | Pass                                                                                                                                                                                                                               |
| ESLint                      | Pass, zero warnings                                                                                                                                                                                                                |
| Prettier                    | Pass                                                                                                                                                                                                                               |
| Unit/integration tests      | **81 pass** across seven suites; all 61 baseline tests retained, plus 19 detector tests and a real Python queue test                                                                                                               |
| Playwright                  | **17 pass** (4.4 minutes); all eleven baseline tests plus six new visualizer stories                                                                                                                                               |
| Production build            | Pass for `/`, `/design`, and existing `/api/analyze`                                                                                                                                                                               |
| Production dependency audit | Zero vulnerabilities                                                                                                                                                                                                               |
| Lighthouse accessibility    | **100 desktop / 100 mobile**                                                                                                                                                                                                       |
| New canvas axe checks       | Zero violations in checked dark/light states, including empty containers; DP/scalar mobile passes                                                                                                                                  |
| 5,000-step performance      | **16 cases**, 180 measured updates each, full motion; **60.000–60.004 fps**, **16.666–16.667 ms mean refresh interval**                                                                                                            |
| Committed update work       | Every timed native input event includes its matching DOM counter and renderer commit; **zero deferred commits**, zero page errors, all final counters correct. Slowest committed update **9.5 ms**, within the 16.7 ms work budget |
| Original Python stress case | Real 5,000-step trace: **60.004 fps**, mean 16.666 ms, p95 16.700 ms, matching `( 3141 / 5000 )` counter                                                                                                                           |

### Production renderer timings

Each case uses a real 5,000-step JS trace at 1440×1000 in headless Chromium. Eleven warmup frames are excluded, then 180 native timeline updates are measured. The two segment-tree cases cover recursive segment ranges and Fenwick low-bit ranges separately. String/sequence cases include attached window overlays. The timed update includes confirmation that the requested step and renderer have already committed to the DOM.

| Renderer              | Average fps | Maximum committed update (ms) |
| --------------------- | ----------- | ----------------------------- |
| String + window       | 60.004      | 2.1                           |
| Sequence + window     | 60.002      | 9.5                           |
| Stack                 | 60.002      | 6.1                           |
| Queue                 | 60.002      | 7.0                           |
| Deque                 | 60.002      | 7.6                           |
| Intervals             | 60.004      | 4.7                           |
| Hash buckets          | 60.004      | 6.4                           |
| Set pool              | 60.002      | 2.5                           |
| Binary heap dual view | 60.002      | 4.4                           |
| Trie                  | 60.002      | 2.3                           |
| DSU                   | 60.002      | 4.3                           |
| Segment tree          | 60.000      | 3.3                           |
| Fenwick tree          | 60.004      | 4.3                           |
| Bitmask               | 60.002      | 2.7                           |
| DP dependency matrix  | 60.002      | 3.4                           |
| Scalar monitor        | 60.002      | 3.0                           |

Refresh timestamp differences have 0.1 ms quantization: p95 is 16.7–16.8 ms and maximum 16.8 ms. Those browser refresh samples are distinct from committed update work (maximum 9.5 ms); the report does not claim that every refresh timestamp difference is ≤16.7 ms or that every device will match these local results. JSON evidence is in `artifacts/visualizer-performance.json`, `artifacts/scrubbing.json`, and the Lighthouse reports.

## Scope and practical limits

Detection is heuristic: source hints mask comments/literals and inspect bounded operation/index patterns; they do not prove behavior through arbitrary aliases, dynamic dispatch, or unsupported expressions. Numeric pairs may be intervals or coordinates. Window bounds are inclusive. Heap direction comes from explicit max naming or defaults to min. Segment ranges assume the common root-1 recursive 4N layout or power-of-two 2N leaf layout; Fenwick ranges are one-based. DP arrows are omitted when coordinates cannot be resolved with the supported identifier/integer ± offset grammar. Trie active paths follow captured live node references.

Each sequence/node/grid view respects an 80-element budget; matrices use 80 cells in aggregate and large snapshots show a labelled prefix. Pins beyond the drawn prefix are omitted. Six primary models can be visible at once; specialized models are prioritized and attached windows do not consume a second slot. Raw captured values remain inspectable in the existing variables/heap panels. The source/snapshot execution limits and educational sandbox caveats from Phase 2 are preserved.

Performance measurements are local full-motion Chromium refresh/render measurements, not a universal device guarantee. The performance fixture executes real Workers and drives the native timeline input; it verifies that the final counter matches the requested step and that no page errors occur. Warmup is excluded from measured refresh intervals. It covers all specialized renderers, Fenwick, the sequence/scalar fallback, and attached string/array windows.

Reproduce with `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Start production on port 3001 and run `node scripts/measure-visualizers.mjs`, `node scripts/measure-scrubbing.mjs`, and `node scripts/audit-browser.mjs`. JSON reports/screenshots are written to ignored `artifacts/`. Detector rules and model-specific ambiguity are recorded in [DECISIONS.md](DECISIONS.md).
