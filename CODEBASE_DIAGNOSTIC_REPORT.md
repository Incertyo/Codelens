# CodeLens Codebase Diagnostic Report

**Audit date:** 14 October 2026 (Asia/Calcutta). **Repository:** Incertyo/Codelens. **Audited commit:** `c1c7888fc7468bb36163aa80f6848eaef649099a` (`main`). **Scope:** implementation, contracts, browser workers, renderers, catalog/SQL/scripts, production `.next` artifacts, and all test definitions. No application, configuration, reference-program or fixture changes were made; this report is the sole deliverable. No deployment, credential change, provider call or billing action was performed for this audit.

**Evidence labels:** **Confirmed** means reproduced by a bounded probe or direct artifact measurement; **Code-supported risk** means the implementation permits the failure but its worst case was not exercised; **Unverified** means external configuration or behavior was not checked. Passing tests do not establish a hostile-code sandbox, semantic correctness of AI traces, or a 60 fps guarantee. Findings are pinned to this commit; repository-relative `file:Lstart-Lend` references are portable for an external reviewer.

## 1. Repository Topology & Bundle Footprint

### Counting rules and complete three-level tree

The baseline is the **169 Git-tracked files**, not the entire workstation checkout. LOC is physical text lines, excluding only the terminal empty split after a final newline; blank lines and comments count. Nonblank lines are separately supplied for named modules. Generated/minified catalog JSON counts as one physical line; that is why byte size accompanies LOC. `node_modules`, `.git`, `.next`, ignored credentials, copied runtime assets, local SQLite, reports and caches are excluded from source counts. Folder annotations are recursive totals, and therefore overlap parent totals; do not sum them. Deeper files are represented by their directory aggregate at level 3.

```text
. [169 tracked files; 35,984 physical lines]
├── .github/ [1 files; 51 LOC]
│   └── workflows/ [1 files; 51 LOC]
│       └── ci.yml [51 LOC]
├── docs/ [12 files; 821 LOC]
│   ├── ABC_VERIFICATION.md [30 LOC]
│   ├── DECISIONS.md [161 LOC]
│   ├── DEPLOYMENT.md [189 LOC]
│   ├── LIBRARY_DATABASE_VERIFICATION.md [41 LOC]
│   ├── LIBRARY_DATABASE.md [54 LOC]
│   ├── MOTION_SIZING_VERIFICATION.md [18 LOC]
│   ├── PHASE_2_5_VERIFICATION.md [68 LOC]
│   ├── PHASE_2_VERIFICATION.md [39 LOC]
│   ├── PHASE_3_VERIFICATION.md [53 LOC]
│   ├── PUBLIC_GITHUB_PREP.md [50 LOC]
│   ├── VERIFICATION.md [88 LOC]
│   └── WORKSPACE_NAVIGATION_VERIFICATION.md [30 LOC]
├── library/ [17 files; 5,098 LOC]
│   ├── python/ [16 files; 5,047 LOC]
│   │   ├── arrays.py [329 LOC]
│   │   ├── backtracking.py [286 LOC]
│   │   ├── dynamic_programming.py [392 LOC]
│   │   ├── geometry.py [218 LOC]
│   │   ├── graphs.py [757 LOC]
│   │   ├── greedy.py [195 LOC]
│   │   ├── hashing.py [151 LOC]
│   │   ├── heaps.py [179 LOC]
│   │   ├── linked_lists.py [221 LOC]
│   │   ├── mathematics.py [380 LOC]
│   │   ├── range_queries.py [376 LOC]
│   │   ├── searching.py [160 LOC]
│   │   ├── sorting.py [277 LOC]
│   │   ├── stacks.py [227 LOC]
│   │   ├── strings.py [349 LOC]
│   │   └── trees.py [550 LOC]
│   └── schema.sql [51 LOC]
├── public/ [4 files; 410 LOC]
│   ├── analysis.py [76 LOC]
│   ├── outline.py [52 LOC]
│   ├── tracer.py [188 LOC]
│   └── tracer.worker.js [94 LOC]
├── scripts/ [15 files; 1,139 LOC]
│   ├── audit-browser.mjs [31 LOC]
│   ├── check-env.mjs [109 LOC]
│   ├── check-library-algorithms.py [182 LOC]
│   ├── compile-library.py [50 LOC]
│   ├── copy-runtime.mjs [47 LOC]
│   ├── export-library.ts [25 LOC]
│   ├── library-manifest.mjs [32 LOC]
│   ├── measure-scrubbing.mjs [65 LOC]
│   ├── measure-visualizers.mjs [143 LOC]
│   ├── prepare-library.mjs [18 LOC]
│   ├── preview-library.mjs [56 LOC]
│   ├── preview-workspace.mjs [58 LOC]
│   ├── seed-library.ts [151 LOC]
│   ├── smoke.mjs [163 LOC]
│   └── verify-library.mjs [9 LOC]
├── src/ [76 files; 13,665 LOC]
│   ├── app/ [10 files; 3,750 LOC]
│   │   ├── api/ [2 files; 130 LOC]
│   │   ├── design/ [1 files; 181 LOC]
│   │   ├── algorithm-views.css [269 LOC]
│   │   ├── globals.css [2301 LOC]
│   │   ├── layout.tsx [29 LOC]
│   │   ├── loading.tsx [4 LOC]
│   │   ├── page.tsx [4 LOC]
│   │   ├── phase-two.css [353 LOC]
│   │   └── workspace-navigation.css [479 LOC]
│   ├── components/ [32 files; 5,126 LOC]
│   │   ├── visualizer/ [15 files; 967 LOC]
│   │   ├── algorithm-browser.tsx [288 LOC]
│   │   ├── algorithm-detail.tsx [71 LOC]
│   │   ├── analysis.tsx [597 LOC]
│   │   ├── breakdown.tsx [333 LOC]
│   │   ├── code-editor.tsx [258 LOC]
│   │   ├── decorative.tsx [69 LOC]
│   │   ├── diagram-viewport.tsx [111 LOC]
│   │   ├── loading-screen.tsx [117 LOC]
│   │   ├── page-intro.tsx [241 LOC]
│   │   ├── playback.tsx [136 LOC]
│   │   ├── preferences.tsx [59 LOC]
│   │   ├── recursion-tree.tsx [167 LOC]
│   │   ├── structure-views.tsx [255 LOC]
│   │   ├── use-ai-readiness.ts [46 LOC]
│   │   ├── use-language-detection.ts [89 LOC]
│   │   ├── visualizer.tsx [262 LOC]
│   │   └── workspace.tsx [1060 LOC]
│   ├── generated/ [1 files; 1 LOC]
│   │   └── library.json [1 LOC]
│   ├── lib/ [31 files; 4,673 LOC]
│   │   ├── ai/ [10 files; 774 LOC]
│   │   ├── javascript/ [4 files; 859 LOC]
│   │   ├── visualizer/ [1 files; 774 LOC]
│   │   ├── additional-examples.ts [294 LOC]
│   │   ├── algorithm-catalog.ts [636 LOC]
│   │   ├── analysis.ts [203 LOC]
│   │   ├── breakdown.ts [196 LOC]
│   │   ├── editor-colors.ts [6 LOC]
│   │   ├── examples.ts [70 LOC]
│   │   ├── intro.ts [30 LOC]
│   │   ├── javascript-examples.ts [16 LOC]
│   │   ├── language-detection.ts [96 LOC]
│   │   ├── library-contract.ts [20 LOC]
│   │   ├── library-repository.ts [80 LOC]
│   │   ├── runner.ts [127 LOC]
│   │   ├── share.ts [28 LOC]
│   │   ├── store.ts [153 LOC]
│   │   ├── structures.ts [193 LOC]
│   │   └── trace.ts [118 LOC]
│   └── workers/ [2 files; 115 LOC]
│       ├── javascript.worker.ts [83 LOC]
│       └── language-detection.worker.ts [32 LOC]
├── tests/ [27 files; 4,159 LOC]
│   ├── e2e/ [8 files; 1,481 LOC]
│   │   ├── ai-controls.spec.ts [145 LOC]
│   │   ├── library.spec.ts [118 LOC]
│   │   ├── loading-sizing.spec.ts [87 LOC]
│   │   ├── navigation.spec.ts [126 LOC]
│   │   ├── opening-detection.spec.ts [248 LOC]
│   │   ├── phase-three.spec.ts [370 LOC]
│   │   ├── phase-two.spec.ts [214 LOC]
│   │   └── workspace.spec.ts [173 LOC]
│   ├── ai-controls.test.ts [286 LOC]
│   ├── ai-readiness.test.ts [44 LOC]
│   ├── analysis.test.ts [235 LOC]
│   ├── analyze.test.ts [221 LOC]
│   ├── catalog.test.ts [39 LOC]
│   ├── detectors.test.ts [350 LOC]
│   ├── editor-colors.test.ts [11 LOC]
│   ├── google-ai.test.ts [243 LOC]
│   ├── intro.test.ts [12 LOC]
│   ├── javascript.test.ts [118 LOC]
│   ├── language-detection.test.ts [136 LOC]
│   ├── library.test.ts [157 LOC]
│   ├── outline.test.ts [63 LOC]
│   ├── phase3-ai.test.ts [232 LOC]
│   ├── share.test.ts [32 LOC]
│   ├── shared-store-fixture.ts [78 LOC]
│   ├── structures.test.ts [133 LOC]
│   ├── tracer.test.ts [96 LOC]
│   └── visualizers.spec.ts [192 LOC]
├── .env.example [26 LOC]
├── .gitignore [27 LOC]
├── .prettierignore [10 LOC]
├── .prettierrc.json [1 LOC]
├── .vercelignore [15 LOC]
├── AGENTS.md [9 LOC]
├── eslint.config.mjs [29 LOC]
├── LICENSE [21 LOC]
├── next.config.ts [45 LOC]
├── package-lock.json [10121 LOC]
├── package.json [72 LOC]
├── playwright.config.ts [25 LOC]
├── postcss.config.mjs [2 LOC]
├── README.md [196 LOC]
├── tsconfig.json [27 LOC]
├── vercel.json [9 LOC]
└── vitest.config.ts [6 LOC]
```

### Exact named-module totals

These are cross-directory architectural sets, not a claim that folder names alone define boundaries. Their exact file membership appears below. Remaining tracked files are UI glue, examples, CSS, documentation and root tooling.

| Audit module | Files | Physical LOC | Nonblank LOC | UTF-8 bytes |
| --- | --- | --- | --- | --- |
| workers | 8 | 1143 | 1126 | 41992 |
| visualizers | 22 | 2865 | 2858 | 100301 |
| analysis | 8 | 1815 | 1807 | 76985 |
| api/AI | 12 | 904 | 891 | 34333 |
| store | 1 | 153 | 152 | 4356 |
| db/catalog | 28 | 6357 | 5644 | 232194 |
| tests | 27 | 4159 | 4125 | 177129 |
| generated catalog | 1 | 1 | 1 | 1094243 |

**workers membership:** `public/tracer.py`, `public/tracer.worker.js`, `src/lib/javascript/instrument.ts`, `src/lib/javascript/runtime.ts`, `src/lib/runner.ts`, `src/lib/trace.ts`, `src/workers/javascript.worker.ts`, `src/workers/language-detection.worker.ts`.

**visualizers membership:** `src/components/diagram-viewport.tsx`, `src/components/playback.tsx`, `src/components/recursion-tree.tsx`, `src/components/structure-views.tsx`, `src/components/visualizer.tsx`, `src/components/visualizer/AlgorithmCanvas.tsx`, `src/components/visualizer/renderers/BitmaskView.tsx`, `src/components/visualizer/renderers/DPDependencyGrid.tsx`, `src/components/visualizer/renderers/DSUView.tsx`, `src/components/visualizer/renderers/GenericMatrixView.tsx`, `src/components/visualizer/renderers/HashTableView.tsx`, `src/components/visualizer/renderers/HeapDualView.tsx`, `src/components/visualizer/renderers/IntervalView.tsx`, `src/components/visualizer/renderers/QueueView.tsx`, `src/components/visualizer/renderers/SegmentTreeView.tsx`, `src/components/visualizer/renderers/SlidingWindowOverlay.tsx`, `src/components/visualizer/renderers/StackView.tsx`, `src/components/visualizer/renderers/StringBufferView.tsx`, `src/components/visualizer/renderers/TrieView.tsx`, `src/components/visualizer/renderers/shared.tsx`, `src/lib/structures.ts`, `src/lib/visualizer/detectors.ts`.

**analysis membership:** `public/analysis.py`, `public/outline.py`, `src/components/analysis.tsx`, `src/components/breakdown.tsx`, `src/lib/analysis.ts`, `src/lib/breakdown.ts`, `src/lib/javascript/analysis.ts`, `src/lib/javascript/ast.ts`.

**api/AI membership:** `src/app/api/analyze/route.ts`, `src/app/api/library/route.ts`, `src/lib/ai/analyze.ts`, `src/lib/ai/control-error.ts`, `src/lib/ai/generation.ts`, `src/lib/ai/notice.ts`, `src/lib/ai/output-schema.ts`, `src/lib/ai/phase3.ts`, `src/lib/ai/provider-quota.ts`, `src/lib/ai/rate-limit.ts`, `src/lib/ai/readiness-client.ts`, `src/lib/ai/simulation.ts`.

**store membership:** `src/lib/store.ts`.

**db/catalog membership:** `library/python/arrays.py`, `library/python/backtracking.py`, `library/python/dynamic_programming.py`, `library/python/geometry.py`, `library/python/graphs.py`, `library/python/greedy.py`, `library/python/hashing.py`, `library/python/heaps.py`, `library/python/linked_lists.py`, `library/python/mathematics.py`, `library/python/range_queries.py`, `library/python/searching.py`, `library/python/sorting.py`, `library/python/stacks.py`, `library/python/strings.py`, `library/python/trees.py`, `library/schema.sql`, `scripts/check-library-algorithms.py`, `scripts/compile-library.py`, `scripts/export-library.ts`, `scripts/library-manifest.mjs`, `scripts/prepare-library.mjs`, `scripts/preview-library.mjs`, `scripts/seed-library.ts`, `scripts/verify-library.mjs`, `src/lib/algorithm-catalog.ts`, `src/lib/library-contract.ts`, `src/lib/library-repository.ts`.

