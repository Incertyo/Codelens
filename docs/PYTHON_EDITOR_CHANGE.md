# Python-only editor checkpoint

The owner explicitly requested Python as the only editor/Run language, then continuing phases 3A/3B. This is an authorized behavior change separate from the refactor. This checkpoint implements the editor boundary; the remaining browser-test migration and 3A/3B are not complete.

## Changes

- src/features/editor/policy.ts owns the editor language, detection adaptation, source notice and unsupported share marker. Keep the internal Language/catalog types unchanged to preserve frozen export/maintenance contracts.
- workspace.tsx offers only Python, guards Run and shortcuts, loads Python examples/references, preserves old JavaScript shares as source-only, and blocks their analysis/cache hydration. New Python drafts recover normally. Undo keeps unsupported source markers.
- Monaco uses Python syntax; library detail offers only Python and cannot request a JavaScript variant. The existing design/styles, Python runner, AST/measurement/advice/visualizer implementations and provider fixtures are unchanged.
- Existing heuristic/model evaluation stays unchanged internally; JavaScript detections become unsupported in the editor. Detection is finite, not a universal language or validity proof. Ambiguous text always executes as Python, never JavaScript. A policy check admits all 326 frozen Python implementations.
- Internal JavaScript workers/instrumenter/measurement tools and all 360 golden entries remain for maintenance/parity; none is selectable in the editor. Public catalog data still includes its immutable JavaScript entries. Provider/API contracts and fixtures are preserved, not narrowed by this editor change.
- README, DEPLOYMENT, active language module notes and smoke now describe/use Python. No new route, dependency or environment variable; check:env and .env.example require no change. The optional explicit AI smoke probe uses Python but was not run against a provider.

## Tests and evidence

- A production browser assertion first failed on the old options array [auto, python, javascript] versus [python]. Evidence: ignored artifacts/refactor/python-only/before.json and before.log.
- Added tests/python-only.test.ts: 11 cases using real heuristic/share functions, including all 326 frozen Python catalog inputs. Final related unit scope passes 35/35 across two files; final policy suite 11/11. Maintenance/script/frozen checks pass 7/7. Incremental typecheck and cached scoped lint pass.
- Quick golden passes without fixture updates. One new production build passes. Five existing library/diagram cases pass in browser.log; corrected python-only/workspace batch passes 10/10 with no retries/skips (123.76 s). Together these are 15 distinct production browser cases, covering real Pyodide, old JavaScript shares, keyboard blocking, Python library loads/failures, graph/tree/recursion sizing, playback/breakpoints/stdin/errors, themes/mobile/design/accessibility and network restrictions.
- The initial new negative test wrongly expected disabled playback instead of an unmounted panel; the new library test wrongly assumed the inline palindrome program contained def. Correct only these new assertions to absent playback and Python mode plus actual output. The two interrupted runs are retained as evidence; no application change/rebuild was made during these test corrections.
- Local npm run smoke against loopback production passes with AI disabled. All logs/reports are ignored under artifacts/refactor/python-only. No hosted call, push or deployment.

## Outstanding work before 3A/3B

- Migrate the remaining browser stories that select Auto/JavaScript or open executable JavaScript shares to the authorized Python-only contract. Preserve Python feature assertions; retain internal JavaScript runtime coverage via direct maintenance harnesses/goldens. Likely affected areas: opening-detection, language-scope, phase-two/three, ai-controls, measurement, hardening, visualizers, complexity, navigation, refactor characterization and runtime-assets. These stories were not all run and no full-browser pass is claimed.
- Existing provider fixture tests, golden files, frozen manifest inputs, catalog export and reference programs have no changes. Final full T2 is pending after 3A/3B as requested; only targeted units/quick goldens ran at this checkpoint.
- Limits centralization, protocol/conformance choice, shared validation and AI pipeline remain unimplemented. Preserve the opposing internal worker policies documented in REFACTOR_PHASE3.md unless separately approved; do not fix L1–L8, change message texts/statuses or begin 3C/3D/3E.
