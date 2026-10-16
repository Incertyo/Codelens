# CodeLens

A local-first algorithm workspace: paste code, collect real execution snapshots, and inspect data structures, calls, AST analysis and step-count estimates.

## Setup

Use Node 24.x (tested with 24.19.0) and npm. The production build uses the included, source-verified catalog and needs no Python or SQLite database.

```sh
npm ci
cp .env.example .env.local
npm run build
npm start -- --port 3001
```

Open http://localhost:3001. `npm ci` uses the committed lockfile and its postinstall copies Pyodide, Monaco and the language-detection model into content-addressed local asset folders, recreates runtime manifests, and keeps fonts local. Do not disable install scripts. The editor runs Python, with AST inspection and empirical measurements available without AI credentials. Offline means the local server and its installed assets are available; this is not an offline-installable PWA.

Copy the env template with `cp .env.example .env.local` on macOS/Linux or `Copy-Item .env.example .env.local` in PowerShell. The template contains no credentials; keep private values in ignored `.env.local`. Optional AI setup is below.

The template defaults to `AI_ENABLED=false` and `CODELENS_STATIC_LIBRARY=1` for the local-only setup.

After changing source or adding files under public, stop the production preview, rebuild and restart it. An older server can return 404 for a newly added Python harness such as /measurement.py. The worker rejects missing, empty or HTML harness responses with an asset-specific error before executing Python; reload after restarting. It does not display or execute the error page as code.

For development or catalog maintenance, also install Python 3.10+ (CI uses 3.12), then:

```sh
npm run dev
```

Open http://localhost:3000. Development/tests seed local SQLite; production builds only verify the committed export and never rewrite it. Exporting catalog changes is an explicit maintenance action. For standalone typechecking immediately after installation, run `npx next typegen` before `npm run typecheck`; Next also generates those types during builds.

## Features and boundaries

- Real Python traces in disposable browser workers; stepping, playback, breakpoints, stdin, output, aliases and recursion.
- 309 catalog algorithms, 343 current implementations: 309 maintained Python references plus 17 highlighted examples in both Python and JavaScript. SQLite preserves revisions, exact source hashes, assumptions and expected-output fixtures.
- Source-driven structure detection, theme-aware highlights, responsive graph/tree viewports and reduced-motion loading transitions.
- Offline AST breakdown and conservative static time/auxiliary-space candidates. Unresolved calls, recursion, bounds or allocation yield Unknown; best/average cases are not inferred from a single trace.
- Empirical time estimates from real user-function line events and sampled total/auxiliary memory units without retaining snapshots; editor heatmaps still come from real trace line events.
- Explicit AI requests for optional breakdown notes, potential bugs, optimization proposals with a diff, and suggested tests. Proposed optimizations are not correctness-verified. Every offered test first completes in the real tracer; clicking Run this test runs it again. AI expected outputs always remain labelled unverified.

Python is the only editor and Run language. Library/example controls offer Python only. Legacy JavaScript, C++ and Java shares retain their exact source and stdin with an unsupported-language notice; they do not execute or load analysis. Re-sharing preserves the original language. Use New code for a fresh Python draft. The frozen catalog still contains historical JavaScript implementations, and internal JavaScript tools/goldens remain for catalog verification; they are not selectable editor support. Recognized non-Python drafts cannot Run. Detection is finite: ambiguous text is parsed and executed only as Python, never translated or sent to a JavaScript runtime.

## Empirical measurements

Select a top-level named function, its declared input type and a size profile. The supported signature has exactly one required positional identifier parameter: **int n**, **list of integers**, or **string**. Python recognizes `int` on parameter `n`, `list[int]`, and `str`; unannotated parameters require the user to declare the input generator. Integer parameters must be named `n`. Methods, classes, async/generator functions, defaults, rest/destructuring/keyword-only parameters, duplicate names and executable top-level initialization are refused with a reason.

AST preparation retains definitions, safe literal bindings and Python imports, preserving source lines and omitting top-level demo calls. One worker runs all sizes for an analysis, with fresh execution globals/source bindings and fresh arguments for every size, then is disposed. This resets program bindings, not the interpreter's module cache or JavaScript intrinsics; it is not hostile-code isolation. Definitions depending on omitted initialization may fail. The existing manual UI still requires one resolved parameter; the engine accepts multiple JSON arguments. Profile coverage, pasted-code generator selection and automatic dual charts are the next numbered parts of the replacement Step 1.

