# CodeLens architecture

## Ownership

- `src/app`: Next routes/layout/loading and thin page/API entry points; no provider pipeline or database handlers.
- `src/shared`: limits, trace and source schemas, snapshot records, worker protocol, hashing/identity, guarded storage and pure growth models. Imports no feature implementation.
- `src/features/runner`: parent runners, internal JavaScript instrumenter/runtime, measurement and module worker entry.
- `src/features/editor`: Python editor policy, Monaco, retained language detector and its worker.
- `src/features/visualizer`: detector models/source hints, structure detection, renderer families, viewport, recursion and playback.
- `src/features/insights`: Breakdown, Analysis, complexity chart/comparison, controller hooks and inspection lifecycle.
- `src/features/library`: browser/detail/loader, immutable-data adapters, authored notes and server repositories.
- `src/features/ai/client`: notices, readiness transport and hook.
- `src/features/ai/server`: provider adapters/readiness, limiter, mode schemas, generation pipeline and HTTP handler.
- `src/features/workspace`: composition, run/shortcut/cache bindings, dialogs and named store actions.
- `src/features/intro`, `preferences`, `share`, `design`: their own UI and pure policies/codecs.

## Public entries and boundaries

Each feature exposes explicit entries under `public/`. A public entry re-exports one owned module. This is a deliberate adjustment from one monolithic index: runtime workers, dynamic UI chunks and server modules must not acquire each other's dependencies through a barrel.

Same-feature imports may address implementations directly. Cross-feature consumers and routes use public entries. Server entries retain a `server/` path; client modules cannot import them. Shared modules cannot import features. Workers cannot import React, Next or editor/UI libraries. Local ESLint rules enforce these boundaries without an additional dependency.

Frozen authored files stay under `src/lib`; relocating them would change freshness-manifest inputs. Compatibility re-exports remain only where frozen scripts or unchanged provider fixture tests require the old import path. They own no duplicate implementation. Generated catalog data stays under `src/generated`.

## Runtime and protocol

The Python worker stays at `/tracer.worker.js` as a classic worker. `generate-worker-core.mjs` transpiles canonical shared limits and protocol helpers into `/worker-core.js`, using the installed TypeScript compiler. `predev`, `prebuild` and `postinstall` generate it. No compiler dependency is added.

Workers capture trusted messaging and neutralize public messaging before execution. Parent runners use the shared nonce/phase/deadline state machine. The trusted sender keeps the nonce in a closure; it is not added to Python limits or user globals. Classic-worker helpers are removed from their temporary global export after capture. Runtime capability lists retain each language's prior differences.

Python requests carry canonical limits; direct local Pyodide harness setup supplies the same limits as defaults. Worker validation retains the measured legacy differences rather than silently adopting stricter common input validation. This educational sandbox still has the documented Python builtins-importer bridge limitation.

Hashed Pyodide/Monaco/detector assets and their copy pipeline, CSP and cache headers retain their existing roles. Worker paths stay explicit `new URL(..., import.meta.url)` dependencies. Production URLs have not been exercised in this pass.

## AI and UI lifecycle

Notes and advice have separate actions, schemas, prompts and reference validators. One generation pipeline owns the 18-second deadline, two counted attempts, provider schema adaptation and error classification. The cache hook is inert. Admission and existing save/cache semantics remain in the server handler; recorded defects are deferred.

Named store actions retain source revisions, run epochs and transition ordering. Run/library/shortcut/stored-note hooks keep workspace orchestration local. Insights controllers share only inspection lifecycle; the 600 ms Analysis and 400 ms Complexity debounce policies stay distinct. Source-keyed remounts and cancellation are retained.

## Styles and acceptance

CSS is organized into ordered token, base and domain files. Unlayered source order is retained to preserve Tailwind and Monaco cascade behavior; equal-specificity overrides are not arbitrarily reordered into CSS cascade layers.

The owner waived builds, lint, typecheck, tests and visual verification for this pass. Architecture rules and code are implemented, but behavior, golden, bundle, browser, asset and visual parity are unverified. Phase 4 remains a separate acceptance gate.
