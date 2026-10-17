# AI-primary Insights

- Supersedes the structured report's AST-first display and complexity section at the owner's request.
- Validated AI supplies the main summary, function explanations and line walkthrough. Do not fill missing AI prose with local heuristics.
- Local AST remains internal grounding and an explicitly labelled fallback when AI is unavailable, invalid or paused before notes arrive.
- While a first AI response is pending, show an AI loading state rather than the local report as the main content.
- Keep actual signatures/line bounds grounded in real source; local structural details remain an explicit disclosure.
- Insights has Overview, Structure and flow, Run evidence and Review. Remove all cost estimates, memory guesses and estimate-status language from this tab.
- Keep the separate Complexity tool intact; this request concerns Insights and does not turn its estimates into facts.
- Fix a reproducible false validation failure: a valid heading with Unicode dashes must not invalidate an otherwise schema/reference-valid response.
- Cosmetic headings cannot spend a validation retry or reject useful notes. Omit unusable headings in the UI; never fabricate an AI approach from AST.
- Keep strict Zod/schema, source/function/step bounds, privacy, budgets, counted retries for actual invalid content, and stale-response cancellation.
- Continue automatic AI review and explicit proposed-code/test actions; retain honest partial/paused/error states.
- No hosted calls, new route, environment variable, dependency, catalog/reference edit or golden regeneration.
- Test real SDK/local provider fixtures and real Pyodide AST/trace composition; production browser tests cover AI-main, loading, genuine AST fallback and no estimates.
