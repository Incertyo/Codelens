# Revamp module notes

Resume from docs/REFACTOR_STATUS.md. Phase 0 is complete and must not be repeated. Keep its baseline and trace/contract goldens immutable; the current branch is local refactor/revamp. Never push, deploy, contact hosted services, print secrets or add code comments.

Owner's lean tiers supersede older verification rules:

- T0 per commit: incremental tsc; cached eslint on changed code files; vitest related on changed files. Keep full catalog goldens out of T0 and run them at T2. Long commands write ignored logs; inspect failures only.
- T1 per cluster: npm run test:golden:quick plus affected browser specs. The quick selector chooses 25 Python references covering all 16 topics and all observed detector kinds together with the 17 explicit JS examples; it also runs API/share contracts. It never rewrites fixtures.
- T2 per phase end: full unit suite including all goldens. No production build or full browser suite.
- T3 only after owner says run final gate in Phase 4.

Targeted browser checks may use a local development server and an ignored config under artifacts/refactor/phase1; this avoids a prohibited production build. Production asset/cache/bundle parity remains for T3. The dev server appends Next's orientation block to AGENTS.md; retain it and keep the document under 80 lines without changing owner rules.

One Phase 1 frozen-input exception is necessary: src/lib/javascript-examples.ts had an obsolete cpp/java guard that cannot typecheck with the narrowed Language type. Remove that guard without changing sample text, run library:export deliberately and compare serialized index and implementation sections with the pre-change export. There must be zero new revisions and only that file's manifest digest changes. Update only the frozen fixture's corresponding input digest/export hash, never the trace/contract golden records. Record old/new digests and the data-only digest in docs/REFACTOR_PHASE1.md.

Phase 1 is explicitly authorized behavior removal, separate from behavior-preserving refactors. No suspected bug is fixed in it. Finish Phase 1 with a report of at most 25 lines, continue directly into the report-only lean Phase 2A audit, then stop for approval. The later T3 gate remains unauthorized.