**tests membership:** `tests/ai-controls.test.ts`, `tests/ai-readiness.test.ts`, `tests/analysis.test.ts`, `tests/analyze.test.ts`, `tests/catalog.test.ts`, `tests/detectors.test.ts`, `tests/e2e/ai-controls.spec.ts`, `tests/e2e/library.spec.ts`, `tests/e2e/loading-sizing.spec.ts`, `tests/e2e/navigation.spec.ts`, `tests/e2e/opening-detection.spec.ts`, `tests/e2e/phase-three.spec.ts`, `tests/e2e/phase-two.spec.ts`, `tests/e2e/workspace.spec.ts`, `tests/editor-colors.test.ts`, `tests/google-ai.test.ts`, `tests/intro.test.ts`, `tests/javascript.test.ts`, `tests/language-detection.test.ts`, `tests/library.test.ts`, `tests/outline.test.ts`, `tests/phase3-ai.test.ts`, `tests/share.test.ts`, `tests/shared-store-fixture.ts`, `tests/structures.test.ts`, `tests/tracer.test.ts`, `tests/visualizers.spec.ts`.

**generated catalog membership:** `src/generated/library.json`.

The three largest authored implementation files are `src/app/globals.css` (2,301 LOC), `src/components/workspace.tsx` (1,060 LOC), and `src/lib/visualizer/detectors.ts` (774 LOC). The lockfile contributes 10,121 lines; it is not application LOC. The static catalog is 1,094,243 bytes despite being one line.

### Dependencies, overrides and lifecycle scripts

Exact `package.json` dependency declarations, development declarations, override, Node engine and scripts follow; version ranges below are declarations, not inferred installed versions.

```json
{
  "engines": {
    "node": "24.x"
  },
  "scripts": {
    "library:seed": "tsx scripts/seed-library.ts",
    "library:export": "node scripts/prepare-library.mjs",
    "predev": "npm run library:seed",
    "prebuild": "node scripts/verify-library.mjs",
    "pretest": "npm run library:seed",
    "pretest:e2e": "npm run build",
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "check:env": "node scripts/check-env.mjs",
    "smoke": "node scripts/smoke.mjs",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "format": "prettier --write .",
    "postinstall": "node scripts/copy-runtime.mjs"
  },
  "dependencies": {
    "@ai-sdk/anthropic": "^4.0.79",
    "@ai-sdk/google": "^4.0.94",
    "@ai-sdk/openai": "^4.0.92",
    "@fontsource/doto": "^5.2.0",
    "@fontsource/jetbrains-mono": "^5.2.0",
    "@fontsource/space-grotesk": "^5.2.0",
    "@monaco-editor/react": "^4.7.0",
    "@vscode/vscode-languagedetection": "^1.0.23",
    "acorn": "^8.19.0",
    "ai": "^7.0.138",
    "astring": "^1.9.0",
    "framer-motion": "^12.0.0",
    "gsap": "^3.13.0",
    "lenis": "^1.3.0",
    "lucide-react": "^0.468.0",
    "lz-string": "^1.5.0",
    "monaco-editor": "^0.57.0",
    "next": "^16.0.0",
    "pyodide": "^0.28.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.10.0",
    "@playwright/test": "^1.56.0",
    "@tailwindcss/postcss": "^4.1.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "lighthouse": "^13.0.0",
    "prettier": "^3.6.0",
    "tailwindcss": "^4.1.0",
    "tsx": "^4.23.15",
    "typescript": "^5.9.0",
    "vitest": "^5.0.4"
  },
  "overrides": {
    "dompurify": "^3.4.17"
  }
}
```

The lockfile contains 660 package entries including the root. Important resolved versions are Next **16.4.0**, React **19.3.0**, AI SDK **7.0.138**, and TypeScript **5.9.3**. Production uses webpack explicitly. Postinstall copies Pyodide, Monaco and language-model assets, writes both runtime manifests, and creates hash-derived paths (`scripts/copy-runtime.mjs:L3-L47`). Prebuild verifies catalog source hashes without requiring Python or SQLite. Predev/pretest seed SQLite and require Python; `test:e2e` invokes the production build through `pretest:e2e`. The DOMPurify override is transitive, not a direct dependency.

### Measured production build output

The existing `.next` artifacts are from the validated production build used for this commit. Next 16 does **not** supply the old per-route “Size / First Load JS” build-manifest fields here. This table reconstructs an explicit equivalent: unique JS files named by `<script src>` in each prerendered HTML, excluding the nomodule polyfill for the modern-browser initial total. Route-associated bytes exclude framework/root-main files and the polyfill, but include inherited layout/loading chunks; they are not just the page entry. Gzip is a reproducible level-9 **sum of individually compressed files**, not observed HTTP transfer size. Lazy imports, workers, Monaco AMD assets, Pyodide and detection weights are additional loads.

| Route | Rendering | HTML bytes | Route-associated JS raw / gzip bytes | Modern initial JS raw / gzip bytes |
| --- | --- | --- | --- | --- |
| / | Static | 54498 | 411603 / 133638 | 861867 / 266858 |
| /design | Static | 15868 | 161076 / 55164 | 611340 / 188384 |
| /_not-found | Static | 9637 | 128960 / 42854 | 579224 / 176074 |
| /_global-error | Static | 9470 | 123576 / 40585 | 573840 / 173805 |
| /api/analyze | Dynamic Node function | — | — (server only) | — (server only) |
| /api/library | Dynamic Node function | — | — (server only) | — (server only) |

Framework/root-main JS: **450,264 raw / 133,220 gzip bytes**. Nomodule polyfill, excluded above: **112,594 / 39,520 bytes**. APIs have no client First Load JS. Server entry files are **767,251 bytes** for analyze and **1,125,534 bytes** for library, excluding their traced dependencies. Function trace inventories contain 168 files / 2,084,188 raw bytes for analyze and 169 / 4,668,178 for library; these are local NFT dependency sums, not Vercel deployment archive sizes. The library trace includes local `data/codelens.sqlite` because `next.config.ts:L16` unconditionally includes it even when the static catalog is selected.

| Artifact set | Files | Raw bytes | Interpretation |
| --- | --- | --- | --- |
| .next/static | 83 | 3616628 | JS, CSS and font artifacts; not all loaded by one route |
| pyodide | 6 | 12263097 | Current content-addressed public directory; not a per-navigation transfer total |
| monaco | 151 | 25564261 | Current content-addressed public directory; not a per-navigation transfer total |
| languageDetection | 2 | 958550 | Current content-addressed public directory; not a per-navigation transfer total |

**Footprint diagnosis:** the first page already requires about 862 KB of modern JS before editor/runtime work. Monaco’s installed public directory is about 25.56 MB and Pyodide about 12.26 MB. Python boot pre-reads its manifest assets for progress, then initializes Pyodide from the same URLs; caching can avoid duplicate network transfers, but the stream/read/initialization work still repeats for every new Python worker (`public/tracer.worker.js:L19-L47`). No service worker or offline-installable PWA is implemented.

## 2. Core Contract & State Machine Audit

### Exact TypeScript trace contracts

`src/lib/trace.ts:L3-L29` (verbatim):

```typescript
export type Value = null | boolean | number | string | { ref: string };
export type HeapObject = {
  type: string;
  items?: Value[];
  entries?: [Value, Value][];
  fields?: Record<string, Value>;
  truncated?: boolean;
};
export type Step = {
  index: number;
  line: number;
  event: 'line' | 'call' | 'return' | 'exception' | 'output';
  func: string;
  callStack: { id?: string; func: string; line: number; locals: Record<string, Value> }[];
  globals: Record<string, Value>;
  heap: Record<string, HeapObject>;
  stdout: string;
  explanation?: string;
};
export type TraceResult = {
  origin?: 'ai-simulated';
  identity?: { implementationId: string; sourceHash: string };
  steps: Step[];
  truncated: boolean;
  error: string | null;
  elapsed: number;
};
```

A local trace has **optional** identity and frame IDs at the type boundary. `traceSchema` accepts at most 5,000 steps but does not enforce contiguous indices, balanced stacks, source-line upper bounds, resolvable references, per-frame/per-heap/per-value caps, or strict unknown-key rejection (`src/lib/trace.ts:L33-L70`). The much stricter simulation validator is not applied to local worker traces. Therefore “validated real trace” currently means schema-compatible worker output, not independently authenticated execution evidence.

### Exact visual-model definitions

`src/lib/visualizer/detectors.ts:L4-L113` (verbatim, including dependencies of the union):

```typescript
export const CELL_CAP = 80;
export const VIEW_CAP = 6;
const pointerNames = ['left', 'right', 'i', 'j', 'lo', 'hi', 'mid', 'start', 'end', 'p1', 'p2'];
type Base = { id: string; name: string; truncated?: boolean };
export type WindowModel = Base & {
  kind: 'sliding_window';
  targetCollectionId: string;
  startIndex: number;
  endIndex: number;
  windowLength: number;
};
export type SequenceModel = Base & {
  kind: 'sequence';
  elements: Value[];
  activePointers: Record<string, number>;
  window?: WindowModel;
};
export type StringModel = Base & {
  kind: 'string_buffer';
  chars: string[];
  indices: number[];
  activePointers: Record<string, number>;
  window?: WindowModel;
};
export type StackModel = Base & { kind: 'stack'; elements: Value[]; topIndex: number };
export type QueueModel = Base & {
  kind: 'queue' | 'deque';
  elements: Value[];
  frontIndex: number;
  rearIndex: number;
  isCircular: boolean;
};
export type IntervalModel = Base & {
  kind: 'interval_set';
  intervals: { start: number; end: number; id: string; active: boolean }[];
};
export type HashModel = Base & {
  kind: 'hash_table';
  capacity: number;
  buckets: { key: string; value: Value }[][];
  loadFactor: number;
};
export type SetModel = Base & {
  kind: 'set_pool';
  items: Value[];
  operation?: 'union' | 'intersection' | 'difference';
};
export type HeapModel = Base & {
  kind: 'binary_heap';
  elements: Value[];
  heapType: 'min' | 'max';
  parentChildMap: Map<number, { left?: number; right?: number }>;
};
export type TrieModel = Base & {
  kind: 'trie';
  rootId: string;
  nodes: Map<string, { char: string; isTerminal: boolean; children: Record<string, string> }>;
  activePath: string[];
};
export type DSUModel = Base & {
  kind: 'dsu';
  parent: number[];
  rank?: number[];
  size?: number[];
  sets: Map<number, number[]>;
  invalidParents: number[];
};
export type SegmentModel = Base & {
  kind: 'segment_tree';
  variant: 'segment' | 'fenwick';
  tree: number[];
  rangeMap: { left: number; right: number; val: number; index: number; parent?: number }[];
  activeIndex?: number;
};
export type BitModel = Base & {
  kind: 'bitmask';
  intValue: number;
  decimalValue: string;
  bitLength: 32 | 64;
  bits: string;
  activeMasks: string[];
  shift?: 'left' | 'right';
};
export type DPModel = Base & {
  kind: 'dp_matrix';
  rows: number;
  cols: number;
  cells: Value[][];
  activeCell?: [number, number];
  sourceCells: [number, number][];
};
export type LegacyModel = Base & { kind: 'legacy'; structure: Structure };
export type ScalarModel = Base & { kind: 'scalar'; values: { name: string; value: Value }[] };
export type VisualModel =
  | SequenceModel
  | StringModel
  | StackModel
  | QueueModel
  | IntervalModel
  | HashModel
  | SetModel
  | HeapModel
  | TrieModel
  | DSUModel
  | SegmentModel
  | BitModel
  | DPModel
  | LegacyModel
  | ScalarModel
  | WindowModel;
```

There are **16 union members**, **17 `kind` literal values** because QueueModel covers queue/deque, and one non-card sliding-window overlay. Segment/Fenwick are variants of one member. Legacy additionally encapsulates ten StructureKind values. “16 visual models” is therefore a product-level shorthand, not sixteen mutually exclusive detector branches.

### Exact primary Zustand state/action interface

`src/lib/store.ts:L6-L38` (verbatim):

```typescript
type State = {
  code: string;
  sourceRevision: number;
  language: Language;
  languageMode: LanguageMode;
  languageChosenManually: boolean;
  sourceOrigin: SourceOrigin;
  autoSwitchEligible: boolean;
  breakdown: BreakdownData | null;
  enrichment: Enrichment | null;
  selectedLine: number | null;
  stdin: string;
  result: TraceResult | null;
  cursor: number;
  playing: boolean;
  speed: number;
  breakpoints: number[];
  status: 'idle' | 'loading' | 'running' | 'ready' | 'error';
  progress: number;
  message: string;
  edited: boolean;
  tab: 'visualizer' | 'breakdown' | 'analysis';
  theme: 'dark' | 'light';
  reduced: boolean;
  setCode: (code: string, origin?: SourceOrigin) => void;
  chooseLanguage: (mode: LanguageMode) => void;
  applyDetection: (language: Language, revision: number, explicit?: boolean) => void;
  setStdin: (stdin: string) => void;
  setResult: (result: TraceResult) => void;
  seek: (index: number) => void;
  toggleBreakpoint: (line: number) => void;
  patch: (partial: Partial<State>) => void;
};
```

The actual initial state is Python Bubble sort, Auto mode, sample origin, no auto-switch eligibility, idle, cursor zero, speed 2, empty stdin/breakpoints, dark theme and full motion (`src/lib/store.ts:L39-L62`). There is no persisted execution result and no server-side user session.

### Implemented transitions, not an idealized state machine