| Profile  | Sizes            |
| -------- | ---------------- |
| Standard | 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 |
| Small    | 2, 4, 8, 12, 16  |
| Tiny     | 1, 2, 3, 4, 5    |

Integer n is the size. Lists are descending integers n through 1. Strings repeat ASCII `abc` to the requested length. These deterministic generators do not sample average-case behavior. Time counts only executed line events inside user functions, including called helpers; module/driver events and imported/native internals are excluded. JavaScript counts instrumented line hooks; Python counts interpreter line events. No wall-clock value is fitted or returned as a metric.

Measurement stores no per-step snapshots and has an independent ceiling of 3,000,000 events or 10 seconds per size, with an absolute parent deadline beginning at dispatch. The 5,000-step trace cap continues to apply to ordinary Run, not measurement. Call/return/exception/module guards may consume the event budget without entering the time series. Larger sizes stop after the first budget, partial or error result. Budget-exceeded, partial, failed and zero-valued points are excluded from their respective fits. A parent-terminated size has unavailable counters, never invented counts.

Time, auxiliary space and total space are fitted independently to all seven fixed classes using non-negative affine least squares. Four complete positive points are required. Results include best model, runner-up and normalized RMS error. Fewer than six valid points or a best/runner-up gap below two percentage points is labelled inconclusive; tied models prefer the earlier/slower-growing class and remain inconclusive. Fits are local estimates at tested sizes, not asymptotic proofs. Static candidates retain their stated assumptions.

Space is a **sampled peak object-count model, not bytes**: each reachable data object contributes 1 plus its elements, dictionary/Map entries or own fields, plus initialized variable bindings across live user functions and globals, distinct immutable string values by native length capped at 10,000, and live user call frames. Aliased objects and cycles count once per sample; argument/return aliases do not duplicate the same object or immutable string. Returned data is included at return sampling. Object field names are metadata; dictionary/Map keys are data. Functions, classes, imported modules and interpreter internals are opaque, with their user bindings counted. Generated driver bindings and synthetic JavaScript `this` are excluded. Python code-point and JavaScript UTF-16 string lengths can differ. This educational model does not reconstruct closed-over environments, native allocations or the garbage collector.

Memory is sampled at every user call/return, on the first 16 user-function line events, and every 16 thereafter. Auxiliary peak = total peak minus the entry argument data's units at the first call; parameter bindings remain auxiliary overhead. Partial lower bounds clamp a negative difference to zero. The traversal bound is 20,000 objects, depth 256 and 100,000 visited values per sample. Hitting any bound marks the whole size partial and prevents fitting. Strings' 10,000-unit cap is part of the model. Short-lived allocations between samples can be missed; one native enumeration, proxy trap or allocation can still be expensive and is guarded by the parent deadline, not a total-memory guarantee. Both peak series and the memory definition are shown beneath the current manual time chart; the automatic two-chart layout belongs to Part 4.

The chart overlays seven fixed Big-O reference shapes, each scaled to measured counts by a non-negative least-squares multiplier without an intercept. Thin patterned lines distinguish references; a solid line marks the guide, circles identify real measurements and a dashed line marks the estimated fit. Curves have no glow or blur. The log-scale toggle, focusable curve names, keyboard arrow probe and equivalent visually hidden data table support inspection in both themes. Curves stay within the tested input range and are clipped at 125% of the largest measured count; log display floors values below one step at one while preserving the table values. Before measurement, the chart explicitly labels its curves as guides.

The code estimate and measured fit appear side by side, with neutral wording when they differ. The default view uses short descriptions of steps and extra memory; counting definitions, fit details, exact memory counters and the larger-input comparison are available in disclosures. The scale table compares a class and its neighbours at n = 10, 1,000 and 1,000,000 using BigInt/scientific notation. These are mathematical illustrations without fitted constants, not future trace or waiting-time predictions. “Effectively never finishes” describes impractical operation counts, not a measured deadline. All curves use fixed model ids; no AI or user equation is parsed or evaluated. This comparison runs entirely on the client and needs no new provider or configuration.

The motion layer keeps the existing layout and uses a small local SVG/CSS perspective illustration, GSAP scroll-linked movement, short panel/menu entrances and bounded button feedback. It adds no illustration service, WebGL dependency or page-scroll interception. Touch screens keep native scrolling; system and user reduced-motion preferences leave the illustration static and remove decorative transitions. Technical content remains available without motion.

