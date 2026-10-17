# Supported execution languages

The editor, Monaco, examples, library and Run support Python only. Language is narrowed to python; JavaScript execution, instrumenter, model assets and dependencies have been removed. Source runs locally in classic Pyodide workers with the shared limits and production asset pipeline.

Legacy JavaScript/C++/Java shares retain exact source, stdin and their original share language. They display an unsupported notice, disable Run and block inspection and stored-note loading. Re-sharing preserves that language. New/load clears the marker; Undo New restores it. Editing alone does not reinterpret legacy source. Nothing executes automatically.

Recognized JavaScript, TypeScript, C/C++, Java and other non-Python drafts are blocked synchronously at the editor/Run boundary. Ambiguous text is parsed and executed only as Python and may produce a syntax error. Detection is finite; there is no universal compiler, translation or alternative runtime.

Opening Insights automatically sends source plus bounded function/event/entry descriptors for notes and advice when AI is available. Stdin, stdout and runtime variable values remain local. API schemas accept Python only; mode=simulate returns 410 before provider configuration, admission or generation. Local AST output remains usable when AI is off or unavailable. Applying AI code and checking suggested tests are explicit. See INSIGHTS.md for cancellation, epoch and privacy contracts.

The catalog contains 309 algorithms and 326 Python implementations. Frozen manifest inputs, catalog export and normalized golden expectations are unchanged by the Insights merge. Python-only, language-scope, share and real Pyodide browser tests cover these boundaries. No new environment variable, provider, dependency or route.
