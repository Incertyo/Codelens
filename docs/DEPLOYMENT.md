# CodeLens hosted release

Target: GitHub `Incertyo/Codelens`, production branch `main`, Vercel project `codelens`,
production URL https://codelens-incerty.vercel.app. Follow these gates in order;
stop on any failed check. Never upgrade plans or enable billing during this procedure.
Never log credentials, environment file contents, raw provider responses, or tokens.
Report variable names and pass/fail only. Do not commit pulled environment files.

## Release artifacts and local checks

Use Node 24.x. `vercel.json` retains `npm ci` and `npm run build`, and sets
`src/app/api/analyze/route.ts` to `maxDuration: 25`, matching the route export.
The production build verifies the committed static catalog without regenerating it.
Postinstall recreates the ignored same-origin runtime/model assets.

```sh
npm ci
npx next typegen
npm run lint
npm run typecheck
```

The source-publication branch `codex/java-browser-subset` has automatic Git deployments disabled through its exact branch entry in `vercel.json` under `git.deploymentEnabled`. This does not disable other branches or authorize a manual deployment. See [Vercel's Git configuration documentation](https://vercel.com/docs/project-configuration/git-configuration).

Only deployment configuration, this guide, verification scripts and their package
script entries may change during release setup. Keep algorithm/visualizer source,
reference programs, catalog and source-hash manifest unchanged.
Commit and push the reviewed release artifacts to `main`. A Git-integrated push
can deploy automatically: verify AI is disabled in the project environments before
pushing and record any Git-triggered deployment as part of the release.

## Preflight

1. `vercel whoami` must authenticate; use `vercel login` if not. Confirm the
   intended team and `vercel project inspect --non-interactive` from this checkout.
   Confirm project Git linkage to `Incertyo/Codelens`, production branch `main`,
   Node 24.x, function region and the 25-second analyze duration. Stop on mismatch.
2. Verify Upstash account access through its authenticated MCP or CLI. For CLI
   authentication use `upstash login`; keep Developer API credentials private.
3. Confirm `git status --short --branch` is clean on `main`; compare local HEAD
   with a fresh remote `main` lookup, not only the cached tracking ref.
4. Record the active production deployment ID, immutable URL and commit for
   rollback. Record the later AI-off release ID again before enabling AI.

## Free Redis and exact environment variables

Prefer separate production and preview databases when the available free plan
permits them. For this hosted release, the owner approved sharing the existing
Free `Codelens` database in `us-east-1`, with automatic upgrades disabled, because
the account's Free-plan database allowance is already used. Both targets share
the REST credentials and keep separate stable environment namespaces. Stop if
a paid plan is required. Verify REST authentication and an EVAL
write/expiry/read probe using a unique short-lived verification key. Do not
alter or clear existing limiter counters. Never print REST credentials.

The following names come from `.env.example`. `VERCEL_ENV` is supplied by Vercel;
do not replace it with a deployment URL or ID. Environment-specific limiter
prefixes are `{codelens:production}` and `{codelens:preview}`.

| Name                       | Production                                                 | Preview                            |
| -------------------------- | ---------------------------------------------------------- | ---------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | Production database REST endpoint                          | Preview database REST endpoint     |
| `UPSTASH_REDIS_REST_TOKEN` | Production token, sensitive                                | Preview token, sensitive           |
| `CODELENS_RATE_NAMESPACE`  | Stable `codelens`                                          | Stable `codelens`                  |
| `CODELENS_STATIC_LIBRARY`  | `1`                                                        | `1`                                |
| `AI_ENABLED`               | `false` until the enablement gate                          | `false` throughout                 |
| `AI_DAILY_LIMIT`           | Explicit positive conservative call ceiling                | Optional; template default applies |
| `LLM_PROVIDER`             | `google`                                                   | Optional, no provider access       |
| `LLM_MODEL`                | Copy chosen value privately from ignored `.env.local`      | Not required                       |
| `LLM_API_KEY`              | Copy privately from ignored `.env.local`, sensitive        | Must be absent/empty               |
| `LLM_BASE_URL`             | Optional trusted HTTPS endpoint; unset for standard Gemini | Not required                       |

Stop if the local provider key/model is missing. Keep credentials server-only;
never create `NEXT_PUBLIC_` variants. Mark secrets sensitive in Vercel where
supported. Verify all environments stay AI-off before release.

Choose `AI_DAILY_LIMIT` below the selected model/project's **actual** free daily
quota, with headroom for other project consumers and a validation retry. Each
provider attempt consumes one call, including retries and uncertain failures.
Do not infer quota from a model name or enable Google billing. Google quotas
are project-wide and reset at midnight Pacific; CodeLens counters reset at
midnight UTC. To account for two CodeLens UTC windows overlapping one provider
day, leave at least two-window headroom as well as other consumers' allocation.
Check [active Google quotas](https://ai.google.dev/gemini-api/docs/rate-limits)
in AI Studio before public enablement. Retain the hard spending-cap requirement
in `docs/DECISIONS.md` for any paid public provider use.

## Verify the configured Vercel environment

Run against the actual settings retrieved securely from Vercel, not the example
template or a fabricated list. The checker validates presence and formatting,
not connectivity, billing status or provider quota. It never echoes values.
It does not automatically read `.env.local`. An explicit file is isolated from
the shell environment, preventing local credentials from masking hosted gaps.

```sh
npm run check:env -- --env=production --file=.env.production.audit
npm run check:env -- --env=preview --file=.env.preview.audit
```

Use those ignored files only for securely exported project configuration, or
pass the retrieved values in a child process environment without logging them:
`npm run check:env -- --env=production` / `--env=preview`.
Sensitive settings may not be retrievable; do not weaken their protection.
Validate the exact values immediately before sending and verify the hosted
metadata names/targets and runtime readiness separately; disclose this limit
if a full post-write export is unavailable. Production requires provider
configuration even while AI is staged off. Preview rejects a provider key.

## Deploy and verify with AI off

Deploy the verified current `main` commit with production AI disabled, or confirm
the Git-triggered build of that exact commit. Wait for Ready. Record ID, URL,
commit and Node/function settings. Install Chromium locally if needed:

```sh
npx playwright install chromium
npm run smoke -- https://codelens-incerty.vercel.app
```

Smoke checks `/` and `/design` HTTP 200 plus referenced Next static assets;
the runtime manifest and hashed immutable Pyodide/Monaco/detection model URLs;
the static catalog metadata (309 algorithms / 343 current implementations);
AI-disabled readiness; and real headless hydration/Monaco and design-page load.
The browser must not send any automatic analyze POST. Failure output is limited
to the check name; do not dump response bodies or browser logs. AI-off smoke
sends no source to a provider. Stop on any failure.

Protected deployments require authenticated access; do not disable deployment
protection to make a check pass. Use the public production alias for these
smoke commands. Inspect protected previews via supported authenticated tooling.

## Firewall gate

In the confirmed project's Firewall settings, create a custom rule matching
request method POST and exact path `/api/analyze`, action **Log** only. Protect
GET readiness with a separate log rule if supported. Review CLI help or current
dashboard options rather than guessing API payloads. If unavailable through
tools, record that no rule was created and provide dashboard instructions.
Stop for a paid-plan prompt. Do not enforce deny/challenge/rate-limit during
this release; the owner reviews traffic and enables enforcement later.

## Enable Production AI once

1. After every prior gate passes, change only Production `AI_ENABLED` to `true`
   and redeploy. Preview stays disabled and has no provider key. Wait for Ready.
2. GET `/api/analyze` must report `configured: true` with null code/reason.
   Readiness checks quota without reserving provider calls and is cached for 30
   seconds. GET is read-only and does not verify write permissions; POST still
   requires atomic admission/reservation. Readiness cannot guarantee against a
   subsequent outage or concurrent consumption.
3. Snapshot relevant counters in both Redis namespaces without changing them,
   then run exactly once:

   ```sh
   npm run smoke -- https://codelens-incerty.vercel.app --with-ai
   ```

   This performs one harmless Python notes POST; the application's single
   validation retry may reserve a second call. No smoke retry is issued.
   A 429 is acceptable **only** for `provider_quota`, reported as “provider
   quota reached; local analysis remains available”. Client/minute/daily limit,
   store error, malformed output and generic provider failures fail the gate.

4. Verify production daily/global counters increased only under the production
   namespace, compare preview namespace counters before/after, and verify preview readiness
   remains AI-disabled. Do not intentionally exhaust any quota.

## Kill switch and rollback

Set Production `AI_ENABLED=false` and redeploy to Ready to disable AI for new
requests on the active release. This is not retroactive: requests already in
flight or old immutable deployment URLs may still run. Keep deployment
protection enabled. Readiness should report `ai_disabled`; run AI-off smoke.
Static analysis and traces continue working.

For an urgent rollback use `vercel rollback <recorded-ai-off-deployment-id>` on
the confirmed project/team. Restore the recorded AI-off deployment rather than
deleting resources or assuming project environment edits alter an old build.
Vercel rollback pauses automatic production domain assignment until a later
explicit promotion; verify the alias and readiness after rollback. A rollback
does not revoke credentials or cancel in-flight calls.

## Final report and owner actions

Report production URL/active ID and rollback ID, every configured variable
name by environment, hosted vs local verification evidence, quota-pause if
observed, firewall rule status/location, and any unverified facts. Never include
values or secret-bearing artifacts. Owner actions: configure required GitHub
checks/branch protection on `main`; optionally use Vercel Deployment Checks;
review firewall logs before enforcing a rate limit; verify Google AI Studio /
Cloud billing remains disabled; rotate any credential previously exposed in
chat, clients or public files. Do not change repository settings automatically.

## V2 Step 1 local verification

The Big-O overlay, growth ladder, static/measured comparison and scale table are
client-only. There are no new routes or environment variables; `.env.example`,
`check:env` and `smoke` keep their existing contract. No dashboard action is needed
for this step. Keep AI disabled for local verification, use the static catalog
with an intentionally nonexistent SQLite path, and run lint, typecheck, unit
tests, production build and the complexity/Phase 3 production Playwright tests.
The tests measure actual Python/JavaScript workers, including keyboard log-axis
control, both themes, reduced motion and mobile layout. Preserve the catalog
manifest/export hash. This source pass does not authorize deployment or hosted
smoke calls. Full-suite gates remain required after V2 Steps 3 and 5.

## Replacement V2 Step 1, Part 1

The snapshot-free measurement mode is entirely local. It reuses one disposable
worker per analysis, gives each size fresh program bindings/arguments and an
authenticated 10-second absolute deadline, and returns line-event and sampled
memory counters. Ship public/measurement.py with the other local Python harness
files; smoke now checks all five trusted harness assets over HTTP, including that
new static asset. No new dynamic route or environment variable is introduced, so
.env.example and check:env keep their existing contract. Do not add a server-side
execution service or provider configuration for this feature.

Stop and restart a local production preview after rebuilding source or adding
public assets. A running older preview returned 404 for /measurement.py even
though the new file was present on disk. The worker fetches all four Python
harnesses without caching and rejects unsuccessful, empty or HTML responses
before Pyodide evaluates them. The error names the asset and requests a rebuild,
restart and reload. Keep the smoke asset checks in the local verification flow;
this loader check does not repair a missing distribution file automatically.

## Supported execution languages

The Insights report uses an optional `format: "structured"` discriminator on the existing notes/advice requests. It selects explanatory prompts without complexity estimates; omitted format preserves legacy prompt contracts. Cosmetic headings are presentation concerns, while schemas/source references remain strictly validated. Responses keep the existing schemas and budget/retry behavior. No new environment variable, route, provider or hosted resource is required. Catalog notes from older formats are normalized for display without rewriting frozen data. Insights is AI-primary and shows labelled local AST fallback if AI is unavailable or invalid. Insights has no cost-estimate section; the separate Complexity tool is unchanged.

The editor, library/example controls and Run use Python only. JavaScript/C/C++/Java/TypeScript detection reports unsupported at the editor boundary; old non-Python shares preserve source/input and their share language without execution or analysis loading. The current catalog and runtime support Python only; legacy non-Python share source is retained for display. AI simulation is removed and its old API mode returns 410 without a provider or limiter call. Opening Insights automatically requests notes and advice when AI is available, sending only source and bounded static/event descriptors. Stdin, output and runtime values remain local. Validated AI notes render as the main explanation; local AST is the fallback when no valid AI notes are available. Applying code and checking suggested tests require explicit actions. Provider adapters, quotas, kill switch, routes and environment settings are unchanged. Local smoke asserts the sole Python option and runs the Python example; its optional explicit notes probe also uses Python. check:env keeps the same names/validation; no new environment variable or route is introduced. Do not deploy as part of this local revamp.

Run the real-engine known-answer tests, production worker/nonce/deadline tests and
the retained Insights/hardening stories with AI disabled or local HTTP fixtures. The current manual
Measure action uses the new engine and shows both memory series numerically;
catalog profiles, automatic measurement and the dual-chart UI await their
numbered parts. This source pass does not deploy or contact hosted resources.

### Shared worker helper

The existing build/install flow now generates public/worker-core.js from src/shared/limits.ts and src/shared/worker-protocol.ts using scripts/generate-worker-core.mjs. Run the existing build or copy-runtime workflow when preparing local assets; do not hand-edit the generated helper. The Python worker remains a classic worker and hashed runtime asset paths, CSP and cache rules retain their roles. Local smoke includes the helper URL. No new environment variable or hosted resource is required. Phase 3 production asset delivery has not been verified in this pass, and no deployment was performed.
