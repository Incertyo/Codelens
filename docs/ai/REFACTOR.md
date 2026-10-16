# Revamp module notes

Resume from docs/REFACTOR_STATUS.md. Phase 0 is complete and must not be repeated. Keep its baseline and trace/contract goldens immutable; the current branch is local refactor/revamp. Never push, deploy, contact hosted services, print secrets or add code comments.

Owner's lean tiers supersede older verification rules:

- T0 per commit: incremental tsc; cached eslint on changed code files; vitest related on changed files. Keep full catalog goldens out of T0 and run them at T2. Long commands write ignored logs; inspect failures only.
- T1 per cluster: npm run test:golden:quick plus affected browser specs. The quick selector chooses 25 Python references covering all 16 topics and all observed detector kinds together with the 17 explicit JS examples; it also runs API/share contracts. It never rewrites fixtures.
- T2 per phase end: full unit suite including all goldens. No full browser suite.
- T3 only after owner says run final gate in Phase 4.

Owner correction: browser specs are meaningful only against production. For each T1 sub-step, build once with npm run build, then invoke npx playwright test <affected specs> --workers=1 directly, reusing that build. Never use a dev server or npm run test:e2e's rebuilding pretest hook. Full production browser, asset/cache/bundle parity remains for T3. The Next-generated orientation block in AGENTS.md remains committed; keep the document under 80 lines without changing owner rules.

One Phase 1 frozen-input exception is necessary: src/lib/javascript-examples.ts had an obsolete cpp/java guard that cannot typecheck with the narrowed Language type. Remove that guard without changing sample text, run library:export deliberately and compare serialized index and implementation sections with the pre-change export. There must be zero new revisions and only that file's manifest digest changes. Update only the frozen fixture's corresponding input digest/export hash, never the trace/contract golden records. Record old/new digests and the data-only digest in docs/REFACTOR_PHASE1.md.

Phase 1 is explicitly authorized behavior removal, separate from behavior-preserving refactors. No suspected bug is fixed in it. Finish Phase 1 with a report of at most 25 lines, continue directly into the report-only lean Phase 2A audit, then stop for approval. The later T3 gate remains unauthorized.

Phase 2A report is docs/REFACTOR_AUDIT.md. Offline knip/depcheck/jscpd attempts returned ENOTCACHED; do not treat the limited TypeScript/PostCSS fallback scans as equivalent tool reports or download tools without authorization. No coverage or per-dependency bundle analysis belongs to this lean audit. Phase 2B requires owner approval of specific clusters; static cache/save/identity findings need separate test-first behavior decisions, not refactor fixes.

The owner continued after the audit, authorizing its first cleanup batch: unused wrappers/alias, Lenis and the equivalent AST predicate. Follow docs/REFACTOR_PHASE2B.md; defer broad export narrowing, CSS and architecture moves. Do not restore removed helper exports as a compatibility measure without a real caller. CodeRunner, active renderer/chart APIs and all feature behavior remain supported. Stop after this batch before Phase 3A.

Manifest-only Vitest related selection expands to the entire suite in this repository. For future package/lock-only edits, use existing maintenance-script tests as the targeted unit scope instead; ordinary code edits still use related tests excluding full golden files until T2. No dependency or freshness input is implicitly authorized by a manifest edit.

Phase 2B's approved batch is complete: CodeRunner remains after removing its unused PythonRunner alias, the unused renderer/chart wrappers are gone, Lenis is no longer declared/installed, and the instrumenter uses ast.isNode. Existing tests/goldens/frozen inputs are unchanged and final T2 passes. Resume next at Phase 3A only after owner continue; optional export narrowing, CSS and findings L1–L8 are not part of that checkpoint.

The owner now authorizes a Python-only editor/Run change first, then 3A/3B only, with a mandatory stop for any additional behavior-changing validator merge. Preflight found opposing JS/Python measurement validation policies using real production workers; see docs/REFACTOR_PHASE3.md. Keep language removal separate from behavior-preserving limits/protocol/validation/pipeline commits. No existing provider fixture test may change without an explanation and stop; frozen catalog and internal golden coverage remain untouched.

Python-only editor checkpoint: docs/PYTHON_EDITOR_CHANGE.md and specs/python-only-editor.md. The boundary is implemented and targeted real-browser gates pass; remaining JavaScript-oriented browser-story migration is pending before 3A/3B. Do not mistake internal Language/runner support for selectable editor support, remove frozen catalog data, regenerate goldens or begin 3C/3D/3E. Resume the pending work at the recorded commit boundary.