| Trigger | Implemented changes | Boundary / caveat |
| --- | --- | --- |
| Source edit | Revision +1; clears result, cursor, playback, breakpoints, message, outline, enrichment and selected line | `src/lib/store.ts:L63-L84`; status becomes idle regardless of prior state |
| Manual language selection | Non-Auto mode permanently records manual choice; clears trace/outline/enrichment/selection | `src/lib/store.ts:L85-L101`; source text and revision are retained |
| Detected language | Requires matching revision, Auto mode and no execution; automatic change requires eligible untouched/empty draft | `src/lib/store.ts:L102-L129`; explicit Switch records manual choice |
| Stdin edit | Clears trace and enrichment, resets cursor/playback/status/message | `src/lib/store.ts:L130-L139`; source-only AST outline is retained |
| Run | idle/ready/error → loading → running → ready or error; clears old trace/enrichment | `src/components/workspace.tsx:L110-L230`; real worker progress supplies loading/running |
| Stop | Increments run ID, terminates worker, aborts simulation, clears playback; status idle | `src/components/workspace.tsx:L231-L237` |
| Playback/seek | Clamps cursor; explicit seek UI pauses; tick stops at breakpoint/end | `src/lib/store.ts:L142-L151`; `src/components/playback.tsx:L17-L35` |
| Generic patch | Can write any Partial<State> including status and all invariants | `src/lib/store.ts:L152`; no reducer validation or guarded transition graph |

This is a convention-driven state machine. `patch` makes illegal combinations representable: ready with no result, arbitrary progress/speed, selected lines from unrelated code, or a language/result mismatch. Existing UI paths mostly clear related fields correctly, but those invariants are not encoded centrally.

### Source identity: exact propagation and gaps

`sourceIdentity` hashes UTF-8 editor source using browser SHA-256 and combines it with the selected implementation ID; `sameIdentity` compares both fields (`src/lib/analysis.ts:L29-L47`). Catalog records have a revision-bearing ID and `sourceHash`; the workspace uses that ID only while language and code exactly match the loaded implementation, otherwise `draft:<language>` (`src/components/workspace.tsx:L96-L99`). The library loader validates the returned record shape/selection, but does not compare the record’s advertised hash with a freshly calculated hash before loading (`src/components/workspace.tsx:L250-L285`; `src/lib/library-contract.ts:L3-L20`).

| Stage | What actually travels | Identity enforcement |
| --- | --- | --- |
| Editor → real worker | `{code, stdin, maxSteps, mode}`; no ID/hash/revision in worker message | `src/lib/runner.ts:L123`; one disposable worker per operation |
| Real worker → runner | `{type: result, result}` or outline/inspection/progress | Runtime schema parse; no message authentication or source digest |
| Runner → store | Workspace computes hash after execution and attaches identity | Checks run ID, current code and language before `setResult`; `src/components/workspace.tsx:L189-L205` |
| Analysis AST | Hash and local inspection resolve together | Analysis is remounted under key containing implementationId, language and full code; `src/components/workspace.tsx:L845-L858` |
| Heatmaps | Analysis requires sameIdentity between inspection and trace; simulated traces excluded | `src/components/analysis.tsx:L83-L89`; `src/lib/analysis.ts:L91-L96` |
| Monaco heatmap decorations | Uses executionCounts(trace) directly on the store result | `src/components/code-editor.tsx:L103-L107`; relies on store clearing results on edits |
| Visualizers / recursion / playback | Consume current store Step / trace directly | No independent ID/hash guard; `src/components/visualizer.tsx:L28-L37`; `src/components/visualizer/AlgorithmCanvas.tsx:L85-L89` |
| AI advice | Includes identity in request; server recomputes hash, response echoes it; client compares | `src/lib/ai/phase3.ts:L36-L38`; `src/components/analysis.tsx:L166-L185` |
| AI C++/Java simulation | Same hash check; client revalidates trace and labels origin | `src/components/workspace.tsx:L151-L186`; server identity check does not prove algorithm implementation |
| AI enrichment / step notes | Code, function metadata and up to 32 step descriptors only; no identity | `src/components/breakdown.tsx:L74-L110`; response matched by current code/language, not trace instance or implementation ID |
| AI suggested-test rerun | Driver has its own draft identity; original advice identity guards rerun eligibility | `src/components/analysis.tsx:L130-L145,L202-L223` |

**Important:** the server verifies that the submitted hash matches submitted code, not that the claimed implementationId belongs to the catalog. It accepts arbitrary well-formed IDs. Hashes bind bytes, not trust or provenance. This is appropriate for drafts but must not be mistaken for signed catalog authenticity.

### Concurrency, stale closures and teardown

- **Good:** CodeRunner.dispose rejects pending work and terminates its worker. Completion/error clears its timer and terminates the worker. Run IDs block most old run results; code/language checks add a second guard. Hash-change, keyboard, resize and media listeners generally remove matching callbacks (`src/lib/runner.ts:L13-L18,L55-L65`; `src/components/workspace.tsx:L321-L398`; `src/components/diagram-viewport.tsx:L24-L55`; `src/components/preferences.tsx:L8-L22`).
- **Good:** tab content is keyed, Analysis is keyed by source, and its cleanup aborts AI work and disposes its runner. Breakdown has an effect-local active flag, 300 ms debounce and source comparisons. Readiness uses monotonically increasing request sequence IDs so a late ready response cannot overwrite a later unavailable state (`src/components/workspace.tsx:L845-L858`; `src/components/analysis.tsx:L59-L82`; `src/components/breakdown.tsx:L24-L60`; `src/components/use-ai-readiness.ts:L14-L37`). A reusable `active` ref in Analysis looks risky in isolation, but the source-containing React key mitigates that particular edit race; do not report it as a demonstrated stale-result bug.
- **Confirmed integrity race:** execution code can send a fake `result` before the legitimate harness completes. The parent accepts the first schema-compatible payload and then attaches its own honest source hash to fabricated data. User-sent `started` messages also repeatedly reset the watchdog (`src/workers/javascript.worker.ts:L5-L7,L62-L79`; `src/lib/runner.ts:L79-L103`). Section 7 includes the browser reproduction.
- **Code-supported source/run race:** enrichment is bound only to code/language; sampled step indices are not tied to stdin, maxSteps or a run ID. A response can race a same-source rerun/changed stdin and annotate a different execution. Aborting is deferred until the next outline timer on source changes, and no signal/trace-identity check is made at successful assignment (`src/components/breakdown.tsx:L29-L34,L74-L110`; `src/lib/store.ts:L130-L139`; `src/components/workspace.tsx:L129-L140`). The current stale-edit e 2e coverage does not exercise this same-source race.
- **Bootstrap/workload race:** rapidly switching to Analysis or editing repeatedly remounts it and starts a new Python runtime without debounce. Each instance separately downloads/initializes trusted runtime assets. Cancellation prevents old display, but does not make the bootstrap cheap (`src/components/analysis.tsx:L59-L82`; `src/components/workspace.tsx:L857`; `src/lib/runner.ts:L50-L54`; `public/tracer.worker.js:L10-L47`).
- **Detection backlog:** the language-detection worker persists across edits. Old listeners/timeouts are removed, but old `runModel` work is not aborted, and async onmessage handlers can overlap against one ModelOperations object. Revision checks protect UI correctness; queued model work, memory and latency remain risks (`src/components/use-language-detection.ts:L35-L85`; `src/workers/language-detection.worker.ts:L5-L24`).
- **Small lifecycle debts:** Monaco onMount subscriptions are not individually retained/disposed; the wrapper’s editor disposal is the fallback ownership boundary. Clipboard reset timers have no cleanup. Preference localStorage reads/writes are not caught and can throw when storage is blocked (`src/components/code-editor.tsx:L121-L145`; `src/components/visualizer.tsx:L230-L236`; `src/components/preferences.tsx:L8-L20,L37-L51`). Monaco/timer leaks were not reproduced; the denied-storage failure was reproduced later in this audit (section 7, finding 10).
- **Playback:** the interval reads current Zustand state rather than capturing cursor. It is cleared when dependencies change, but `state.result!` assumes a valid trace and bounded next index. Store APIs enforce this on normal paths; unrestricted patch and forged traces make the assumption weaker than it appears (`src/components/playback.tsx:L17-L31`; `src/lib/store.ts:L152`). Speed is 1–10 steps/second; 60 fps is a scrubbing/rendering target, not the playback cadence.

## 3. Tracer & Sandbox Deep-Dive (Python & JavaScript)

### Python: exact execution and snapshot behavior

`public/tracer.py:L17-L188` implements run_trace. It parses the request, clamps the step ceiling to 10–5,000, creates a new execution globals dictionary, input/output StringIO streams, stable object/frame-ID registries and a monotonic start clock. It compiles source under **`<codelens>`**, installs `sys.settrace(trace)`, then calls exec with that globals dictionary. The callback only captures frames whose filename is `<codelens>`; native calls and imported-library internals are not traced. Events are call, line, return, exception and Writer-generated output. Limits are checked on qualifying trace callbacks: `len(steps) >= limit - 1` or elapsed >10 seconds. A private BaseException subclass ends the trace and appends a final exception-shaped truncation notice. Real exceptions retain source location from the innermost matching traceback, and finally clears tracing and restores stdin/stdout/stderr (`public/tracer.py:L114-L129,L157-L188`).

Snapshots are **pre-line** state for line events. Frame traversal takes up to the nearest 80 matching frames, reverses those to rootward order, and includes the return value under `↳ return`. Globals and frame locals omit dunder names, modules, functions, built-in functions and classes, and admit up to 80 variables (`public/tracer.py:L86-L112`). Writer.write captures cumulative output up to 20,000 characters; Python print may produce separate writes for content and newline, so one print can create several output snapshots (`public/tracer.py:L131-L145`). This is interpreter-event tracing, not one step per visible source statement.

Aliasing uses Python id(obj) → `hN`, and **retained.append(obj)** prevents identity recycling by holding every first-seen object for the entire run. Each snapshot gets a fresh heap, with at most 128 objects, recursion depth <6, and up to 80 sequence items, dictionary pairs or fields. Lists/tuples are sliced; sets/frozensets/deques use islice; queue.Queue variants read the internal queue; objects use `object.__getattribute__(..., __dict__)`, with member-descriptor slot fallback. Large integers beyond JS safe precision become exact decimal strings; extremely large integers become a digit-count placeholder, nonfinite floats become strings, and text is clipped to 200 plus ellipsis (`public/tracer.py:L35-L84`).

### JavaScript: Acorn/Astring transformation

Acorn parses **script** mode with latest ECMAScript and line locations (`src/lib/javascript/ast.ts:L20-L25`). The instrumenter recursively inventories identifiers; chooses a collision-free hook name; rejects async/generator/await/yield/with/dynamic-import AST forms and any Identifier literally named Promise; collects variable/destructuring/catch/function bindings; and emits lexical getter maps (`src/lib/javascript/instrument.ts:L11-L49`).

The transformer inserts line hooks before most statements. It preserves directive prologues, skips initial FunctionDeclaration/Block/loop prefixes, and inserts a loop test SequenceExpression for for/while/do so empty loops are still bounded. For-of/in hooks are inserted at the body start. If branches become blocks, labeled loops retain label semantics, and switch cases get transformed statement lists. Functions, including expression-bodied arrows, become blocks with enter hooks and try/catch/finally wrappers; explicit return passes through returnValue, throw records original line/getters, caught identifier parameters create exception snapshots, and finally paths protect original error attribution. Top level begins/ends a module frame. Astring generates executable JS while hooks retain original line numbers (`src/lib/javascript/instrument.ts:L52-L208`).

JavaScriptTrace uses a WeakMap for stable object IDs, Map for special primitive identities, unique call IDs, full per-step heap copies and cumulative output. `check()` limits steps and a 10-second internal monotonic clock. The parent runner separately permits 90-second bootstrap and resets a 12-second timer on started (`src/lib/javascript/runtime.ts:L13-L32`; `src/lib/runner.ts:L67-L98`). The outer Function wrapper is strict, which can differ from sloppy-script behavior; see below.

### Caps and their actual enforcement boundaries

| Limit | Python | JavaScript / parent |
| --- | --- | --- |
| Source | Parent rejects >30,000 chars; worker also slices to 30,000 | Parent rejection only; worker does not independently clamp code |
| Stdin | Python worker slices to 10,000 chars | JS worker splits supplied stdin with no independent size clamp; editor/share paths restrict normal input |
| Trace steps | Trace callback + Writer reserve final slot; 10–5,000 | Trace hooks enforce clamp; dynamically generated/uninstrumented code does not emit hooks |
| Time | 10s cooperative trace clock; 12s parent after started | 10s cooperative hook clock; 12s parent after started; both can be circumvented by accessible capabilities |
| Heap / collection / depth | 128 objects /80 values /depth6 per snapshot | Same intended bounds; raw array slice/descriptor collection can still be expensive |
| Call stack | Nearest 80 frames per snapshot | Last 80 frames per snapshot; actual frame registry/call-tree can be larger |
| Output | 20,000 characters, cumulative copied into every snapshot | 20,000 characters, cumulative copied into every snapshot |
| Global memory | No aggregate byte/memory budget | No aggregate trace/message/DOM memory budget |

### Variable serialization and semantic edge cases

