# Maintained algorithm code database

The library contains **309 runnable Python references** covering every current catalog entry, plus **17 featured examples in Python and JavaScript**. That is **343 current implementations**, rather than 343 distinct algorithms. JavaScript coverage is explicitly limited to the featured examples; unsupported language choices are disabled. The catalog is a broad DSA collection, not an exhaustive list of all algorithms ever published.

## Storage and source ownership

`data/codelens.sqlite` is the local database. Node 24's built-in SQLite driver reads it through `src/lib/library-repository.ts`; no external account, credentials, native npm compilation, or paid service is required. Database requests only retrieve maintained code. User code still executes exclusively in the existing browser workers.

The maintained authoring sources are:

- `src/lib/algorithm-catalog.ts`: names, stable IDs, topic hierarchy, descriptions, and featured-example links.
- `library/python/*.py`: authored reference functions, shared helpers, documented assumptions, and `DEMOS` with input expressions and independently specified expected results.
- `src/lib/examples.ts`, `src/lib/additional-examples.ts`, and `src/lib/javascript-examples.ts`: the shorter featured variants.
- `library/schema.sql`: normalized schema and initial migration.

Source files are the reviewable authoring format. The database is generated from them, ignored by version control, and preserved between seeds. Do not edit code directly in the generated SQLite file: the next seed restores the maintained source as a new revision. Editing code in the browser creates a working draft and does not modify the shared library.

## Maintenance

Requires Node **24.15+** (tested on 24.19) and Python **3.10+** (tested on 3.13). Browser Python remains Pyodide; desktop Python is used only for trusted library maintenance and independent checks.

```sh
npm run library:seed
npm test
```

Seeding also runs automatically before `dev`, `build`, `test`, and `test:e2e`. `PYTHON` can select another installed Python executable. `CODELENS_LIBRARY_DB` can select another database path when supplied to both the maintenance command and application process.

To add or fix an algorithm, edit its topic's Python function and demo expectation, then seed and test. The compiler extracts only the needed functions/classes and their dependency closure into a standalone editable script with a demonstration call at the bottom. It checks exact output, unique slugs, complete catalog coverage, and the editor's 30,000-character bound. It evaluates **trusted repository code only** during maintenance, never code received through the website.

Seeding uses a transaction and parameterized statements. Unchanged records produce zero new revisions. A code, fixture, entry-point, or documentation change adds a revision while retaining previous ones. Database fixtures travel with the corresponding immutable implementation version. The application opens the file read-only and exposes no writing or execution endpoint.

## Schema and Phase 3 integration

| Table                               | Purpose                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `schema_migrations`                 | Schema version                                                                     |
| `topics`, `subtopics`, `algorithms` | Catalog hierarchy and featured metadata                                            |
| `implementations`                   | Algorithm/language/variant/revision, source, source file, entry point, assumptions |
| `fixtures`                          | Version-linked stdin and expected demonstration stdout                             |

`source_hash` is SHA-256 of the exact source. `revision_hash` covers source, fixture, documentation, and entry point. Phase 3 can associate correctness results, complexity notes, and cached analysis with `implementation.id` and `source_hash`, so a changed implementation never silently inherits stale analysis. The repository keeps storage details outside editor/worker code.

`GET /api/library` returns metadata and current implementation identities without code bodies. `GET /api/library?id=<stable-id>&language=python&variant=reference` returns a standalone script, assumptions, fixture, and version. `variant=featured` selects a highlighted example; `revision=<positive integer>` retrieves historical source. Invalid selections return 400, missing language/version combinations return 404, and storage failures return a recoverable 503. Other HTTP methods are unsupported.

Local SQLite remains the maintained database and its read-only file is included in Next's production file tracing. Phase 3 exports `src/generated/library.json` with current and historical revisions and a SHA-256 manifest of maintained sources. Vercel and `CODELENS_STATIC_LIBRARY=1` read that build-time snapshot through the same repository API. `npm run library:export` seeds/exports locally; remote prebuild verifies the manifest and refuses stale data, without requiring Python or runtime SQLite. No analysis results or user code are written into this catalog. A future feature needing shared writes must use persistent storage through the repository boundary; an ephemeral deployment file is not durable.

## Educational variants and assumptions

Each reference is a real implementation of its named algorithm or pattern. Small demonstrations are designed to finish within the existing 5,000-step cap. Source docstrings and the workspace's expandable library information describe preconditions.

Some entries deliberately use an educational variant: Timsort has natural runs, minrun extension and run-stack balancing but omits production galloping; external merge sort simulates chunk storage in memory; Boyer–Moore uses bad-character shifts; suffix-tree construction uses quadratic edge-splitting insertion; B-tree operations demonstrate insertion, splitting and search; red-black balancing uses left-leaning insertion; geometric sweep uses an active interval set with exact pair checks; half-plane intersection clips to an explicit bounding square. These distinctions prevent presenting a simpler implementation as a different optimized algorithm.

The fixture suite proves demonstrated behavior, not universal correctness for arbitrary malformed inputs. Additional independent checks cover random inputs, cut enumeration for flow/min-cut, brute-force matching/assignment/knapsack, tree balance invariants, sorting, strings, transforms, geometry, DP optimizations and range queries. Existing tracing caps, numeric display limits, and worker isolation behavior remain in force.
