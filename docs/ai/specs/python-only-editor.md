# Python-only editor and Run

## Authorization

The owner explicitly requests removing JavaScript from the editor and making Python the only language pasted code can run as, before continuing refactor phases 3A/3B. This is a separate behavior change; no open implementation questions.

## Behavior

- Editor and library language controls offer only Python; Monaco uses Python syntax.
- Example/reference loads use Python. No detection, share or undo path selects the JavaScript runtime.
- Recognized non-Python drafts show an unsupported notice and cannot Run, including keyboard shortcuts. Detection is a finite heuristic, not a guarantee that arbitrary text can be identified; all execution uses Python.
- Old non-Python shares preserve exact source/stdin and original share language, show unsupported and do not execute or load analysis. New Python drafts provide recovery without silent translation.
- Preserve the design, all Python execution/analysis/visualizer features, privacy controls and limits.
- Frozen catalog/export/reference programs and internal JavaScript catalog/golden tooling remain unchanged. Internal dual-language utilities are not selectable editor support.
- Provider adapters, schemas, fixtures and hosted controls are unchanged by this UI/runtime-boundary change.

## Verification

First reproduce the old three-option editor as a failing production browser assertion. Add policy regressions and real-browser checks for Python execution, rejected JavaScript drafts, source-only old shares and Python library loads. Preserve full internal runtime/model/AST/API/share goldens. T0, quick goldens, one new production build and affected Python-compatible browser cases; T2 follows phases 3A/3B as authorized.