1. **Confirmed BigInt display defect:** JS serializes bigint as a special heap value such as `123n` (`src/lib/javascript/runtime.ts:L55`), while the bitmask detector calls BigInt on that string (`src/lib/visualizer/detectors.ts:L414-L440`). BigInt("123n") fails and is swallowed, so `const mask=123n; mask ^= 7n;` renders scalar instead of a 64-bit register. The current detector test constructs more favorable values than the real serializer.
2. **Confirmed own-property loss:** JS fields are accumulated into ordinary `{}`. A real own `__proto__` field sets the destination prototype instead of creating an own key; the probe using JSON.parse of `{ "__proto__": { "v": 1 }, "ok": 2 }` retained only ok (`src/lib/javascript/runtime.ts:L97-L105`). Plain getter/variable dictionaries have the same key-shape concern. This probe demonstrated trace data loss, not pollution of the host’s global Object.prototype.
3. **Confirmed missed activation:** a callback function in a parameter default is inspected but never transformed, because the function branch transforms body and immediately returns the node. `function f(g=()=>{return 7;}){return g();}` produces module/f calls but no callback call/return frame (`src/lib/javascript/instrument.ts:L67-L99`). Native callbacks, eval/Function-created code and source imported through indirect capabilities have similar observability gaps.
4. **Confirmed constructor return mismatch:** regular function constructors such as `function Node(v){this.value=v;} new Node(7)` record the special undefined heap reference as their return, while the result object has a different reference. constructorCall is enabled only for class MethodDefinition constructors (`src/lib/javascript/instrument.ts:L93`; `src/lib/javascript/runtime.ts:L210-L225`). The program itself still constructs correctly; the return trace is inaccurate.
5. **Accessor/proxy effects:** ordinary JS getters become `[accessor]`, but Array.slice, overridden Map/Set iterators, instanceof and Object.getOwnPropertyDescriptors can trigger user code or Proxy traps. The catch surrounding variable getter/value extraction silently omits values on failure; it does not make serialization side-effect-free. `console.log` formatting uses JSON.stringify and can execute toJSON/getters (`src/lib/javascript/runtime.ts:L67-L119,L235-L249`). A blocking trap/native operation is outside cooperative hook checks and depends on the parent deadline.
6. **Python custom containers:** isinstance-based list/dict/set dispatch invokes slicing, len, items, iteration or custom int/string behavior on subclasses; these methods can execute code during serialization. object.__getattribute__ reduces ordinary property execution but does not constitute a universal safe serializer (`public/tracer.py:L35-L83`). Exceptions beyond the narrowly caught slot/attribute types can abort tracing or alter observable program behavior.
7. **Precision differences:** JS ordinary unsafe integer numbers are already rounded and are not turned into exact strings; Python preserves most large integers as strings. Only simulated values explicitly require safe integer JSON numbers (`src/lib/javascript/runtime.ts:L53`; `public/tracer.py:L38-L43`; `src/lib/ai/simulation.ts:L6-L11`). Cross-language equality of display values is not guaranteed.
8. **Lost observability:** functions become placeholders or are omitted; symbols become text; typed arrays appear as generic object/map fields (confirmed for Int 32Array); Date/RegExp/nonenumerable/internal-slot-heavy values are not rich types. JS BigInt sets/maps work at storage level but formatting and model selection may diverge. Python sets are unordered; clipped strings/arrays can make index pointers past the captured prefix disappear.
9. **Execution compatibility:** strict JS wrapping changes `this`, undeclared assignment and other sloppy-script behavior. Script parsing rejects modules and TypeScript syntax. The Promise identifier ban also rejects innocent properties/bindings named Promise. JavaScript closures are not fully reconstructed by local/global getter maps. Python sys.settrace is user-accessible; generators produce call/return events on resume/yield, which do not perfectly map to permanent logical activations (`src/workers/javascript.worker.ts:L62-L65`; `src/lib/javascript/instrument.ts:L16-L29,L37-L49`; `public/tracer.py:L114-L129,L161-L163`).
10. **Memory:** Python strong retention plus full heap and stdout per step can retain a great deal more than 128 objects over the whole run. Worst-case cumulative stdout alone is approximately 100 million characters across 5,000 snapshots before serialization/validation copies. JS WeakMap avoids strong identity retention, but snapshots themselves retain serialized data. The caps are per snapshot, not per execution (`public/tracer.py:L21-L22,L46-L54,L106-L112`; `src/lib/javascript/runtime.ts:L13-L25,L129-L137`; `src/lib/runner.ts:L99-L103`).

### Exact worker lockdown sequence and the actual restrictions

**Python worker:** fetch runtime-assets.json → regex-check Pyodide base → fetch manifest plus tracer/outline/analysis text → stream every manifest asset for progress → importScripts trusted pyodide.js → await loadPyodide → run the three trusted harness modules → replace global network constructors/functions using nonwritable, nonconfigurable properties → serialize bounded request → send started → call inspect_code/outline_code/run_trace → post result (`public/tracer.worker.js:L1-L87`). The trusted harnesses share interpreter globals; outline.py uses `_json` imported by tracer.py, so load order is functional (`public/outline.py:L4-L9`). The blocklist is **fetch, XMLHttpRequest, importScripts, WebSocket, WebTransport, EventSource, Worker, SharedWorker, open**. Python worker timers, eval and Function are **not** disabled. Python replaces `__import__` only in the user environment’s builtin dictionary, denying direct roots js, pyodide, _pyodide, pyodide_js and micropip (`public/tracer.py:L147-L156`).

**JavaScript worker:** bundler imports trusted instrumenter/AST/runtime → captures native Function and bound postMessage → inspect/analyze modes return without execution lockdown → create trace and send started → instrument input → replace network list plus setTimeout, setInterval and queueMicrotask → freeze replacement console object → define stdin input function → invoke the captured native Function with a frozen hook facade → post result or error trace (`src/workers/javascript.worker.ts:L1-L81`). `eval`, global `Function`, postMessage, close, performance, storage APIs and all mutable intrinsic prototypes remain available. The AST Promise check is not a capability restriction on global Promise.

**Confirmed bypasses, scoped honestly:** importing builtins then calling its original importer loads the browser js bridge; an actual Python browser-worker probe printed True for callable bridge.postMessage. A second real-Pyodide harness probe caught BaseException around the private safety exception: a 100-step request returned 99 steps, truncated:false, error:null and no captured final stdout even though execution continued into the catch. The user’s handler intercepted the trace-limit exception, so the outer harness never marked the result incomplete (`public/tracer.py:L13-L14,L121-L124,L164-L169`). This probe used the same tracer in Node Pyodide; the bridge bypass itself was verified in the browser. Direct named network calls stayed blocked in this audit; no external egress bypass was attempted. JS Function dynamically executes uninstrumented code, postMessage can forge protocol messages, and a single forged started let a bounded 13.5-second body finish with a trace after **13,851 ms** instead of triggering the outer 12-second rejection. Continuous reset is a code-supported extension of the same defect and was not stress-tested. This is an educational browser execution boundary, not a defensible adversarial sandbox.

## 4. Visualizer Detection & Rendering Engine (`detectVisualModels`)

### Exact precedence and ownership

Scopes are visited **nearest non-module call frame first**, then older frames, then globals. Each frame combines globals with its locals for pointer/companion context, but iterates its own locals. Claimed heap refs prevent multiple specialized models for aliases; primitive IDs include scope/name. DSU recognition runs before the general own-variable loop **in each scope** (`src/lib/visualizer/detectors.ts:L340-L408`).

| Order | Branch / model | Actual evidence and early-exit behavior | Source |
| --- | --- | --- | --- |
| 1 | DSU prepass | Own `parent` or `p` nonempty integer sequence plus same-length rank/size; traverses parents with cycle/bounds guards; claims companion refs | `src/lib/visualizer/detectors.ts:L360-L401` |
| 2 | Bitmask | Safe integer / decimal string / special bigint plus source bitwise evidence for variable name; BigInt conversion; current-line masks/shift | `src/lib/visualizer/detectors.ts:L409-L441` |
| 3 | String buffer | Every remaining string, regardless of semantic role; language-specific char splitting; pointer/window attachment | `src/lib/visualizer/detectors.ts:L442-L457` |
| 4 | Trie | Root field or object ref; TrieNode type, children mapping or single-character reference edges; terminal/class evidence; BFS 80 | `src/lib/visualizer/detectors.ts:L277-L337,L459-L467` |
| 5 | Set pool | Object type set/frozenset; current-line operation name substring | `src/lib/visualizer/detectors.ts:L468-L484` |
| 6 | Hash table (dictionary bucket form) | Entries/fields with no buckets field; chains plus bucket/name/type or pair evidence; total collision entries 80 | `src/lib/visualizer/detectors.ts:L485-L502` |
| 7 | Resolve collection storage | Native sequence/Queue variants or fields items/heap/data/queue/elements/buckets/values/arr/array/_heap; collection prefix 80 | `src/lib/visualizer/detectors.ts:L503-L515` |
| 8 | Binary heap | heapq name evidence, MinHeap/MaxHeap/PriorityQueue class/type, or heap/priorityqueue variable-name substring; min/max name heuristic | `src/lib/visualizer/detectors.ts:L517-L538` |
| 9 | Queue / deque | deque/Queue types, queue/deque names, or front-removal/front-insertion source methods; front 0/rear len−1; circular label by substring | `src/lib/visualizer/detectors.ts:L539-L562` |
| 10 | Stack | LifoQueue, exact stack/st name, or exclusively append/push/pop methods with no DP evidence | `src/lib/visualizer/detectors.ts:L563-L573` |
| 11 | Segment tree / Fenwick | Numeric elements plus allocation heuristic or global low-bit expression and recognized tree/bit/fenwick/ft name; uses n/N/capacity-derived layout | `src/lib/visualizer/detectors.ts:L574-L647` |
| 12 | DP matrix | All elements reference sequences plus source write hint; 80-cell shared budget; limited integer-expression active/dependency evaluation | `src/lib/visualizer/detectors.ts:L648-L691` |
| 13 | Interval set | Every row is two numeric values; no matrix/grid/dp/bucket/hashtable name or DP hint; all start≤end | `src/lib/visualizer/detectors.ts:L692-L709` |
| 14 | Hash table (sequence bucket form) | Every row sequence plus bucket/hashtable name or all rows empty | `src/lib/visualizer/detectors.ts:L710-L718` |
| 15 | Generic sequence | No row references sequence; pointers/window attachment | `src/lib/visualizer/detectors.ts:L719-L730` |
| 16 | Legacy fallback | Runs detectStructures across all collected own-scope values; excludes claimed refs | `src/lib/visualizer/detectors.ts:L733-L742` |
| 17 | Scalar fallback | Only when there are no primary models; takes 80 unclaimed primitive/special scalar values | `src/lib/visualizer/detectors.ts:L743-L771` |
| 18 | Presentation priority + overlays | Specialized models sort before sequence/string/legacy; only first 6 primaries; append windows of visible models | `src/lib/visualizer/detectors.ts:L758-L773` |

Within legacy, linked shapes win over adjacency graphs; adjacency wins over sequence classification; sequences become matrix, name-based heap, queue, stack or array; native sets then maps follow. Field-based linked precedence is left/right → neighbors/children → next (`src/lib/structures.ts:L36-L40,L105-L150`). SlidingWindowOverlay is embedded in sequence/string views; the additional top-level WindowModel renders null in RenderModel (`src/components/visualizer/AlgorithmCanvas.tsx:L30-L82`; `src/components/visualizer/renderers/shared.tsx:L77`).

### Heuristics that misfire on real DSA source

- **Regex evidence is not the AST:** sourceHints strips comments/strings using regex, then scans simple identifier.method calls, bracket writes, bit operators, allocation multiplication and DP expressions. It does not resolve lexical scope, regex literals, methods reached through aliases, nested argument parentheses, Python f-string expressions, or template interpolation. A method name in one function can influence a same-named variable in another; DP’s “nested” gate only counts two loop keywords anywhere, not actual nesting (`src/lib/visualizer/detectors.ts:L128-L198`).
- **Stack false positive:** an array used only with push/append, even without pop, qualifies as stack. Construction of output/result lists can be depicted as a stack. Indexed reads do not exclude it; mixed indexed writes or sort/splice do (`src/lib/visualizer/detectors.ts:L142-L159,L563-L572`). Queue.name evidence can override actual use and circular status is merely a label (`src/lib/visualizer/detectors.ts:L539-L559`).
- **Intervals false positive:** coordinate points or a numeric two-column table such as `[[1,2],[3,4]]` becomes intervals if its name lacks the small denylist. Descending endpoint pairs fall back instead of being interpreted as an explicit interval orientation (`src/lib/visualizer/detectors.ts:L692-L709`).
- **Heap inference is not heap proof:** any heap-named list is drawn as a complete heap, no ordering check is performed, max/min is inferred from text, and arbitrary JS class names are not preserved by the serializer (generic object type). Valid custom heaps under an unrelated name can be missed (`src/lib/visualizer/detectors.ts:L517-L535`; `src/lib/javascript/runtime.ts:L67-L75`).
- **DP false negative:** compound writes, bottom-up +1 recurrences, more complex indexing, dependent arrays under another name, one-loop flattened tables and nonlocal dimensions are not generally detected. Only variable/int plus optional one +/− operand is evaluated. Python/JS captured matrix prefixes further limit visible active cells (`src/lib/visualizer/detectors.ts:L175-L187,L267-L275,L648-L687`).
- **Global Fenwick evidence:** one occurrence of x & -x enables interpretation of unrelated tree/bit/fenwick/ft arrays; segment allocation syntax is narrow and inferred n/N may not be the array’s actual domain (`src/lib/visualizer/detectors.ts:L164-L197,L574-L635`).
- **Pointer ambiguity:** generic left/right/i/j etc are attached to every eligible sequence in the current merged scope if numeric and in range. There is no source-level proof that i indexes that array. Sliding windows require inclusive bounds; half-open right/end algorithms and truncated prefixes lose/mislabel windows (`src/lib/visualizer/detectors.ts:L229-L265,L719-L726`).
- **Type/terminal heuristics:** Trie’s children/single-character edges and presence of a terminal field can misclassify application objects; terminal values are tested by JS truthiness, so an object reference representing a non-boolean sentinel looks true. Linked fields left/right/next similarly conflate unrelated object relationships (`src/lib/visualizer/detectors.ts:L277-L317`; `src/lib/structures.ts:L36-L40`).
- **Scalar invisibility / promotion:** when any collection model exists, unclaimed scalars do not get their own card. Six-card priority can hide lower-priority collections with no per-model confidence indicator. Claims are based on identity/evidence, not semantic certainty (`src/lib/visualizer/detectors.ts:L743-L773`).

### Budgets: what 80 actually means

