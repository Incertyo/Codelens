# Browser Java subset verification

Source pass on 2026-10-16. The owner selected Java first and browser-only execution with a documented subset. This is not a universal compiler or a JVM. No deployment, push, hosted provider call, hosted store operation or dashboard change was performed.

## Implemented boundary

The tokenizer/type checker/compiler in src/lib/java emits an original-line syntax tree for the production JavaScript instrumenter. Real execution, stdin, output, heap/variable snapshots, playback, applicable visualizations, recursion, Breakdown, heatmaps and snapshot-free measurement use the existing worker boundary. Optional source-only notes/advice reuse strict validation and explicit AI controls; Java analysis cache and persistence paths are disabled. See [JAVA_SUBSET.md](JAVA_SUBSET.md) for exact source restrictions, runtime bounds and unsupported features, and [DECISIONS.md](DECISIONS.md#java-first-browser-subset) for every implementation decision.

Draft complexity guides now use their actual AST candidates, preserving Unknown. Catalog reference metadata is reserved for catalog identities; the static-versus-measured comparison always uses the actual source candidate. The light-theme line-number token was darkened after a real axe failure. No accessibility rule was disabled.

## Completed checks

| Check | Evidence |
| --- | --- |
| Lint | npm run lint passed with zero warnings. |
| Typecheck | npm run typecheck and the production build's TypeScript compilation passed. |
| Unit suite | npm test: 21 files, 698 tests passed. |
| Java compiler/runtime | 37 cases execute the actual compiler/instrumenter/tracer, validate refusal and error behavior, exercise typed inspection/test drivers and real measurement. |
| Java differential fixtures | Five fixed accepted programs matched local javac/JVM stdout. The installed JDK was used only for trusted test fixtures; these checks did not skip on this machine. |
| Provider interop | The actual SDK used a local OpenAI-compatible HTTP fixture for original Java notes; Java cache misses and persistence rejection were checked. No hosted model or quota was used. |
| Production build | npm run build passed and verified the catalog source manifest without regenerating it. |
| Java browser stories | Five production Chromium stories passed for real worker output, playback, source-line errors, stdin, bounded loops, typed measurement, no automatic POST uploads, mobile, both themes and axe checks. |
| Full production browser suite | npx playwright test --workers=2: all 92 tests passed in 8.0 minutes against the final production build, AI disabled and the static catalog enabled. The earlier serial run passed 91/92 and exposed the transient visual-mapper fade contrast failure; that animation was removed, its unchanged specialized-visualizer story passed independently, and the entire suite then passed. |
| Broader focused browser checks | Real JavaScript/Pyodide chart measurements, static disagreement, keyboard cancellation and the retained quadratic/no-fit story passed after aligning selectors with the existing interface. |
| Local smoke | npm run smoke against the loopback preview passed HTTP/static assets, Python harnesses, catalog, AI-disabled readiness, hydration, Java worker output with no automatic provider POST, and the design page. |
| Environment contract | npm run check:env passed against an isolated, synthetic preview configuration. No new variable or route was added; .env.example and check:env retain their configuration contract. Actual hosted configuration was not inspected. |
| Catalog/freshness preservation | All manifest input fingerprints and the catalog export SHA-256 match the beginning of this Java pass. Pre-existing workspace changes were preserved as found; no catalog export was regenerated. |
| Added comments | AST/scanner review of 30 source/test files found zero added code comments. Fixture source text is treated as data. |
| Secrets scan | Gitleaks 8.30.0, official Windows archive verified against its release checksum: zero findings in publishable source. Installed/generated artifacts and gitignored private environment files were excluded; ignored status was checked before excluding those files. No secret value was printed or changed. |
| Manual preview | Ran the Java array-sum example through the production worker, observed output 20, and inspected the original-line sum return with all five array cells visible. Screenshot: artifacts/java-subset/java-trace.jpg. |

The final loopback preview is http://127.0.0.1:3030/. Port 3001 was unavailable during this pass; no other application's listener was terminated to reclaim it. No hosted service is required for the Java example.

## Existing tests updated

- tests/e2e/phase-three.spec.ts: keep simulation-integrity assertions on C++, since Java now uses real subset execution. Follow the existing Analysis-to-Complexity navigation for the retained real-chart assertion, then return for the existing budget/no-fit checks. Add a real measurement completion assertion; remove no meaningful assertions.
- tests/e2e/complexity.spec.ts: use the current minimal headings and Measure code label, open native disclosures before inspecting counters/scale tables, and count actual measured-point circles separately from pointer markers. Keep the numerical row comparisons, reference patterns, fits, equivalent table, static agreement/disagreement, keyboard, themes, mobile, cancellation and no-upload checks.
- tests/analyze.test.ts: add the local Java provider fixture and Java persistence-rejection checks alongside the existing provider/admission tests.
- New tests/java.test.ts and tests/e2e/java.spec.ts: cover the actual compiler and production worker rather than fabricated Step traces.

## Not verified or claimed

No arbitrary-Java or other-language support, full Java conformance, hostile-code isolation, JVM memory accounting, native Java performance, asymptotic proof, real-device performance, Firefox/Safari compatibility, hosted provider/store connectivity or hosted deployment is claimed. Five differential fixtures are examples, not proof of semantic equivalence for every accepted program. Existing Python builtins-importer bridge and educational-sandbox limitations remain documented and unchanged. There are no required hosted dashboard actions for this feature.
