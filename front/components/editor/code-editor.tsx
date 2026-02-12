"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { cn } from "@/components/lib/utils";
import { CodeHighlight } from "@/components/code-highlight";

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = "python",
  className,
  readOnly = false,
}: CodeEditorProps) {
  const extensions = useMemo(() => [python()], []);

  if (readOnly) {
    return (
      <div className={cn("relative rounded-lg border border-border/80 overflow-hidden", className)}>
        <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span>Python</span>
        </div>
        <CodeHighlight code={value} language={language} className="min-h-[280px]" />
      </div>
    );
  }

  return (
    <div className={cn("code-font-mono relative rounded-lg border border-border/80 overflow-hidden bg-card", className)}>
      <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <span>Python</span>
      </div>
      <CodeMirror
        value={value}
        height="280px"
        minHeight="280px"
        extensions={extensions}
        onChange={onChange}
        theme={oneDark}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
        }}
        className="[&_.cm-editor]:rounded-b-lg [&_.cm-scroller]:overflow-auto [&_.cm-content]:min-h-[260px] [&_.cm-content]:py-4 [&_.cm-content]:px-4 [&_.cm-line]:leading-relaxed"
      />
    </div>
  );
}