**Logical cells/nodes, not DOM elements.** CELL_CAP=80 and VIEW_CAP=6. Source tracers additionally clip collections 80 and heap128/depth6. String/sequence prefixes are clipped in the detector; DP deducts every row’s visible cell count from one 80 budget; GenericMatrixView also shares one 80 cell budget across rows; hash collision entries share 80; trie/legacy linked/adjacency graph traversal caps nodes 80 (`src/lib/visualizer/detectors.ts:L4-L5,L206-L227,L291,L444,L515,L653-L659`; `src/components/visualizer/renderers/GenericMatrixView.tsx:L8-L21`; `src/lib/structures.ts:L50-L76,L87-L103`). Native/simulated traces honor many upstream caps; a forged local trace is only checked by the weaker schema and can exceed assumptions.

There is **no corresponding global edge cap**. Adjacency graphs may contain 80 neighbors for each of 80 nodes, and StructureView emits a group plus edge line/path and label for each link. A real bounded browser run from valid JSON adjacency produced **80 logical nodes, 6,400 graph edges, and 19,535 elements in that single structure renderer** (`src/lib/structures.ts:L92-L100`; `src/components/structure-views.tsx:L89-L160`). The heap inspector then mounts details contents for every heap object even when the disclosure is closed, multiplying offscreen DOM (`src/components/visualizer.tsx:L181-L215`). HeapDualView and SegmentTreeView intentionally render the same data in SVG and array/table forms, so 80 items also does not mean 80 DOM objects (`src/components/visualizer/renderers/HeapDualView.tsx:L28-L97`; `src/components/visualizer/renderers/SegmentTreeView.tsx:L20-L65`).

### Recursion virtualization and scrubbing cost

All call nodes are built from the full trace and laid out once per result/language using useMemo. The renderer culls node centers outside viewport bounds plus horizontal 180/vertical 100 overscan, except that **every currently active frame is retained even outside the viewport**. Edges are retained when their bounding segment extents intersect viewport bounds. The scene is therefore virtualized for drawing, but its model and layout are complete (`src/components/recursion-tree.tsx:L7-L47,L50-L74`). There is no 80-call aggregate budget and no maximum visible-edge budget. Mutual recursion between different function names is not recognized by the direct parent.func==child.func condition, so some genuine recursive call graphs produce no tree (`src/components/recursion-tree.tsx:L44-L49`).

DiagramViewport measures via ResizeObserver and window resize, chooses fit scale clamped 0.6–1.25, allows zoom 0.25–2, follows current frame by assigning scroll positions, and stores scroll in React state (`src/components/diagram-viewport.tsx:L18-L61,L91-L106`). Each cursor or scroll event still scans begun/all calls for visibility and edges; focus-follow can add a second state update. The legacy graph/tree layout recreates positions per render and repeatedly uses find/some; dense graphs add thousands of SVG reconciliations. AlgorithmCanvas memoizes sourceHints by code/language and models by current Step/hints, **so models recompute for every new scrubbed step** (`src/components/visualizer/AlgorithmCanvas.tsx:L85-L104`; `src/components/structure-views.tsx:L27-L67`). JSON.stringify-based changed checks, all mounted heap detail rows, Monaco decorations and 160–180 ms motion transitions add work (`src/components/visualizer.tsx:L103-L118,L149-L215`; `src/components/code-editor.tsx:L158-L216`; `src/components/visualizer/renderers/shared.tsx:L59-L98`).

The performance scripts measure 5,000-step synthetic timeline fixtures, but they are not CI gates, do not model dense graph edges, and largely mutate a tick variable while structure topology stays fixed (`scripts/measure-scrubbing.mjs:L6-L65`; `scripts/measure-visualizers.mjs:L5-L143`). No fresh full performance benchmark or mobile frame-time guarantee is asserted by this report. The dense graph probe is a cardinality measurement, not an FPS measurement.

## 5. Backend, AI Pipeline & Rate-Limiting Audit (`/api/analyze`)

### Exact API admission flow

Runtime is nodejs and duration 25 seconds in both route export and vercel.json. All JSON responses use Cache-Control:no-store (`src/app/api/analyze/route.ts:L11-L20`; `vercel.json:L6-L9`).

1. GET calls aiReadiness with the first x-forwarded-for value, trimmed/clipped 100, or local. A not-ready reason is returned as **HTTP200 with configured:false**; status code alone is not a readiness verdict. GET does not invoke a provider but can write the shared store.
2. POST requires content-type containing application/json (415 otherwise). A numeric Content-Length >200,000 is rejected 413.
3. Actual body is streamed, counted, cancelled if >200,000 bytes, then copied into one Uint 8Array and decoded/JSON-parsed. This catches a lying/missing length header but stores chunks plus a combined buffer and decoded text. There is no explicit body-read deadline before Vercel’s platform duration (`src/app/api/analyze/route.ts:L22-L49`).
4. Mode analysis chooses adviceRequestSchema; simulate chooses simulationRequestSchema; absence chooses enrichment schema. Unknown supplied modes fail strict schema validation. Invalid inputs return 400.
5. Identity-bearing requests recompute server SHA-256 and reject mismatch400 before Redis/provider calls. No identity field is accepted for enrichment.
6. providerStatus requires AI_ENABLED=true, nonempty key/model, a supported provider, valid optional base URL, and structurally valid Redis config. Not configured throws a friendly AIControlError 503.
7. takeSharedLimit performs client admission; global/day ceilings are also checked. Reject 429 on exhausted budget, fail 503 on missing/invalid/unreachable store.
8. Dispatch to advice, simulation or enrichment. Every generation attempt separately reserves global/day budget, including its single allowed validation retry. No automatic SDK retry is allowed.
9. AIControlError returns source:static, code, reason and error with status 503/429 and optional Retry-After. Other thrown errors become generic request-read 400; therefore an unexpected internal programming error can be misclassified as bad client input (`src/app/api/analyze/route.ts:L50-L89`).

**Validation precision:** enrichment limits source 30,000; Python/JS only; functions≤40, name≤100, parameters≤30 of≤160; sampled steps≤32, index 0–4999, bounded event/name and positive lines. It does not require function/step lines to exist, endLine≥line, or function names to match a freshly parsed AST (`src/lib/ai/analyze.ts:L23-L52`). Advice requires source identity, mode analysis, Python/JS, entries≤40, and entry lines within source; Entry’s explanatory strings are not individually bounded. Simulation requires source identity, cpp/java, consent literal true, and maxSteps 100–5,000 (`src/lib/ai/phase3.ts:L17-L38`; `src/lib/analysis.ts:L7-L26`). Bodies cap aggregate request size, but metadata is still caller-asserted.

### Shared Redis admission: exact Lua

The implementation uses **custom Redis REST EVAL**, not @upstash/ratelimit. The verbatim script constant contents are (`src/lib/ai/rate-limit.ts:L7-L25`):

```lua

local mode = ARGV[1]
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
local g = tonumber(redis.call('GET', KEYS[2]) or '0')
local d = tonumber(redis.call('GET', KEYS[3]) or '0')
if d >= tonumber(ARGV[4]) then return {2, tonumber(ARGV[5])} end
if g >= tonumber(ARGV[3]) or (mode ~= 'call' and c >= tonumber(ARGV[2])) then
  return {0, math.max(redis.call('PTTL', KEYS[1]), redis.call('PTTL', KEYS[2]), 1)}
end
if mode == 'client' then
  redis.call('INCR', KEYS[1]); if c == 0 then redis.call('PEXPIRE', KEYS[1], 60000) end
elseif mode == 'call' then
  redis.call('INCR', KEYS[2]); if g == 0 then redis.call('PEXPIRE', KEYS[2], 60000) end
  redis.call('INCR', KEYS[3]); if d == 0 then redis.call('PEXPIRE', KEYS[3], tonumber(ARGV[5])) end
elseif mode == 'check' then
  -- Verify the same write permissions as reservation without consuming any quota.
  redis.call('INCR', KEYS[4]); redis.call('PEXPIRE', KEYS[4], 1000); redis.call('DEL', KEYS[4])
end
return {1, 0}
```

HTTP call shape (`src/lib/ai/rate-limit.ts:L69-L98`), with symbolic values rather than credentials:

```text
POST <UPSTASH_REDIS_REST_URL>
Authorization: Bearer <UPSTASH_REDIS_REST_TOKEN>
Content-Type: application/json
cache: no-store; redirect: error; timeout: 2000ms
["EVAL", LIMIT_SCRIPT, "4",
 "{<namespace>:<VERCEL_ENV>}:client:<HMAC-SHA256(client)>",
 "{<namespace>:<VERCEL_ENV>}:global",
 "{<namespace>:<VERCEL_ENV>}:day:<YYYY-MM-DD UTC>",
 "{<namespace>:<VERCEL_ENV>}:probe:<HMAC-SHA256(client)>",
 "client|call|check", "5", "10", "<AI_DAILY_LIMIT>", "<ms to UTC midnight>"]
```

Constants: client 5/minute, global 10 provider calls/minute, default daily 100 (`src/lib/ai/rate-limit.ts:L3-L5`). Minute keys are first-hit fixed windows with60,000 ms TTL, not sliding windows. Daily keys contain UTC date and expire at the next UTC midnight. All keys share a Redis hash tag containing a stable application namespace plus production/preview/development, and deployment URL/ID is never involved. Credentials are required; endpoint validates HTTPS except local HTTP in development, rejects embedded credentials/query/hash, validates namespace 1–80 allowed characters, environment enum and a positive safe-integer daily limit (`src/lib/ai/rate-limit.ts:L27-L57`). Client identifiers are HMACed with the Redis token, avoiding raw IP keys; rotating the token changes client buckets but preserves global/day names.

A successful check performs INCR → PEXPIRE 1000 → DEL on the probe key to exercise write permissions without spending quota. A client admission increments only client; call increments only global+day. Atomic EVAL prevents concurrent global/day overshoot under normal Redis semantics. The response must be a two-element result [0/1/2, finite nonnegative waitMs]; HTTP errors, malformed JSON/results, timeout, denied Lua/write or redirect all become limiter_unavailable 503, with no raw service details. Day/minute denial becomes 429 with rounded-up retry seconds (`src/lib/ai/rate-limit.ts:L99-L139`). There is no fail-open local fallback, quota refund, namespace-per-instance variation or automatic daily-budget reset command.

**Limits of the guarantee:** a readiness check is a point-in-time check, not a reservation. Another request can consume the remaining budget before POST or retry; every provider reservation rechecks atomically and fails closed. Reservations can be charged before the model constructor or outbound request succeeds and are deliberately not refunded. A request counter is not a monetary/token cap, and configured model choice is unconstrained by cost. GET itself has no client/global admission increment and can generate unbounded probe writes while quota remains.

### Provider dispatch and generation pipeline

LLM_PROVIDER supports openai, openai-compatible, anthropic and google; LLM_MODEL and server LLM_API_KEY supply model selection/auth. Google and Anthropic use their SDKs; OpenAI-compatible uses chat, OpenAI uses the normal provider model method. Optional LLM_BASE_URL is applied only to OpenAI providers (`src/lib/ai/analyze.ts:L54-L132`). Names are not hardcoded. Google generation requests portable minimal reasoning; provider schemas remove numeric/string/array bounds from outgoing JSON Schema, while local Zod validation retains them (`src/lib/ai/generation.ts:L8-L26`; `src/lib/ai/output-schema.ts:L4-L34`). This improves provider compatibility but makes client-side/server-side validation, not provider enforcement, responsible for those bounds.

Both enrichment and phase 3 have **one total 18-second AbortSignal deadline**, maxOutputTokens 3500, maxRetries 0, and at most two generation attempts. A validation failure can retry once with compact, sanitized feedback; invalid references produce trusted AIOutputError feedback, Zod feedback includes restricted paths/codes, and output truncation requests smaller JSON (`src/lib/ai/analyze.ts:L144-L190`; `src/lib/ai/phase3.ts:L48-L78`; `src/lib/ai/generation.ts:L14-L26`). A slow first attempt can leave insufficient time for retry. Store timeout and provider timeout have distinct safety purposes, and client POSTs use 24 seconds inside the platform 25-second allowance.

Quota classifier examines statusCode 429 or structured RESOURCE_EXHAUSTED / error.code 429 through at most five cause/lastError levels. Quota throws provider_quota 429 with “AI notes are paused: provider quota reached” and does not retry. Top-level APICallError 401/403→provider_auth503,404→provider_model 503,400/422→provider_request 503,other→provider_unavailable 503; these also do not retry. Nested non-quota API failures are not explicitly traversed by throwProviderFailure, so wrapper shapes outside the tested SDK paths are a residual retry-classification risk (`src/lib/ai/provider-quota.ts:L3-L30`; `src/lib/ai/generation.ts:L29-L59`). No raw upstream error is exposed.

### Output contracts

**Enrichment, verbatim** (`src/lib/breakdown.ts:L164-L195`):

```typescript
export const enrichmentSchema = z
  .object({
    summary: z.string().min(1).max(1200),
    pattern: z.string().min(1).max(100),
    functions: z
      .array(
        z
          .object({
            name: z.string().min(1).max(100),
            line: z.number().int().positive().max(30000),
            purpose: z.string().max(600),
            returns: z.string().max(500),
          })
          .strict(),
      )
      .max(40),
    annotations: z
      .array(
        z
          .object({ line: z.number().int().positive().max(30000), text: z.string().max(500) })
          .strict(),
      )
      .max(100),
    stepNotes: z
      .array(
        z
          .object({ index: z.number().int().nonnegative().max(4999), text: z.string().max(400) })
          .strict(),
      )
      .max(32),
  })
  .strict();
```

After schema parse, each returned function name/start line must match a supplied function, each annotation line must exist in source, and each step-note index must belong to sampledSteps. Duplicate/conflicting notes and semantic explanation truth are not checked (`src/lib/ai/analyze.ts:L172-L183`). AI note text is separate from the AST-derived outline.

**Analysis/advice, verbatim** (`src/lib/analysis.ts:L141-L177`; argumentSchema is int −10,000…10,000, list≤128 of those ints, or string≤128):

