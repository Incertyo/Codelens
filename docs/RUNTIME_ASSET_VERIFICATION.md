# Local Python harness loading repair

The existing local production preview on port 3001 served /measurement.py as HTTP 404 with text/html. The other three Python harnesses returned HTTP 200 with application/octet-stream. The source file existed on disk. Its unchecked response was passed to Pyodide, which tried to compile the Next error page and reported an HTML SyntaxError. Rebuilding and restarting the local preview restored HTTP 200 for all four harnesses.

The worker now checks each trusted Python harness response before initializing or evaluating Python: unsuccessful status, HTML MIME type, empty body or an HTML-looking prefix fails with a fixed asset-specific message. Whitespace/BOM is removed for the prefix check. Requests use cache: no-store; Next's normal application/octet-stream response is accepted. Error messages include no response body. This does not repair missing assets automatically or strengthen the execution sandbox's isolation guarantees.

## Regression evidence

Before changing the loader, the new production browser regression for a missing measurement.py failed: the actual worker emitted the same Pyodide traceback and invalid em-dash SyntaxError as the report. The local HTTP fixture returned a 404 HTML page; no successful execution result was manufactured. Evidence is retained locally under artifacts/runtime-assets-before.

The new tests use actual production browser workers for each missing harness path and a 200 HTML fallback under application/octet-stream with leading BOM/whitespace. The UI recovery test removes the fallback fixture and retries Run through real Pyodide, checking the resulting stdout. Retained measurement stories check all nine authored known algorithms in both languages, fresh bindings, nonces, deadlines and cancellation. Complexity and workspace stories retain real Python/JavaScript execution, themes/mobile, playback, errors and offline restrictions.

## Checks

- Lint and strict typecheck passed.
- All 641 unit tests passed in 19 files, including real Python and JavaScript execution and local HTTP provider/store fixtures. Library seeding created zero revisions.
- Production build passed with AI disabled, static catalog enabled and no runtime SQLite requirement.
- Local AI-off smoke passed against the rebuilt port 3001 preview, including every trusted harness, runtime assets, catalog, readiness, Monaco and design page.
- check:env passed with a synthetic preview configuration, without making requests. The unfilled .env.example was also rejected for missing Redis URL/token as expected; it is a template, not a configured hosted preview. No private environment file was read or copied.
- All 23 freshness-manifest inputs and the catalog export are unchanged. Export SHA-256: 054cf4d55ba35611b4eb2b6a917d32ee833908a5dbfa94d14f846e94149d1eac.
- Comment audits found zero additions across changed/new JS/TS, Python and CSS. git diff --check passed.

- Final production Playwright recheck: all 10 runtime-asset/workspace stories passed together in artifacts/runtime-assets-final. This covers every new regression, real Pyodide recovery, all seven index examples, runtime/stdin/timeout recovery, playback/share, theme/mobile/menu/design accessibility and offline restrictions.
- The preceding broader production run passed all four complexity and seven measurement stories, including all nine known algorithms in each language. That run finished 20/21: the existing accessibility story scanned the workspace while the intro opacity transition was still active. After waiting for initial workspace readiness, a focused recheck reached /design and caught its newly mounted intro fading out. The final test waits for intro removal on both pages and full workspace opacity, preserving every prior accessibility assertion and adding three readiness assertions. No product CSS or axe rules changed. Both intermediate failures remain in local artifacts; no single final 21-story pass or full-suite pass is implied.
- Final lint/typecheck and formatting checks passed; targeted ESLint also passed after the last readiness assertion. The production worker's final formatting change is whitespace only; the actual final worker file is served and exercised by the final production browser tests.
- Gitleaks 8.30.1 passed across all 191 Git-visible publishable files with zero findings. The redacted local report is artifacts/runtime-assets-gitleaks.json. Ignored private environment files, vendor/runtime copies and builds are excluded; this is not a whole-working-directory secret-scan claim.

## Decisions and limits

The four decisions are enumerated under Local Python harness loading repair in DECISIONS.md. README and DEPLOYMENT now explain restarting a production preview after adding public assets. No new environment variable or route was added, so .env.example, check:env and smoke retain their contracts; smoke already verifies all four harnesses and the worker over HTTP. The local preview runs with AI disabled and remains bound to 127.0.0.1:3001.

No hosted service was contacted, deployed or pushed. The full production Playwright suite, other browser engines, manual assistive technology and hosted behavior are not verified by this repair. Existing educational sandbox limitations remain, including the Python builtins-importer bridge bypass. Replacement Step 1 Part 2 and later feature steps remain unstarted pending continue.
