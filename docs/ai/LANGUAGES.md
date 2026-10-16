# Supported execution languages

`Language` in src/lib/breakdown.ts is exactly python | javascript. The selector offers Auto, Python and JavaScript. CodeRunner and MeasurementRunner refuse other runtime language values; the JavaScript worker has no Java compiler, runtime or prepared-Java-AST path. Public Python harnesses and worker protocol limits are unchanged.

`ShareLanguage` in src/lib/share.ts additionally admits cpp/java only for old-link compatibility. Both compressed formats retain exact source and stdin. The workspace marks unsupported shares independently from the runtime language, disables Run, blocks analysis mounting and automatic cached-analysis loading, and preserves the legacy language when re-sharing. A manual supported-language selection clears the marker without translating the text. New/load actions clear it; Undo New restores it. Editing alone does not grant permission to reinterpret the old source. Nothing executes automatically.

Heuristic/model mappings return supported only for Python/JavaScript. C/C++/Java/TypeScript remain unsupported winners; no supported runner-up is promoted. Automatic ownership, debounce, confidence/margin and model-loading contracts remain unchanged. The unchanged heuristic has finite syntax coverage; docs/DETECTION_EVAL.md records its limitations. Do not silently add transpilers or runtime fallbacks.

Only explicit notes and advice upload source plus bounded function/event/entry metadata. Stdin, stdout and runtime variable values remain local. Unsupported languages fail strict request schemas; mode=simulate returns 410 before provider configuration, shared admission or generation. Provider quotas, readiness cache, kill switch, validation/retry behavior and the existing save/cache paths for supported code are otherwise unchanged. The persistence concern in REFACTOR_FINDINGS.md is not fixed in the removal commit.

Tests: language-scope.test.ts, e2e/language-scope.spec.ts, language-detection.test.ts and opening-detection.spec.ts. Surviving API/share goldens remain byte-for-byte unchanged; the comparison excludes only the removed simulation request/response/provider call. The full 360-record Python/JavaScript trace/model/AST corpus is retained.

No new runtime env variable or dependency. Smoke checks only supported selector options and a real JavaScript trace; check:env keeps its names and validation. The installed ML model remains until a qualifying comparison and explicit removal approval. See docs/DETECTION_EVAL.md for the 40-case local CPU evaluation, not a general relevance/performance claim.