```typescript
export const adviceSchema = z
  .object({
    summary: z.string().min(1).max(1200),
    issues: z
      .array(
        z
          .object({
            line: z.number().int().positive(),
            severity: z.enum(['bug', 'edge-case', 'suggestion']),
            message: z.string().min(1).max(600),
          })
          .strict(),
      )
      .max(12),
    optimization: z
      .object({
        code: z.string().min(1).max(30000),
        explanation: z.string().min(1).max(1200),
        lines: z.array(z.number().int().positive()).min(1).max(30),
      })
      .strict()
      .nullable(),
    tests: z
      .array(
        z
          .object({
            name: z.string().min(1).max(120),
            entry: z.string().min(1).max(100),
            line: z.number().int().positive(),
            argument: argumentSchema,
            expectedOutput: z.string().max(2000),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();
```

Issue and optimization lines must exist; every proposed test must match supplied entry name/start line, have no unsupported reason, and use an allowed input kind. Expected output is explicitly conjectural. Client tests are executed by real workers before rerun controls appear, but observed output is **not compared to AI expected output as a correctness oracle**. Proposed optimization is shown as source diff/proposal rather than accepted as tested code (`src/lib/ai/phase3.ts:L89-L130`; `src/components/analysis.tsx:L193-L228,L458-L597`).

**Simulation contract summary** (`src/lib/ai/simulation.ts:L3-L62`):

| Field | Exact constraints |
| --- | --- |
| Value | null /boolean /finite number with safe-integer check when integral /string≤200 /strict `{ref:string≤100}` |
| Variable record | Keys≤100 characters; at most 80 properties |
| Frame | Strict id 1–100, func≤100, positive integer line, bounded locals |
| Heap object | Strict type≤100; optional items≤80, entries≤80 pairs, bounded fields, truncated boolean |
| Step | Strict nonnegative integer index; positive line; event enum; func≤100; stack≤80; bounded globals; heap≤128 with keys≤100; stdout≤20,000; explanation≤400 |
| Trace | Strict steps 2–5,000; truncated boolean; error nullable string≤2,000; elapsed literal 0 |

**Structural validator:** validates source lines/contiguous indices, unique pushed frame IDs and exact expected stack IDs/functions, current func matching top frame, one push per call and one pop after return, cumulative stdout, all own heap refs resolving within the same snapshot, no steps after root return, initial module call, and balanced end unless truncated. It tags accepted traces ai-simulated. The complete 47-line function is pasted in section 8 (`src/lib/ai/simulation.ts:L63-L109`). It does **not** execute C++/Java or verify branch outcomes, values, stdout against source, heap types, exception termination semantics, alias stability across snapshots, or elapsed truth beyond literal 0. A fabricated balanced module call/return with impossible global value and invented output was accepted in an audit probe; this is expected structural-only validation, and the persistent UI label is essential.

### CSP, cache headers and static catalog deployment

Exact CSP (`next.config.ts:L22-L30`):