All Analysis results belong to **implementation id + SHA-256 of exact source**. Editing source, changing language or changing implementation remounts the analysis before asynchronous hashing/inspection completes; pending worker/provider work is cancelled. Results carrying a different identity are discarded. Analysis is session-local and does not write back to the catalog.

## Optional AI and shared rate limiting

Copy `.env.example` to `.env.local` and configure credentials directly there or in Vercel's environment settings. Never use `NEXT_PUBLIC_` for secrets.

| Variable                   | Purpose                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `AI_ENABLED`               | Explicit `true` required; default off. Complete the Production AI controls checklist before public use.                                 |
| `AI_DAILY_LIMIT`           | Positive integer ceiling of provider calls per UTC day/environment, default 100; validation retries count.                              |
| `LLM_PROVIDER`             | `openai`, `openai-compatible`, `anthropic`, or `google` (default openai)                                                                |
| `LLM_API_KEY`              | Server-only provider credential                                                                                                         |
| `LLM_MODEL`                | Explicit structured-output-capable model available in your account; no silent model default                                             |
| `LLM_BASE_URL`             | Optional trusted OpenAI-compatible API base URL; never client input                                                                     |
| `UPSTASH_REDIS_REST_URL`   | Shared Redis REST endpoint supporting atomic EVAL                                                                                       |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only Redis credential                                                                                                            |
| `CODELENS_RATE_NAMESPACE`  | Stable application namespace, default `codelens`; `VERCEL_ENV` is appended automatically; identical across instances of one environment |
| `CODELENS_LIBRARY_DB`      | Optional local SQLite path, default `data/codelens.sqlite`                                                                              |
| `CODELENS_STATIC_LIBRARY`  | Set `1` to use/verify the deployment catalog locally; set 1 in Vercel project settings (the exposed VERCEL system flag also enables it) |
| `PYTHON`                   | Optional local Python executable for seeding                                                                                            |

Only explicit notes and advice actions send source to the configured provider. Notes include bounded function/event descriptors; advice includes AST entry metadata. **Stdin, stdout and runtime variable values are not sent.** Only the server contacts the configured provider. Code and credentials are not logged by the application.

When enabled and configured, all valid `/api/analyze` POST modes share **5 requests/client/minute**, **10 provider calls/environment/minute**, and **100 provider calls/environment/UTC day** by default. Redis Lua EVAL atomically admits clients and reserves each provider attempt, including the validation retry. Client identities are HMAC hashes; source and trace values are not stored in Redis. Disabled or incomplete configuration and missing/unreachable/malformed storage fail closed with 503. Exhausted minute/daily limits return 429 with Retry-After; the daily response says **AI notes are paused for today**. Static breakdowns, real traces and empirical measurements remain available. No process-memory fallback is provided.

The AI SDK pipeline uses strict Zod output validation, actual source-line bounds, entry/step references, **one validation retry** (never on provider quota errors) and **one total 18-second provider deadline** and the existing 3,500-output-token ceiling, with static fallback. SDK schema compatibility does not replace server validation. Requests for the removed simulate mode receive HTTP 410 before provider configuration, shared-store admission or generation.

## Production AI controls

AI is off unless `AI_ENABLED=true`. Readiness checks provider credentials/model, Redis configuration, store connectivity and available client/minute/day quota; it returns a specific non-secret reason. Results are cached in-process for 30 seconds, with concurrent checks coalesced and at most 256 client entries. GET checks are read-only and do not verify Redis write permissions, contact the provider or consume budget. Configuration changes and UTC date changes invalidate the cache. Readiness can be stale: POST admission and every provider attempt still recheck atomically and require write permissions. The UI shows the reason and offers Check AI availability; its static work remains usable.

All keys use `{CODELENS_RATE_NAMESPACE:VERCEL_ENV}`, with `development` when VERCEL_ENV is unset. Never derive namespaces from deployment IDs or URLs, and do not change the application namespace during a UTC day to reset budget. Prefer separate Redis databases and provider credentials for preview and production. The dated daily key resets at 00:00 UTC; reservations are not refunded on errors/timeouts because a provider may already have charged. `AI_DAILY_LIMIT` defaults to 100; each retry spends another call. SDK automatic retries are disabled. This is a call budget, not a dollar budget.

