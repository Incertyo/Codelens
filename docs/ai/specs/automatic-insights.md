# Automatic Insights

- Replace Breakdown and Analysis tabs with one Insights tab; keep Visualizer and Complexity.
- Keep the existing visual language, themes, keyboard navigation and mobile layout.
- Show local AST overview, functions, structure, source notes and conservative cost estimates first.
- Keep the main view short; put detailed structure, source notes, proposals and tests in disclosures.
- Automatically request notes and advice only while Insights is active, after local inspection settles.
- Keep the two existing API modes separate; each retains admission, counted retries and deadlines.
- Deduplicate automatic uploads for one source/run epoch; never auto-retry a budget-spending POST.
- Abort and discard stale requests on source, run epoch, stdin/step-cap changes or leaving Insights.
- Retain local AST results when AI is disabled, unavailable, rate-limited or invalid.
- Label every interpretation AI or Static; hot spots use only matching real traces.
- Disclose automatic source upload. Never send stdin, output or runtime values to providers.
- Keep AI-proposed code application and suggested-test execution explicit; never execute tests merely by opening Insights.
- Keep Insights mounted across tab switches but pause work while hidden; reuse its local AST result.
- Preserve sharing, runtime limits, catalog data and existing static/trace goldens.
- Cover the merged tab, automatic notes/advice, offline fallback, epoch races, explicit test execution and mobile/themes using real production Pyodide workers and local AI fixtures.
