# Structured Insights

- Keep the merged tab, existing design tokens, automatic AI and offline Python AST fallback.
- Use the same five sections for every source: Overview, Structure and flow, Complexity, Run evidence and Review.
- Put algorithm/approach, program layout, primary structure and concepts in named fields with per-field provenance.
- Reject code/regex/language-name pattern labels in live generation; normalize old cached labels to factual AST control-flow descriptions without inventing an algorithm identity.
- Keep AST signatures, ranges, returns and control-flow nodes authoritative; AI can explain those actual lines only.
- Show complexity in one table with source and scope. Unknown is honest; AI estimates never become static or measured facts.
- Flag a simple AST-statement list(input) assignment as a possible copy; mark conflicting constant-space AI estimates for review, without asserting an allocation when names may be shadowed.
- Do not modify the Python analyzer, reference code, catalog, manifest inputs or golden outputs.
- Show five real-trace hot spots initially; retain all captured counts in a disclosure and state truncation/single-run limitations.
- Merge/deduplicate AI findings, drop non-findings such as bug:none detected, and omit generic unreferenced style advice. Use possible-bug wording, never correctness guarantees.
- Keep proposed diffs, Apply, undo, suggested tests and explicit real-worker checks intact.
- Show notes/review availability separately; a failed review must not be silently reported as completed.
- Prompts ask for plain-English headings, source-specific evidence, actual implementation memory costs and educational-algorithm tradeoffs.
- New Insights requests opt into format=structured; omitted format preserves the legacy prompt contract and frozen provider-request goldens.
- Keep schemas, routes, provider pipeline, budgets, privacy and cancellation contracts; no new environment variable or dependency.
- Test real Pyodide outputs for the actual Bubble Sort and Dutch National Flag samples, local provider fixtures, and production browser layout/fallback/themes/mobile.
- Known prior cross-tab keyboard focus failure remains separate; do not weaken its assertion or claim it fixed.