Before enabling AI publicly, set and verify a **hard provider-side spending cap in the provider dashboard**. A project budget alert is insufficient: [OpenAI spend alerts do not stop API requests](https://developers.openai.com/api/docs/guides/terraform/rate-limits-and-spend). If the provider/account only offers alerts, keep public AI off until an enforcing gateway/account limit is in place. Neither dashboard spending caps nor bot controls were configured by this source-only change.

### Deployment checklist

- Keep `AI_ENABLED=false` while configuring server-only credentials, an explicit supported model and `AI_DAILY_LIMIT`; never commit secrets or use NEXT_PUBLIC_ for them. Rotate any credentials shared in chat.
- Configure separate preview/production Redis databases where possible. Leave VERCEL_ENV to Vercel; use a stable application namespace across all instances of each environment. Test real Redis EVAL permissions, readiness and fail-closed behavior before public enablement.
- Configure [Vercel Firewall custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules) for Request Path equals `/api/analyze` AND Method equals POST. Start in Log mode, verify matches, then enable per-IP rate limiting (5/minute), challenge or deny for abusive traffic. Apply protection to preview as well as production; GET readiness should also have an appropriate higher edge rate limit. A client-supplied header is never proof of bot verification. BotID is an alternative requiring browser integration and server verification before admission.
- Verify the provider dashboard hard cap (not an alert), then enable AI only in intended environments. Check daily pause/retry counting, 429 Retry-After, Redis outages, and continued local tracing/static breakdown. Protect previews and record live-service smoke results separately from fixture tests.
- Set CODELENS_STATIC_LIBRARY=1 for build/runtime, include the exported catalog, and use Node 24.x, npm ci and the Next.js preset.
- Run the `CI / Production checks` workflow on PRs/main; mark its `Production checks` job as a required status check on main in GitHub branch protection/rulesets. It installs via the lockfile, generates Next types, runs lint/typecheck/unit tests, and builds production before the full Playwright suite (with SQLite unavailable). It uses no hosted secrets and does not deploy. Optionally require that same GitHub check through [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks); a successful build alone must not bypass checks.

## Catalog maintenance and deployment

```sh
npm run library:seed
npm run library:export
```

Maintained sources live in `library/python/`, with catalog metadata and bilingual featured examples in `src/lib/`. Seeding builds one local SQLite database. Exporting also writes `src/generated/library.json`, including historical revisions and a SHA-256 manifest of maintained source files. See [LIBRARY_DATABASE.md](docs/LIBRARY_DATABASE.md) for schema and maintenance.

Vercel runs the read-only **build-time JSON catalog**, not runtime SQLite. Set `CODELENS_STATIC_LIBRARY=1` for preview and production in Project Settings, including build and runtime; this also works when automatic system-variable exposure is disabled. Include `src/generated/library.json` with the repository/deployment source. Its build verifies the source manifest and fails if stale, so a remote build does not depend on Python or a generated SQLite file. Node 24.x is selected by `engines`, following [Vercel Node runtime documentation](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). Local SQLite reads retain explicit Next file tracing, but no serverless writes are attempted. This is catalog storage, not a hosted writable user-code database.

Set the environment variables above in the target Vercel project. Use build command `npm run build`, install command `npm ci`, and the Next.js framework preset. Run `npm run library:export` locally before uploading changes to maintained library sources. With a valid Vercel login, `vercel` creates a preview; test that URL before `vercel --prod`. This workspace has no Git integration or deployment credentials supplied by the repository.

Security headers include CSP, nosniff, frame restrictions, referrer policy and disabled camera/microphone/geolocation. CSP allows only same-origin network/assets plus local blob workers, data fonts/images and necessary inline styling. `unsafe-inline` scripts support Next's static hydration; `unsafe-eval`/WASM evaluation support Monaco, Pyodide and the JavaScript worker. These are compatibility allowances, not a strict nonce CSP or a hardened hostile-code boundary. The analyze route exports a 25-second platform allowance for its store check and provider deadline. Content-addressed Pyodide/Monaco/language-detection assets have one-year immutable caching; their manifest is revalidated. Changing runtime contents changes their URL.

### Production smoke test

1. Run lint, typecheck, unit tests and `npm run test:e2e` (which builds production first). To exercise the deployed data path locally, set `CODELENS_STATIC_LIBRARY=1` and `CODELENS_LIBRARY_DB` to a nonexistent path before build/start; `/api/library` must still return all 309 algorithms and load a selected implementation/revision.
2. On the preview URL, verify CSP/cache headers and no browser CSP/console errors. Open a share link and confirm the editor fills while timeline controls stay disabled; no execution worker or AI POST starts until requested.
3. Run Python and JavaScript, test an exception/timeout/recovery, and measure a supported entry. Verify a source edit clears the estimate/heatmap and a pending AI response cannot return stale suggestions.
4. With AI_ENABLED=true and provider/shared-store credentials configured, request notes/suggestions, verify tests run locally and expected outputs remain unverified. Verify a sixth request for one client returns 429, provider calls hit the global 10-call/minute ceiling, and the UTC daily budget includes validation retries. Remove/unavailable storage must yield 503 with no provider call.
5. Reopen old C++/Java share links and verify preserved source/input, a clear unsupported-language notice, disabled Run and no AI upload. Explicitly select a supported language to recover.
6. Check mobile keyboard/touch navigation, both themes and reduced motion. Production cloud deployment, live provider and live shared-store checks must be recorded separately from local fixture tests.

## Architecture and adding a language

```text
Editor/library/share → Zustand source → disposable CodeRunner workers
  Python: local Pyodide → sys.settrace → validated Step snapshots
  JavaScript: Acorn AST → instrumentation → guarded worker → Step snapshots
  AST inspect → isolated entry driver → fresh real worker traces → estimated fit
  Real line events → editor heatmap
Explicit AI action → /api/analyze → shared Redis limit → provider → strict validation
  Suggestions → local real tracer checks → optional re-run in visualizer
Local SQLite maintenance → source-verified static catalog → read-only library API
Share hash ↔ compressed source + language + stdin (never execution state or consent)
```

`src/shared/trace.ts` defines the common `Step`: contiguous index, 1-based source line, event, function, invocation stack/locals, globals, reference heap, cumulative output and optional explanation. Numeric display limits and reference alias behavior are documented in [DECISIONS.md](docs/DECISIONS.md).

To add real execution for a language, implement a disposable worker and AST parser, enforce the same code/input/bootstrap/execution/snapshot caps, and validate `TraceResult` before display. Add real fixture programs, language selector/routing, share validation and production browser tests. For Analysis, add AST signature inspection, safe dependency/driver construction and documented deterministic input kinds; refuse unsupported signatures. Keep execution in workers, never a page or server route.

## Safety and verification

Limits: 30,000 source characters, 10,000 stdin characters, at most 5,000 steps (UI 100–5,000), and a 12-second parent execution deadline starting when the execution request is sent after a separate 90-second runtime bootstrap. A single authenticated started transition cannot reset that deadline. Snapshots cap 80 variables, 128 heap objects, 80 collection items, depth 6, 80 frames, 200-character values and 20,000-character output. Python and JavaScript traces have a 16 MiB serialized-size budget, with 128 KiB reserved for a compact final truncation notice and result metadata. Python counts its ASCII-escaped serialization conservatively. This limits retained trace data, not total interpreter/browser memory or peak allocation. API request bodies are bounded to 200,000 bytes. Workers are disposed after runs and analysis operations; named network APIs are closed after trusted asset bootstrap, with JavaScript asynchronous APIs additionally blocked.

Each worker operation uses a random nonce held in trusted JavaScript closures and omitted from Python objects and instrumented user code. Trusted message emission captures postMessage before neutralizing the global method and its prototype entry. These measures raise the bar for accidental and casual abuse; they do not establish hostile-code isolation. The Python builtins-importer bridge bypass remains a known limitation of this educational sandbox: the original builtins importer can still recover the js bridge despite the direct-import restriction. Interpreter introspection, mutable JavaScript intrinsics, native operations and browser memory allocation remain limitations. Native/library operations may time out without a partial trace.

Graph diagrams render at most 300 edges per diagram and show an explicit reduced-detail notice. Heap-inspector contents mount only while expanded. Analysis inspection waits for 600 ms without an edit and cancels superseded workers. Browser storage access uses a guarded adapter with an in-memory fallback; blocked storage loses persistence, while editing, running and playback remain usable. Execution notes are bound to a run epoch that changes on every Run, source/language change, stdin change and step-cap change; stale requests are aborted and late replies are discarded.

Sharing places source and input in a readable URL; anyone with the link can decode them. Fragments over 100,000 characters are rejected before decompression; bounded LZ decoding stops before the expanded JSON exceeds 250,000 UTF-16 code units, then enforces the normal source/input limits. The server does not store shared snippets, analysis results or user execution history. See [HARDENING_VERIFICATION.md](docs/HARDENING_VERIFICATION.md) for regression evidence and remaining limitations.

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Set PLAYWRIGHT_PORT to an unused port if 3001 is occupied; the suite starts its own production server.

Unit tests use real Pyodide and JS instrumentation; Playwright uses production assets and real browser workers. AI tests use the actual SDK with a local compatible HTTP fixture and test credentials. Shared-store tests exercise an HTTP contract fixture; they are not proof of a live hosted Redis deployment. Performance scripts require an otherwise idle production server on port 3001:

```sh
node scripts/measure-scrubbing.mjs
node scripts/measure-visualizers.mjs
node scripts/audit-browser.mjs
```

Current evidence and limitations are in [VERIFICATION.md](docs/VERIFICATION.md) and [PHASE_3_VERIFICATION.md](docs/PHASE_3_VERIFICATION.md). Decisions are in [DECISIONS.md](docs/DECISIONS.md). Historical Phase 1/2/2.5 and intermediate verification documents describe earlier scope, not current availability. No performance number is a guarantee across devices.

## License choice

No project LICENSE has been added; the owner must choose one. Options include [MIT](https://spdx.org/licenses/MIT.html) (permissive), [Apache-2.0](https://spdx.org/licenses/Apache-2.0.html) (permissive with an explicit patent grant), or [GPL-3.0-only](https://spdx.org/licenses/GPL-3.0-only.html) (copyleft). These choices do not replace dependency licenses.

## Gemini free-tier setup

Create a Google AI Studio API key and check the models and quota available to that project in [AI Studio](https://aistudio.google.com/). Keep the key in ignored `.env.local` for local checks and server-only environment settings in production:

```dotenv
AI_ENABLED=true
LLM_PROVIDER=google
LLM_API_KEY=<your AI Studio key>
LLM_MODEL=<your available structured-output model ID>
AI_DAILY_LIMIT=<a positive integer below your free daily quota>
```

No model name is hardcoded or silently selected. Redis limiter credentials are also required. [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) vary by model/project/tier; reserve headroom for validation retries, other apps using the project, and provider reset times that may differ from our UTC budget. The default 100 is a local safety default, not a promise that any free model allows 100 calls. Provider 429 or RESOURCE_EXHAUSTED stops immediately without a retry and shows **AI notes are paused: provider quota reached**; local analysis, breakdowns and traces continue. Google receives a simpler structured-output shape to avoid constrained-decoding state limits; every original bound and source reference is still validated locally.

The notice before any AI upload explains that source goes to the configured provider and free tiers may use it to improve their products. Review [Google's unpaid-service terms](https://ai.google.dev/gemini-api/terms) before sending code. Keep billing disabled for free-tier-only use; before enabling a paid account publicly, the hard spending cap requirement in Production AI controls still applies. A free quota is not a paid spending cap.

## Local language detection and page opening

The language control offers Python only. A local syntax/shebang heuristic recognizes some non-Python drafts and prevents their execution. The existing debounced local detector/model remains available for draft identification; its JavaScript results are mapped to unsupported at the editor boundary. Model assets are served from hashed same-origin URLs; neither code nor detection results are uploaded. TypeScript, C, C++, Java and JavaScript are unsupported in the editor. Detection does not identify every possible language or syntax; Python remains the execution runtime for ambiguous text.

No detection result selects a non-Python runtime or translates source. Library/sample loads use Python. Legacy non-Python shares remain source-only, with their original language preserved when re-shared; New code starts a Python draft.

Every full page load, refresh and new tab renders the opening intro on the server, with an inert background and no app flash. The dot-matrix counter follows hydration, font readiness, Monaco mount and the runtime manifest. It stays visible for at least 1.4 seconds, supports click/Enter/Escape skipping after 600 ms, and releases after at most 10 seconds plus the wipe. Reduced motion uses a brief static fade; a separate inline watchdog handles stalled hydration. The per-run loading screen is unchanged.

Add to the deployment checklist: verify the chosen Gemini quota and privacy notice, provider-quota fallback without retries, detection model/weight cache headers and CSP, manual/share/library ownership, intro refresh/new-tab/skip/reduced-motion/fallback behavior, and the full production Playwright suite. Do not publish changes until these checks pass.

## Local revamp checks

The supported-language contract is in docs/ai/LANGUAGES.md. Run `npm run test:golden:quick` for 25 catalog references spanning all 16 topics, all 17 JavaScript examples, observed detector kinds and local API/share contracts. The full unit command still includes every golden record. `npx tsx scripts/evaluate-language-detection.ts` evaluates only the 40 authored local cases in tests/fixtures/language-detection-corpus.ts; it reads installed model files and makes no hosted calls. Measured results and limitations are in docs/DETECTION_EVAL.md. No new runtime environment variable is required.