```text
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Other headers are nosniff, strict-origin-when-cross-origin referrer policy, X-Frame-Options DENY, and disabled camera/microphone/geolocation. CSP covers all paths and permits same-origin runtime/model assets plus blob workers. It intentionally allows inline scripts/styles and eval/WASM. This is not nonce/hash script hardening; untrusted text is normally rendered as React text, while RootLayout deliberately injects the static inline intro watchdog (`src/app/layout.tsx:L20-L24`). Actual worker Function/eval reachability confirms that compatibility allowances are meaningful. No arbitrary external browser connect-src is enabled; server-to-provider fetch is not governed by browser CSP.

Content-addressed `/pyodide/<16hex>/...`, `/monaco/<16hex>/...`, and `/language-detection/<16hex>/...` receive one-year immutable cache headers; runtime-assets.json uses no-cache. HashFiles SHA-256-hashes package directory names and bytes, truncates to 16hex, copies trusted assets, and writes matching browser/build manifests. There is no runtime SRI verification of downloaded bytes; content-addressed naming is cache invalidation, not an independent authenticity guarantee (`scripts/copy-runtime.mjs:L3-L47`; `next.config.ts:L33-L41`). The webpack language-detection ContextReplacementPlugin hardcodes internal chunk 979.js, creating an upgrade-sensitive package-layout dependency (`next.config.ts:L3-L11`).

Library repository selects the checked-in JSON **before opening SQLite** when VERCEL=1 or CODELENS_STATIC_LIBRARY=1. It is an explicit mode selector, not catch-on-database-failure fallback. Outside that mode a missing DB becomes recoverable 503. Local reads open/close DatabaseSync per call; lookups are parameterized; static lookup filters/sorts all revisions and parses the found implementation. ETag is set on individual code responses but If-None-Match is not handled to produce 304. Static index is returned directly without runtime schema/hash recomputation (`src/lib/library-repository.ts:L6-L79`; `src/app/api/library/route.ts:L10-L38`).

Catalog maintenance stores immutable revision rows and fixture fingerprints in SQL, preserves historical implementations, and exports all revisions plus source manifest. Compiler executes only repository-authored reference demos, verifies independent expected values, and refuses programs >30,000 characters. Fresh prebuild verification passed during this audit; every protected reference/fixture and generated catalog is unchanged (`library/schema.sql:L29-L51`; `scripts/seed-library.ts:L69-L103`; `scripts/compile-library.py:L14-L45`; `scripts/verify-library.mjs:L4-L9`).

**Deployment limitations:** Vercel function duration 25 is set, but Node 24 is a package engine/project requirement, not a vercel.json runtime version pin. Existing source supports production/preview namespace isolation; actual hosted env/team/Firewall configuration was not mutated or re-audited here. Bot protection is documented dashboard guidance; no BotID verification/auth gate exists in the analyze route. `check:env` validates names/value shapes, not credential validity, Redis EVAL permission, provider account quota, deployed env inclusion or dashboard billing state (`scripts/check-env.mjs:L51-L109`; `src/app/api/analyze/route.ts:L22-L80`; `docs/DEPLOYMENT.md:L131-L143`).

## 6. Test Suite & Coverage Gap Analysis

### Corrected current counts and evidence provenance

The requested **508 unit /35 Playwright** figures are stale. This commit contains **587 expanded unit cases in 17 files** and **55 Playwright cases in 9 files**. A fresh `npx vitest run --reporter=json` audit run passed **587/587, zero failures**. Fresh `npx playwright test --list --reporter=json` verified the 55-case inventory. The previous maintenance pass at this same source revision reported 55/55 production Playwright passes, plus passing lint/typecheck/build; the complete 55-case suite and production build were **not rerun during this read-only audit**. Bounded new browser probes used the existing production build, with AI disabled/intercepted and no provider calls. No line/branch coverage percentage is available; Vitest has no configured coverage gate (`vitest.config.ts:L5-L6`).

### Unit files: exact case counts and assertion themes

| File | Expanded cases | What is asserted |
| --- | --- | --- |
| tests/ai-controls.test.ts | 29 | Default-off flag; missing/invalid provider/Redis configuration; read/write readiness without spending; environment isolation; concurrent daily ceilings/UTC reset; charged retries; unreachable/HTTP/malformed store fail-closed behavior. |
| tests/ai-readiness.test.ts | 6 | GET without source/POST; specific daily pause; null/missing/string-boolean body rejection; transport diagnostic secrecy. |
| tests/analysis.test.ts | 32 | Source/hash identity; Python/JS inspection and isolated drivers; typed arguments and refusal rules; AST complexity candidates; real-only line heatmaps; growth fits; simulated safe integers, dangling/inherited refs and stack constraints. |
| tests/analyze.test.ts | 8 | Client/global ceilings; streamed/request size limits; no-key fallback; storage fail-closed; real fixture-provider generation, malformed output retries and source/step reference rejection. |
| tests/catalog.test.ts | 3 | 309-entry hierarchy uniqueness/linkage; topic/technique/name search and empty results; runnable featured mapping to bilingual samples. |
| tests/detectors.test.ts | 19 | All specialized families; language-specific indexing/pop semantics; scoped pointers/alias deduplication; malformed DSU/cycle handling; DP dependencies; name/source evidence exclusions; caps and no frame mutation. |
| tests/editor-colors.test.ts | 5 | CSS RGB/hex normalization into Monaco-compatible color values and fallback cases. |
| tests/google-ai.test.ts | 14 | Actual installed SDK against local HTTP fixtures: env-selected model/AI Studio header, minimal reasoning, five provider error statuses, advice and C++/Java validation feedback, no quota retries, oversized output rejection and RESOURCE_EXHAUSTED detection. |
| tests/intro.test.ts | 1 | Weighted real readiness reaches 100 only when all four flags are complete; does not by itself exercise browser timing/focus. |
| tests/javascript.test.ts | 28 | 17 sample programs plus source attribution, exception/finally origins, undefined throws, constructor/special primitive snapshots, aliases/cycles/Map/Set, recursion IDs/returns, loop cap, async rejection and labels/destructuring. |
| tests/language-detection.test.ts | 29 | Supported snippets, short/ambiguous/unsupported detection, confidence/margin mapping, manual/source-origin protection, stale revisions, execution lock and one-time auto-switch eligibility. |
| tests/library.test.ts | 348 | 343 actual reference/featured implementation fixtures executed in Pyodide or instrumented JS; catalog/identity/API cases, SQL idempotency/history, recoverable missing DB and independent deterministic algorithm oracle script. |
| tests/outline.test.ts | 22 | 17 bilingual sample cases plus nested functions/parameters/returns/recursion; no pseudo-loop comments/strings; nonexecuting AST parsing and syntax diagnostics. |
| tests/phase 3-ai.test.ts | 6 | Entry-line validation before spend; one reference retry; two-invalid-output fallback; one total 18s deadline; consent/language/hash rejection; malformed simulation stack rejection. |
| tests/share.test.ts | 5 | Compressed JS/stdin and Unicode roundtrips; corrupt/invalid payload rejection; C++/Java source sharing without consent/execution state. |
| tests/structures.test.ts | 5 | Legacy arrays/matrices/queues/stacks/maps/sets/heaps and aliases; cyclic links, tree/dictionary leaves, adjacency/neighbors and per-call recursion returns. |
| tests/tracer.test.ts | 27 | 17 Python examples plus Queue variants/slotted nodes, line/output fidelity, aliases/mutations, real recursion, bounded loop, runtime/syntax errors, stdin/run isolation, large values and direct js-import denial. |

`tests/library.test.ts` contributes 348/587 cases (59.3%);343 are per-implementation execution fixtures (58.4% of all unit cases). Passing broad demo coverage is valuable, but the headline test count is not equivalent to 587 independent adversarial scenarios. The independent `scripts/check-library-algorithms.py` subprocess runs **5,429 deterministic oracle/edge checks** inside one Vitest case; those are neither additional Vitest cases nor proofs for all 309 algorithms on all domains. The fixture helper `tests/shared-store-fixture.ts` is not a test file.

### Browser files: exact cases and behavior covered

| File | Cases | Coverage |
| --- | --- | --- |
| tests/e 2e/ai-controls.spec.ts | 4 | Fresh readiness before upload; provider 429 no retry/local fallback; missing limiter reason; daily pause refresh. |
| tests/e 2e/library.spec.ts | 3 | Nonfeatured Python references; featured load/failure/edit safety; delayed fetch cannot overwrite a new draft. |
| tests/e 2e/loading-sizing.spec.ts | 2 | Graph/tree fit/zoom/theme on pane resize; large recursion follows active call during zoom/resize. |
| tests/e 2e/navigation.spec.ts | 4 | Topic/subtopic/global search; blank new draft/undo; cancellable repeated runs; ten newer bilingual examples. |
| tests/e 2e/opening-detection.spec.ts | 16 | SSR inert intro/minimum/real readiness; refresh/new-tab; three skip inputs; reduced motion/focus/mobile; Monaco/hydration stall escapes; four supported languages; manual authority; short/unsupported/sample/share guards; actual same-origin model worker/no upload. |
| tests/e 2e/phase-three.spec.ts | 9 | Measured steps/hashes/heatmaps/keyboard/mobile; Python typed generators; real-worker verification of AI proposals; stale edits/failing tests; per-run simulation consent/share label; quadratic fit/cap refusal; invalid traces; loaded library identity; production CSP/cache/static catalog. |
| tests/e 2e/phase-two.spec.ts | 6 | Seven original JS examples; offline AST/source-line synchronization; stdin/errors/caps/network blocks; data structures; recursion>200 calls; AI notes/invalid-response fallback. |
| tests/e 2e/workspace.spec.ts | 5 | Original Python flow/playback/breakpoints/share; seven examples; stdin/errors/infinite-loop/stop recovery; accessible themes/menu/design/mobile; named worker-network APIs blocked. |
| tests/visualizers.spec.ts | 6 | Palindrome pointers, stackTOP, heapq dual view, XOR register, specialized JS structures, DP/scalar accessibility in both themes/mobile. |

Playwright uses **Desktop Chrome**, one worker by default, no server reuse, a production `next start`,120s test timeout and 60s expect timeout. Mobile tests change viewport/emulate selected conditions within that project; there are no separate WebKit/Firefox projects. CI installs the lockfile on Node 24/Python 3.12, type-generates Next types, runs lint/typecheck/unit tests, installs Chromium, and builds/tests static-catalog mode with a nonexistent SQLite path. CI has AI_ENABLED=false, so real provider/Redis credentials are intentionally absent (`playwright.config.ts:L7-L25`; `.github/workflows/ci.yml:L18-L51`). Branch-protection/Deployment-Check enforcement is external and unverified here.

Google tests instantiate the installed provider SDK, but `tests/google-ai.test.ts:L53-L94` replaces global fetch and returns synthetic HTTP response objects. Some other provider/store fixtures use local HTTP servers. None is a live free-tier quota or provider-model reliability test.

### Optimistic fixtures and untested boundaries

| Gap | Why current tests can miss it | Required diagnostic/regression direction |
| --- | --- | --- |
| Worker protocol authenticity / hard deadline | JS unit runner directly calls instrumented Function and never uses CodeRunner protocol; existing browser tests only check named network APIs and ordinary infinite loops | Add real browser tests for fabricated result/started/outline/inspection messages, immutable absolute deadline and message-source isolation; `tests/javascript.test.ts:L7-L17`, `tests/e2e/workspace.spec.ts:L138-L160` |
| Indirect Python bridge / introspection | The unit case checks only `import js`, which safe_import catches; original builtins importer, sys.modules/frame access and caught private safety exceptions remain | Use real Pyodide browser worker for indirect import/capability tests; `tests/tracer.test.ts:L86-L88`; audit bypass succeeded |
| Actual Redis Lua semantics | Fixture compares EVAL script text then executes a separate JS reimplementation, not Lua; local server serializes handler execution | Run scratch real Redis EVAL concurrency/TTL/ACL tests; mutated Lua can disagree with a still-passing JS fixture; `tests/shared-store-fixture.ts:L21-L62` |
| Real provider variability | AI SDK fixtures validate request shape and failure handling, not model output distribution, latency, quota availability or reasoning support for every model; Google tests specifically stub global fetch and return synthetic Response.json rather than contacting Google | Model-specific, opt-in bounded hosted checks with explicit no-spend/quota policy; never infer external daily quota from a generic free-tier claim; `tests/google-ai.test.ts:L16-L94` |
| Simulation semantic truth | Strict stack/schema fixtures can still be entirely fabricated relative to source | Preserve hypothetical label; independently validate semantics only with a real compiler/runtime if product scope changes; `src/lib/ai/simulation.ts:L63-L109` |
| Global memory / decompression / main-thread validation | Per-snapshot clipping test uses one large array/string; no aggregate trace byte threshold or compressed-bomb test | Measure repeated temporary allocations, filled heaps+stdout, serialization peak, parse/validation long tasks and bounded decompression; `tests/tracer.test.ts:L79-L85`, `src/lib/share.ts:L12-L13` |
| Dense graph / hidden heap DOM | Renderer fixtures mostly sparse/simple;80-node tests do not cap80×80 edge density or closed details contents | Add dense adjacency DOM budgets and frame-time checks with six cards/all heap rows; audit measured 6,400 edges |
| Serializer-to-detector fidelity | Synthetic detector Steps can encode bigint values without runtime n suffix; native object-key traps/default callbacks/function constructors are absent | Compose real runtime snapshots with detector/render assertions, including own __proto__, BigInt, typed arrays, proxies and getter side effects; `tests/detectors.test.ts:L271-L290` |
| Same-source enrichment/run race | Delayed edit tests invalidate code/identity but do not change stdin/maxSteps or rerun the same source while an enrichment POST is pending | Bind enrichment to trace/run identity and test rerun A→A and source A→B→A; `tests/e2e/phase-three.spec.ts:L129-L191` |
| Language-model churn / actual TS code | Pure detection tests validate mapping, not whether mapped TS executes; single model-load e 2e does not stress overlapping ambiguous revisions | Rapid ambiguous edits, model timeout/error/worker recreation, TS annotations, browser memory and stale queue latency; `src/workers/language-detection.worker.ts:L6-L24` |
| Restricted browser storage / lifecycle stress | Axe/viewport tests are not a storage-denial or component leak proof | Blocked localStorage/clipboard, hundreds of tab/edit/remount cycles, live worker/listener count, background-throttled hydration; `src/components/preferences.tsx:L8-L20` |
| Catalog domain completeness | DEMO expected outputs and many deterministic edge checks are strong but finite; most algorithms still have one exported reference demo | Property/oracle tests per algorithm and documented domains, Unicode, negatives, disconnected graphs, deep trees, mutation/state reuse; `tests/library.test.ts:L129-L155`, `scripts/check-library-algorithms.py:L19-L179` |
| Upgrade/clean-clone matrix | One locked toolchain in CI; internal chunk 979.js and native SQLite support are coupling points | Track model-package layout upgrades, Node patch/OS/browser variance, absent install scripts/runtime assets, no cached build assumptions; `next.config.ts:L3-L16` |
| API resource abuse beyond valid calls | Malformed bodies/GET readiness do not consume client/provider quotas; no body-read timeout or app auth/BotID tests | Bound slow streams/readiness traffic before Redis writes with real edge protection; verify platform header trust rather than guessing XFF spoofability; `src/app/api/analyze/route.ts:L17-L49` |

**What is genuinely strong:** all 343 catalog implementation fixtures are executed by real runtimes rather than asserted from handcrafted traces; browser suites exercise actual Python/JS workers, offline parsing, consent, malformed trace rejection, identity safety and a real same-origin detection model. Budget failure is fail-closed and source is not uploaded when the recheck says unavailable. Those strengths do not erase the confirmed adversarial gaps above.

## 7. Adversarial Self-Critique — Top 10 Weakest Points

Severity reflects impact on an educational local-first tool: **P1** requires attention before claiming trace integrity, hard execution limits or dependable availability; **P2** is a material correctness/performance/robustness weakness. No P0 server-compromise claim is made. Share links require a user Run action; no automatic malicious-share execution was demonstrated. Browser-worker code does not possess server provider/Redis credentials.

### 1. P1 — User code can forge a “real” trace and extend the outer watchdog

**Confirmed in the production browser build.** The worker leaves postMessage available while the parent trusts event.data.type without a private authenticated channel/phase guard. A harmless source program sent a valid fake result with globals.forged=777 and stdout FORGED. The UI accepted it, displayed FORGED, enabled playback and attached the editor source hash; no AI POST was made. A separate bounded Function body ran 13.5 seconds and sent started once at 10.5 seconds. The parent rearmed its 12-second timeout; a trace was accepted after 13,851 ms. Repeated reset beyond that is a code-supported risk, not a stress test performed here.

**Locations:** `src/workers/javascript.worker.ts:L5-L7,L26-L40,L62-L79`; `src/lib/runner.ts:L79-L103`; `src/lib/trace.ts:L47-L70`; `src/components/workspace.tsx:L199-L205`.

**Bounded trace-spoof reproduction (Run as JavaScript):**

```javascript
postMessage({
  type: "result",
  result: {
    steps: [{ index: 0, line: 1, event: "line", func: "<module>",
      callStack: [], globals: { forged: 777 }, heap: {}, stdout: "FORGED" }],
    truncated: false, error: null, elapsed: 0
  }
});
```

**Review direction:** separate trusted protocol emission from user-accessible globals, enforce one started transition and an immutable absolute execution deadline, and tighten all local trace bounds/structural validation. A correlation ID alone does not fix this if user code can read it or the same global channel. Test the browser boundary, not just the harness class.

### 2. P1 — Python’s denied bridge import is bypassed through original builtins

**Confirmed in an actual Pyodide browser worker.** safe_import is inserted into a copied builtin dictionary; the real builtins module retains its original importer. Importing that module is allowed. This program completed without error and printed True:

```python
import builtins
bridge = builtins.__import__("js")
print(callable(bridge.postMessage))
```

The bridge exposes the same message channel and other browser capabilities. Direct fetch/XHR remained replaced; this is **not** evidence of successful external network egress. sys.settrace/frame/module introspection also remains accessible and can change tracing behavior.

**Additional confirmed cap-reporting defect:** catching BaseException outside a loop intercepts _TraceLimit before the harness can set truncated. A real Pyodide harness probe with cap100 returned 99 steps, truncated:false and error:null, with final output missing from the captured trace. Execution continued into the handler. The outer worker deadline is the remaining guard; the partial result is mislabeled complete (`public/tracer.py:L13-L14,L121-L124,L164-L169`).

**Locations:** `public/tracer.py:L13-L14,L121-L124,L147-L169`; `public/tracer.worker.js:L48-L63`; `tests/tracer.test.ts:L86-L88`.

**Review direction:** treat this as a capability/isolation design problem. Patching a few import names is insufficient for hostile Python. Narrow product claims or isolate execution under a separate origin/capability environment, and add indirect-import/introspection regression tests. Browser WASM isolation does not automatically provide application-origin isolation.

### 3. P1 — Per-snapshot caps do not provide a total memory budget

**Code-supported risk; worst-case exhaustion was not attempted.** A 5000-step result can repeat 128 objects×80 values plus 80 frames×80 locals and 20,000-character stdout. Python retains every first-seen object even after the user would drop it. JSON serialization, worker transfer, JSON.parse and Zod validation can overlap copies; a worker deadline does not interrupt synchronous validation/rendering on the main thread. Share decode similarly decompresses first, then checks 30,000/10,000 limits, so compressed input can allocate beyond accepted source size.

**Locations:** `public/tracer.py:L21-L22,L46-L54,L103-L112,L187-L188`; `src/lib/javascript/runtime.ts:L33-L140,L235-L242`; `src/lib/runner.ts:L99-L103`; `src/lib/share.ts:L12-L23`.

**Review direction:** add aggregate serialized-byte/object/output-growth budgets, incremental trace delivery or compact deltas, bounded decompression and explicit cancellation during heavy result validation. Measure peak memory on a low-memory browser; do not extrapolate from the single-array clipping test.

### 4. P1 — “80 nodes” permits thousands of edges and tens of thousands of DOM elements

**Confirmed.** One legitimate 80-node dense adjacency graph produced 6,400 edges and 19,535 elements inside one structure renderer. Edge labels/groups are emitted per link, and hidden heap disclosure contents also stay mounted. Six-card limits do not constrain the aggregate, and user-forged local traces bypass many assumed upstream caps. Recursion drawing is culled but active nodes/crossing edges are not hard-capped.

**Locations:** `src/lib/structures.ts:L87-L103`; `src/components/structure-views.tsx:L89-L160`; `src/components/visualizer.tsx:L181-L215`; `src/components/recursion-tree.tsx:L50-L74`.

**Review direction:** enforce edge/DOM budgets independently of logical node counts; show an explicit reduced-detail notice; lazily mount heap contents; consider canvas/density rendering for dense graphs. Performance regressions need changing dense topology, not just a scalar tick in a sparse structure fixture.

### 5. P2 — The JS trace can be structurally valid while missing activations or losing object fields

**Three confirmed defects.** Default-parameter function bodies are never transformed, so a called default callback has no activation; regular function constructors report undefined rather than the constructed instance as return; own __proto__ data fields disappear because fields is an ordinary object. The single module/f call list, divergent return refs h2 versus h1, and own field list [ok] were observed from actual instrumenter/runtime composition. Proxies/custom iterators/toJSON add side effects and silent omissions.

**Locations:** `src/lib/javascript/instrument.ts:L67-L99`; `src/lib/javascript/runtime.ts:L97-L118,L210-L225,L244-L249`.

**Review direction:** expand transformation coverage beyond function bodies, distinguish ordinary constructor invocations, use safe own-property record creation, and test real snapshots rather than handcrafted expected Shapes. Descriptive trace correctness is a separate requirement from correct final stdout.

### 6. P2 — Detector evidence is globally regex-based and BigInt interoperability is broken

**Confirmed BigInt defect; other misclassifications are code-supported.** Runtime emits bigint text with n suffix, but BigInt parsing in the detector expects a decimal literal without it; valid XOR masks fall back to scalars. Source hints conflate same-named variables across scopes, count independent loops as nested, and infer algorithms from names/method subsets. Coordinate pairs can become intervals; append-only lists become stacks; named lists can become heaps without checking heap ordering. Static summary pattern names such as binary search/BFS similarly rely on vocabulary and broad facts.

**Locations:** `src/lib/javascript/runtime.ts:L55`; `src/lib/visualizer/detectors.ts:L128-L198,L409-L440,L563-L573,L692-L709`; `src/lib/breakdown.ts:L97-L140`.

**Review direction:** normalize actual serialized primitives, reuse scoped AST evidence where available, attach confidence/why-detected metadata and offer a generic/manual fallback. Keep rendering truthful about inference. Add negative fixtures using realistic variable naming and compositional runtime→detector tests.

### 7. P2 — Source identity is partial; enrichment is not bound to a specific execution

**Code-supported race.** Advice/simulation use identity, but workers carry none and enrichment only compares code/language. Same-source reruns or stdin changes can leave pending note responses whose indices now refer to another trace. Clearing enrichment at run/input start does not prevent an older response from repopulating it. The server verifies sourceHash against request source, not implementationId against the catalog; the client loader validates advertised hash shape without independently checking it before load.

**Locations:** `src/lib/runner.ts:L123`; `src/components/breakdown.tsx:L74-L110`; `src/lib/store.ts:L130-L139`; `src/components/workspace.tsx:L129-L140,L250-L285`; `src/lib/ai/phase3.ts:L36-L38`.

**Review direction:** distinguish source identity from execution identity (language/input/cap/run epoch), cancel and invalidate enrichment on those changes, and compare source hashes at catalog-load boundaries if provenance matters. Add same-source delayed-response tests; the existing changed-source test is insufficient.

### 8. P2 — Runtime cold starts, automatic detection and bundle coupling penalize editing

**Measured footprint and code-supported workload risk.** Modern initial home JS is 861,867 raw bytes, before lazy editor/runtime loads. The copied Monaco/Pyodide sets total roughly 37.8 MB. Analysis is keyed by the full code string and starts a fresh disposable Python interpreter on each edit while the pane is active, with no analysis debounce. Detection reuses a worker but does not cancel old model inference; its async handlers can overlap. TS maps to JavaScript, although actual TS annotations are rejected by Acorn; the audit confirmed that mismatch. The webpack configuration assumes internal chunk 979.js.

**Locations:** `src/components/workspace.tsx:L38-L46,L845-L858`; `src/components/analysis.tsx:L59-L82`; `public/tracer.worker.js:L10-L47`; `src/components/use-language-detection.ts:L35-L85`; `src/workers/language-detection.worker.ts:L6-L24`; `src/lib/language-detection.ts:L16-L22`; `src/lib/javascript/ast.ts:L20-L25`; `next.config.ts:L3-L11`.

**Review direction:** debounce/cancel AST work with explicit source epochs, separate trusted parse-runtime reuse from unsafe execution workers, bound/serialize model inference, disclose or handle TS syntax, and test upgrades against package internals. The 1.4s intro minimum is deliberate design; it does not solve bootstrap cost. The 1060-line workspace orchestration increases the cost of making these changes safely (`src/components/workspace.tsx:L47-L1060`).

### 9. P2 — AI budgets protect spend better than availability; readiness itself writes Redis without admission

**Code-supported exposure; actual edge Firewall enforcement is unverified.** The public route has no authentication/BotID gate. Valid caller requests can consume the shared provider budget; many GETs can perform write probes without increasing client/provider quota. A provider quota pause is not cached across requests, so after local budget resets GET may report ready even while the provider still rejects calls. Source default daily 100 is not a universal conservative free-provider quota; actual model/project limits can be lower. This is a request budget, not a token/dollar cap.

**Locations:** `src/app/api/analyze/route.ts:L17-L20,L22-L80`; `src/lib/ai/rate-limit.ts:L3-L5,L21-L24,L125-L139`; `src/lib/ai/analyze.ts:L107-L120`; `src/lib/ai/provider-quota.ts:L24-L30`; `docs/DEPLOYMENT.md:L131-L143`.

**Review direction:** verify edge rules for both POST and GET, consider throttled/cached readiness or a shared provider-pause TTL, retain fail-closed reservations, and derive explicit deployed ceilings from verified provider project quotas. Do not introduce client header “bot verified” trust. A read-only audit cannot certify dashboard billing caps or deployed Firewall status.

### 10. P2 — Blocking localStorage can break the entire workspace

**Confirmed in Chromium.** Replacing Storage.getItem with a SecurityError throw caused one unhandled client error and the Run button was no longer visible. PageIntro catches its own preference read, but usePreferences does not; preference writes and media callbacks also lack protection. Storage denial should degrade preference persistence, not the app’s core execution flow. This is especially relevant to restricted embeddings/privacy/storage policies.

**Locations:** `src/components/preferences.tsx:L8-L20,L37-L51`; compare guarded `src/components/page-intro.tsx:L86-L89`.

**Review direction:** isolate persistence access behind a guarded adapter with in-memory fallback, test denied reads/writes, and keep a usable editor/runner after preference failures. Current axe/mobile passes do not exercise browser storage policy.

### Additional diagnostic cautions for the principal review

- **Complexity candidates are assumptions, not proofs.** Loop-depth candidates assume input-bounded constant-cost iterations; the five deterministic profiles, nonnegative affine fits and normalized residual ranking cannot establish asymptotics, average case, amortized analysis or hidden native work. Arbitrary samples are not validated for positive/unique n, so public helper inputs can produce degenerate regressions; current UI sizes are valid. Time/space strings and expected AI test outputs must remain qualified (`src/lib/javascript/analysis.ts:L24-L75`; `public/analysis.py:L36-L57`; `src/lib/analysis.ts:L99-L139`; `src/components/analysis.tsx:L349-L359`).
- **Simulation can “complete” structurally with invented semantics.** A balanced two-step module trace with invented stdout/global value was accepted. That is consistent with the declared hypothetical feature, but must never be presented as measured heatmap/complexity. Real traces reject no corresponding semantic lies at the message boundary (`src/lib/ai/simulation.ts:L63-L109`; `src/lib/analysis.ts:L91-L96`; `src/components/visualizer.tsx:L40-L48`).
- **CSP is intentionally permissive in script execution.** Same-origin connect and script-src-attr none are helpful, but unsafe-inline/unsafe-eval cannot prevent every same-origin script injection if a future component creates an unsafe sink. No dynamic user HTML sink was established in this audit; the known injected HTML is a constant watchdog (`next.config.ts:L22-L30`; `src/app/layout.tsx:L20-L24`).
- **Maintainability is concentrated.** Workspace 1060 LOC, detectors 774, Analysis 597 and globals.css 2301 combine orchestration, policy, layout and feature branches. Unrestricted store patch plus distributed resets makes future invariant changes error-prone. Source comments have largely been stripped; this reduces inline rationale around complex transformations. Protected reference programs retain their documentation, and their text must not be casually reformatted because manifest freshness depends on exact bytes (`src/lib/store.ts:L152`; `src/components/workspace.tsx:L110-L398`; `scripts/library-manifest.mjs:L13-L29`).
- **Small display/lifecycle limitations:** direct-recursion detection misses mutual recursion; fixed cell widths and cropped SVG labels limit large-value accessibility; variable-list/heap formatting recomputes repeatedly; copy timers rely on benign unmount behavior. Monaco subscriptions depend on editor disposal rather than explicit per-listener ownership. These deserve targeted regression tests, not an unsupported claim that memory leaks or WCAG failures were measured (`src/components/recursion-tree.tsx:L44-L49`; `src/components/visualizer/renderers/HeapDualView.tsx:L60-L68`; `src/components/structure-views.tsx:L150-L156`; `src/components/code-editor.tsx:L121-L145`; `src/components/visualizer.tsx:L230-L236`).

**Adversarial audit verdict:** the code has meaningful validation, real-runtime fixture coverage, explicit AI consent/labels and fail-closed spend controls. Its weakest area is the trust boundary between untrusted code and trace/protocol capture, followed by aggregate memory/DOM budgets. The full suite currently passes while concrete trace-integrity, serializer and storage-failure defects remain. Fix those before treating “real trace”, “12 seconds”, “80 nodes” or broad test counts as unconditional guarantees.

## 8. High-Risk Code Snippets

These are **verbatim windows from the audited source**, not rewritten pseudocode. The first is a 50-line portion of the nested transformer inside a 199-line instrumentJavaScript function; the second is the complete 58-line value serializer closure inside snapshot; the third is the complete 47-line structural validator. Imports/surrounding closures are omitted only where necessary to keep each requested excerpt 30–60 lines. Use the cited file/range for full context.

### A. Function rewriting and try/finally frame instrumentation —50 lines

`src/lib/javascript/instrument.ts:L66-L115`. This is where default-parameter function bodies escape transformation, return wrapping alters observed frame state, and constructor tagging is restricted to class constructors.

```typescript
  const transform = (node: AstNode, scope: Scope, parent?: AstNode): AstNode => {
    if (isFunction(node)) {
      const name = functionName(node, parent);
      let body = node.body as AstNode;
      if (body.type !== 'BlockStatement')
        body = {
          type: 'BlockStatement',
          body: [{ type: 'ReturnStatement', argument: body, loc: body.loc }],
        };
      const inner: Scope = {
        names: [...(node.params as AstNode[]).flatMap(bindingNames), ...collect(body)],
        name,
      };
      const original = transformList(body.body as AstNode[], inner);
      const directives: AstNode[] = [];
      while (original[0]?.directive) directives.push(original.shift()!);
      let caught = '__codelens_error';
      while (used.has(caught)) caught += '_';
      const wrapper = statement(
        `try{}catch(${caught}){${hookName}.markException(${caught});throw ${caught};}finally{${hookName}.leave();}`,
      );
      (wrapper.block as AstNode).body = original;
      node.body = {
        type: 'BlockStatement',
        body: [
          ...directives,
          statement(
            `${hookName}.enter(${JSON.stringify(name)},${node.loc?.start.line ?? 1},${getters(inner)},${parent?.type === 'MethodDefinition' && parent.kind === 'constructor'});`,
          ),
          wrapper,
        ],
      };
      return node;
    }
    if (node.type === 'BlockStatement') {
      node.body = transformList(node.body as AstNode[], scope);
      return node;
    }
    if (node.type === 'ReturnStatement') {
      const arg = node.argument
        ? transform(node.argument as AstNode, scope, node)
        : expression('undefined');
      node.argument = {
        type: 'CallExpression',
        callee: expression(`${hookName}.returnValue`),
        arguments: [arg],
        optional: false,
      };
      return node;
    }
```

### B. JS object/value serializer —58 lines

`src/lib/javascript/runtime.ts:L51-L108`. This combines stable IDs, depth/heap clipping, dynamic container operations, special primitives, own-descriptor extraction and mutable plain record creation. Review n-suffixed BigInt interoperability, Proxy/custom-iterator side effects and the __proto__ field loss.

```typescript
    const value = (v: unknown, depth = 0): Value => {
      if (v === null || typeof v === 'boolean') return v;
      if (typeof v === 'number') return Number.isFinite(v) ? v : special('number', String(v));
      if (typeof v === 'string') return v.slice(0, 200) + (v.length > 200 ? '…' : '');
      if (typeof v === 'bigint') return special('bigint', v.toString().slice(0, 200) + 'n');
      if (v === undefined) return special('undefined', 'undefined');
      if (typeof v === 'function') return '<function>';
      if (typeof v === 'symbol') return String(v);
      if (typeof v !== 'object') return String(v);
      let ref = this.identities.get(v);
      if (!ref) {
        ref = `h${++this.objectCount}`;
        this.identities.set(v, ref);
      }
      if (heap[ref]) return { ref };
      if (Object.keys(heap).length >= 128 || depth >= 6) return '[value truncated]';
      const obj: HeapObject = {
        type: Array.isArray(v)
          ? 'array'
          : v instanceof Map
            ? 'map'
            : v instanceof Set
              ? 'set'
              : 'object',
      };
      heap[ref] = obj;
      if (Array.isArray(v)) {
        obj.items = v.slice(0, 80).map((i) => value(i, depth + 1));
        obj.truncated = v.length > 80;
      } else if (v instanceof Map) {
        obj.entries = [];
        let n = 0;
        for (const [k, item] of v) {
          if (n++ >= 80) break;
          obj.entries.push([value(k, depth + 1), value(item, depth + 1)]);
        }
        obj.truncated = v.size > 80;
      } else if (v instanceof Set) {
        obj.items = [];
        let n = 0;
        for (const item of v) {
          if (n++ >= 80) break;
          obj.items.push(value(item, depth + 1));
        }
        obj.truncated = v.size > 80;
      } else {
        const fields: Record<string, Value> = {};
        const descriptors = Object.getOwnPropertyDescriptors(v);
        const names = Object.keys(descriptors);
        for (const key of names.slice(0, 80)) {
          const descriptor = descriptors[key];
          fields[key] = 'value' in descriptor ? value(descriptor.value, depth + 1) : '[accessor]';
        }
        obj.fields = fields;
        obj.truncated = names.length > 80;
      }
      return { ref };
    };
```

### C. Simulated trace structural validation —47 lines

`src/lib/ai/simulation.ts:L63-L109`. The validator proves internal structure/reference consistency within its schema; it cannot prove that source execution would yield the supplied values/output. The root balance, call/return transition order and own-property reference check are the essential invariants.

```typescript
export function validateSimulation(output: unknown, code: string, cap: number): TraceResult {
  const trace = simulatedTraceSchema.parse(output),
    lines = code.split('\n').length;
  if (trace.steps.length > cap) throw new Error('Simulated trace exceeds the requested step cap.');
  let expected: { id: string; func: string }[] = [];
  let previousOutput = '';
  const seen = new Set<string>();
  for (const [i, s] of trace.steps.entries()) {
    if (s.index !== i || s.line > lines || s.callStack.some((f) => f.line > lines))
      throw new Error('Invalid simulated source location or step index.');
    if (s.event === 'call') {
      const added = s.callStack.at(-1);
      if (!added || seen.has(added.id)) throw new Error('Invalid simulated frame push.');
      seen.add(added.id);
      expected = [...expected, { id: added.id, func: added.func }];
    }
    if (
      s.callStack.length !== expected.length ||
      s.callStack.some((f, j) => f.id !== expected[j].id || f.func !== expected[j].func) ||
      s.func !== s.callStack.at(-1)?.func
    )
      throw new Error('Inconsistent simulated call stack.');
    if (!s.stdout.startsWith(previousOutput))
      throw new Error('Simulated stdout must be cumulative.');
    previousOutput = s.stdout;
    const ref = (v: Value) => {
      if (v && typeof v === 'object' && !Object.hasOwn(s.heap, v.ref))
        throw new Error('Dangling simulated heap reference.');
    };
    Object.values(s.globals).forEach(ref);
    s.callStack.forEach((f) => Object.values(f.locals).forEach(ref));
    Object.values(s.heap).forEach((h) => {
      h.items?.forEach(ref);
      h.entries?.forEach((e) => e.forEach(ref));
      if (h.fields) Object.values(h.fields).forEach(ref);
    });
    if (s.event === 'return') expected = expected.slice(0, -1);
    if (!expected.length && i < trace.steps.length - 1)
      throw new Error('Simulated trace continues after the root returns.');
  }
  if (
    trace.steps[0].event !== 'call' ||
    trace.steps[0].func !== '<module>' ||
    (!trace.truncated && expected.length !== 0)
  )
    throw new Error('Simulated trace has no balanced root frame.');
  return { ...trace, origin: 'ai-simulated' };
```

### Reproducibility and unchanged-source ledger

- Audited Git commit: `c1c7888fc7468bb36163aa80f6848eaef649099a`; tree was clean at audit start.
- Fresh unit run:587 passed in 17 files. Fresh browser inventory:55 cases in 9 files. Full production Playwright 55-pass/lint/typecheck/build evidence comes from the immediately preceding maintenance pass at this revision, not a new complete audit run.
- New bounded probes: forged local-worker trace accepted with zero source uploads; Python indirect js bridge import succeeded; catching the private Python safety exception returned an unmarked 99-step partial trace under cap100; one forged started extended a 13.5-second body past the 12-second parent limit;80-node adjacency rendered 6,400 edges /19,535 elements; default callback activation omitted; own __proto__ field lost; function-constructor return reference differed from its instance; BigInt mask rendered scalar; TypeScript syntax rejected; denied localStorage produced unhandled client error and hid/removed the usable Run UI; structurally balanced invented simulation accepted.
- No continuous message flood, memory-exhaustion attack, external network egress attempt, real AI call, live Redis mutation or deployment was made. Local browser workers/bootstrap assets and local HTTP provider/store fixtures were exercised.
- Static catalog source-manifest verifier passed. All application, runtime harness, configuration, reference-program and fixture Git-tracked files are unchanged; only this Markdown dossier is added. Exact byte preservation is checked against the audit baseline and Git diff.
- Private env files, token stores and Vercel environment exports are omitted. Generated local Next preview signing fields appeared in one raw manifest tool response before artifact reads were narrowed to selected fields; those values are not reproduced in this dossier. No provider/Redis credential values were read for this audit.
