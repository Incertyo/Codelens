\# CodeLens agent rules (always loaded; keep under 80 lines)
\## Orientation

\- Read docs/ai/INDEX.md first if it exists, then only the module doc it points to for this task. Never read docs/archive/\*\* or \*\_VERIFICATION.md unless the task names them.

\- Never scan the repo broadly. Find code with search (rg), open files by line range, and do not re-read files already in context.



\## Routing

\- Small fix (3 files or fewer): module doc, code, change, targeted test.

\- Feature or behaviour change: write or update docs/ai/specs/<feature>.md from \_TEMPLATE.md (60 lines max). Stop for my reply only if the spec has open questions. Implement test-first.

\- Bug: reproduce with a failing test first, then fix.

\- Refactor: no behaviour change; existing tests pass unchanged.

\- Investigate: report findings only, no edits.



\## Loop (every implementation task)

1\. Plan in 8 lines or fewer.

2\. Write or adjust the failing test.

3\. Make the smallest change.

4\. Run checks cheapest first: targeted unit test, typecheck, lint, affected e2e spec.

5\. On failure fix and rerun only the failing check. After 3 failed iterations on the same error, stop and report what you tried.

6\. Run full suites only at the end or when asked.

7\. Update the affected module doc if a contract, invariant or gotcha changed.



\## Output discipline

\- Reply with: what changed (file:symbol), checks run and results, anything unverified. Do not restate the task, dump whole files or paste long logs; quote at most 15 lines of a failure.

\- Minimal diffs. Do not reformat untouched code.



\## Hard rules

\- No code comments; documentation lives in markdown only.

\- Never edit library/\*\* reference programs or freshness-manifest inputs unless the task says so; the catalog export hash must not change.

\- Never print, log or commit secrets; never read .env\* values into output.

\- No deploys, pushes or hosted-service calls unless I ask.

\- Never send stdin, output or runtime values to AI providers; never store user code.

\- Estimates and AI output are always labelled; no unmeasured performance claims.



\## Done means

Tests for the change pass, typecheck and lint pass, the module doc is current, and the report lists anything unverified.


<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
