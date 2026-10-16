'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useStore } from "@/features/workspace/public/store";
import { monacoTokenColor } from "@/features/editor/colors";
import { executionCounts } from "@/features/insights/public/model/analysis";
import runtimeAssets from '@/generated/runtime-assets.json';
loader.config({ paths: { vs: runtimeAssets.monaco } });
function applyTheme(
  monaco: Parameters<OnMount>[1],
  ed: editor.IStandaloneCodeEditor,
  theme: 'dark' | 'light',
) {
  document.documentElement.dataset.theme = theme;
  const tokens = getComputedStyle(document.documentElement);
  const color = (name: string) => tokens.getPropertyValue(name).trim();
  const tokenColor = (name: string) => monacoTokenColor(color(name));
  monaco.editor.defineTheme(`codelens-${theme}`, {
    base: theme === 'dark' ? 'vs-dark' : 'vs',
    inherit: false,
    rules: [
      { token: '', foreground: tokenColor('--code-fg') },
      { token: 'keyword', foreground: tokenColor('--code-keyword'), fontStyle: 'bold' },
      { token: 'string', foreground: tokenColor('--code-string') },
      { token: 'number', foreground: tokenColor('--code-fg') },
      { token: 'delimiter', foreground: tokenColor('--code-fg') },
      { token: 'comment', foreground: tokenColor('--code-comment'), fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': color('--surface'),
      'editor.foreground': color('--code-fg'),
      'editorLineNumber.foreground': color('--code-line-number'),
      'editorLineNumber.activeForeground': color('--code-active'),
      'editor.selectionBackground': color('--code-selection'),
      'editor.inactiveSelectionBackground': color('--code-selection'),
      'editor.selectionHighlightBackground': color('--code-selection'),
      'editor.selectionHighlightBorder': color('--accent'),
      'editor.wordHighlightBackground': color('--code-selection'),
      'editor.wordHighlightStrongBackground': color('--code-selection'),
      'editor.wordHighlightTextBackground': color('--code-selection'),
      'editor.wordHighlightBorder': color('--accent'),
      'editor.wordHighlightStrongBorder': color('--accent'),
      'editor.wordHighlightTextBorder': color('--accent'),
      'editor.findMatchBackground': color('--code-selection'),
      'editor.findMatchHighlightBackground': color('--code-selection'),
      'editor.findMatchBorder': color('--accent'),
      'editor.findMatchHighlightBorder': color('--accent'),
      'editorOverviewRuler.findMatchForeground': color('--accent'),
      'editorOverviewRuler.wordHighlightForeground': color('--accent'),
      'editorOverviewRuler.selectionHighlightForeground': color('--accent'),
      'editorSuggestWidget.selectedBackground': color('--code-selection'),
      'editorSuggestWidget.selectedForeground': color('--code-fg'),
      'editorSuggestWidget.highlightForeground': color('--code-keyword'),
      'list.activeSelectionBackground': color('--code-selection'),
      'list.activeSelectionForeground': color('--code-fg'),
      'list.focusBackground': color('--code-selection'),
      'list.focusForeground': color('--code-fg'),
      'list.highlightForeground': color('--code-keyword'),
      'editorBracketMatch.background': color('--code-selection'),
      'editorBracketMatch.border': color('--accent'),
      focusBorder: color('--accent'),
      'editorWidget.border': color('--border'),
      'inputOption.activeBackground': color('--code-selection'),
      'inputOption.activeBorder': color('--accent'),
      'editorCursor.foreground': color('--code-active'),
      'editor.lineHighlightBackground': color('--transparent'),
      'editorGutter.background': color('--surface'),
      ...Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((n) => [
          `editorBracketHighlight.foreground${n}`,
          color('--code-fg'),
        ]),
      ),
    },
  });
  monaco.editor.setTheme(`codelens-${theme}`);
  ed.updateOptions({
    fontFamily: color('--font-code'),
    fontSize: parseFloat(color('--text-editor')),
    lineHeight: parseFloat(color('--code-line-height')),
    padding: {
      top: parseFloat(color('--code-padding')),
      bottom: parseFloat(color('--code-padding')),
    },
  });
}
export function CodeEditor({
  onReady,
  focusToken = 0,
}: {
  onReady?: () => void;
  focusToken?: number;
}) {
  const code = useStore((s) => s.code),
    selectedLine = useStore((s) =>
      s.tab === 'breakdown' || s.tab === 'analysis' || s.tab === 'complexity' ? s.selectedLine : null,
    ),
    setCode = useStore((s) => s.setCode),
    theme = useStore((s) => s.theme),
    breakpoints = useStore((s) => s.breakpoints);
  const step = useStore((s) => s.result?.steps[s.cursor]),
    status = useStore((s) => s.status);
  const trace = useStore((s) => s.result),
    tab = useStore((s) => s.tab);
  const counts = useMemo(
    () => (tab === 'analysis' || tab === 'complexity' ? executionCounts(trace) : {}),
    [trace, tab],
  );
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null),
    monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const decorations = useRef<editor.IEditorDecorationsCollection | null>(null);
  const [ready, setReady] = useState(false);
  const [editorError, setEditorError] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!editorRef.current) {
        setEditorError(true);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [onReady]);
  const onMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    ed.onDidChangeModelContent(() => {
      const next = ed.getValue();
      if (next !== useStore.getState().code) useStore.getState().setCode(next);
    });
    ed.onDidChangeCursorPosition((e) => {
      const currentTab = useStore.getState().tab;
      if (currentTab === 'breakdown' || currentTab === 'analysis' || currentTab === 'complexity')
        useStore.getState().selectLine(e.position.lineNumber);
    });
    applyTheme(monaco, ed, useStore.getState().theme);
    decorations.current = ed.createDecorationsCollection();
    ed.onMouseDown((e) => {
      if (
        [
          monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN,
          monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS,
        ].includes(e.target.type) &&
        e.target.position
      )
        useStore.getState().toggleBreakpoint(e.target.position.lineNumber);
    });
    setReady(true);
    onReady?.();
  };
  useEffect(() => {
    if (focusToken > 0 && ready) {
      editorRef.current?.focus();
      editorRef.current?.setPosition({ lineNumber: 1, column: 1 });
      editorRef.current?.revealLine(1);
    }
  }, [focusToken, ready]);
  useEffect(() => {
    if (ready && monacoRef.current && editorRef.current)
      applyTheme(monacoRef.current, editorRef.current, theme);
  }, [theme, ready]);
  useEffect(() => {
    if (!ready) return;
    const items: editor.IModelDeltaDecoration[] = breakpoints.map((line) => ({
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: {
        glyphMarginClassName: 'breakpoint-marker',
        glyphMarginHoverMessage: { value: 'Breakpoint — playback pauses here' },
      },
    }));
    const peak = Math.max(1, ...Object.values(counts));
    for (const [line, count] of Object.entries(counts))
      items.push({
        range: {
          startLineNumber: Number(line),
          startColumn: 1,
          endLineNumber: Number(line),
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: `heat-line heat-${Math.min(4, Math.max(1, Math.ceil((count / peak) * 4)))}`,
          hoverMessage: { value: `${count} real line executions (captured trace)` },
        },
      });
    if (step && selectedLine === null && tab === 'visualizer') {
      items.push({
        range: {
          startLineNumber: step.line,
          startColumn: 1,
          endLineNumber: step.line,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className:
            step.event === 'exception' ? 'execution-line exception-line' : 'execution-line',
          linesDecorationsClassName: 'execution-arrow',
        },
      });
      editorRef.current?.revealLineInCenterIfOutsideViewport(step.line);
    }
    if (selectedLine !== null) {
      items.push({
        range: {
          startLineNumber: selectedLine,
          startColumn: 1,
          endLineNumber: selectedLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'execution-line breakdown-line',
          linesDecorationsClassName: 'execution-arrow',
        },
      });
      editorRef.current?.revealLineInCenterIfOutsideViewport(selectedLine);
    }
    decorations.current?.set(items);
  }, [step, breakpoints, ready, selectedLine, counts, tab]);
  return (
    <div className="editor-body" data-testid="editor-container">
      {editorError && !ready ? (
        <div className="editor-fallback">
          <p>The editor could not load. You can still paste and run your code here.</p>
          <textarea
            aria-label="Code editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={status === 'loading' || status === 'running'}
          />
        </div>
      ) : (
        <Editor
          language="python"
          value={code}
          theme={`codelens-${theme}`}
          onMount={onMount}
          loading={<div className="editor-loading mono">/ loading editor</div>}
          options={{
            minimap: { enabled: false },
            glyphMargin: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'off',
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            readOnly: status === 'loading' || status === 'running',
            ariaLabel: 'Code editor',
            accessibilitySupport: 'on',
            editContext: false,
            bracketPairColorization: { enabled: false },
            contextmenu: false,
            fixedOverflowWidgets: true,
          }}
        />
      )}
    </div>
  );
}
