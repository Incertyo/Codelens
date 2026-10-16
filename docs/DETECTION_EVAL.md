# Local language detection evaluation

Forty repository-authored cases, eight per class: Python catalog references, JavaScript examples and authored TypeScript/C++/Java snippets. Source definitions: tests/fixtures/language-detection-corpus.ts. This is a small descriptive corpus, not a held-out benchmark or a one-percentage-point confidence interval.

Runtime: real installed ModelOperations 1.0.23 CPU model in Node with file-only loaders, max 30,000 characters, min 32, and the browser’s 0.65 confidence / 0.15 margin policy. Global fetch is blocked during inference. The same model/weights are used by the browser worker; Node timing and browser performance are not compared. No hosted service was contacted.

Scoring counts ambiguous as incorrect. Exact language and supported/unsupported routing are reported separately; unsupported routing can be correct despite a wrong unsupported label. The removal criterion is interpreted literally: an absolute difference at most one percentage point in every class. No heuristic was tuned on these outcomes.

| Label | Cases | Heuristic exact % | Model exact % | Heuristic routing % | Model routing % |
| --- | ---: | ---: | ---: | ---: | ---: |
| python | 8 | 100 | 100 | 100 | 100 |
| javascript | 8 | 100 | 0 | 100 | 0 |
| ts | 8 | 50 | 0 | 50 | 0 |
| cpp | 8 | 50 | 0 | 50 | 0 |
| java | 8 | 50 | 0 | 50 | 0 |

Decision: criterion not met; keep the model and its assets. The guarded model abstains on all non-Python cases in this short corpus; this does not establish that it is useless on longer ambiguous drafts. Heuristic TS false positives and unsupported-language abstentions are residual limitations, logged for review rather than fixed in this removal phase.

Measured model/weight asset footprint: 958550 bytes across the two public files. Installed direct package directory at baseline: 1811325 logical bytes. Neither number is measured route-bundle savings, and nothing was removed.

| Case | Truth | Heuristic | Guarded model | Raw top label | Raw score |
| --- | --- | --- | --- | --- | ---: |
| arrays-sequences/intervals/insert-interval:python:reference:v2 | python | python | python | py | 0.9612 |
| bits-mathematics/combinatorics-algebra/matrix-exponentiation:python:reference:v2 | python | python | python | py | 0.7179 |
| dynamic-programming/grid-sequence-dp/longest-palindromic-subsequence:python:reference:v2 | python | python | python | py | 0.9955 |
| graphs/connectivity-spanning-trees/kruskal-s-minimum-spanning-tree:python:reference:v2 | python | python | python | py | 1.0000 |
| greedy-algorithms/scheduling-selection/jump-game:python:reference:v2 | python | python | python | py | 0.7719 |
| linked-lists/pointer-rewiring/reverse-a-linked-list-segment:python:reference:v2 | python | python | python | py | 0.9993 |
| sorting/distribution-sorting/pigeonhole-sort:python:reference:v2 | python | python | python | py | 0.7413 |
| strings/suffix-structures/suffix-array-construction:python:reference:v2 | python | python | python | py | 0.9346 |
| example:01 | javascript | javascript | ambiguous | groovy | 0.1646 |
| example:02 | javascript | javascript | ambiguous | ts | 0.2094 |
| example:03 | javascript | javascript | ambiguous | r | 0.0711 |
| example:04 | javascript | javascript | ambiguous | js | 0.3142 |
| example:05 | javascript | javascript | ambiguous | js | 0.2528 |
| example:06 | javascript | javascript | ambiguous | js | 0.1848 |
| example:07 | javascript | javascript | ambiguous | js | 0.1202 |
| example:08 | javascript | javascript | ambiguous | ml | 0.1106 |
| ts:1 | ts | ts | ambiguous | ts | 0.0661 |
| ts:2 | ts | ts | ambiguous | csv | 0.0511 |
| ts:3 | ts | ts | ambiguous | js | 0.0589 |
| ts:4 | ts | python | ambiguous | ts | 0.0615 |
| ts:5 | ts | javascript | ambiguous | ts | 0.0668 |
| ts:6 | ts | javascript | ambiguous | ini | 0.0595 |
| ts:7 | ts | ts | ambiguous | ini | 0.0634 |
| ts:8 | ts | ambiguous | ambiguous | yaml | 0.0694 |
| cpp:1 | cpp | cpp | ambiguous | cpp | 0.0572 |
| cpp:2 | cpp | cpp | ambiguous | cpp | 0.0890 |
| cpp:3 | cpp | ambiguous | ambiguous | csv | 0.0730 |
| cpp:4 | cpp | ambiguous | ambiguous | rs | 0.0552 |
| cpp:5 | cpp | ambiguous | ambiguous | ts | 0.0475 |
| cpp:6 | cpp | cpp | ambiguous | ini | 0.0654 |
| cpp:7 | cpp | cpp | ambiguous | cpp | 0.0891 |
| cpp:8 | cpp | python | ambiguous | sql | 0.0515 |
| java:1 | java | java | ambiguous | java | 0.1205 |
| java:2 | java | ambiguous | ambiguous | sql | 0.0705 |
| java:3 | java | ambiguous | ambiguous | java | 0.0621 |
| java:4 | java | java | ambiguous | java | 0.0762 |
| java:5 | java | ambiguous | ambiguous | ini | 0.0660 |
| java:6 | java | java | ambiguous | java | 0.0545 |
| java:7 | java | ambiguous | ambiguous | ini | 0.0548 |
| java:8 | java | java | ambiguous | groovy | 0.1467 |

Reproduce locally with npx tsx scripts/evaluate-language-detection.ts. Detailed numeric results stay in ignored artifacts/refactor/phase1/detection-eval.json.
