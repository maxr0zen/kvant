"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/components/lib/utils";

const TAB_STRING = "  "; // 2 пробела для отступов в Python

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
  placeholder = "# Введите код на Python",
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab" || readOnly) return;
    e.preventDefault();
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    if (e.shiftKey) {
      // Shift+Tab — убрать отступ в начале строки
      const lineStart = before.lastIndexOf("\n") + 1;
      const lineBefore = value.slice(lineStart, start);
      const toRemove = lineBefore.match(/^(\s{1,2}|\t)/)?.[0] ?? "";
      if (toRemove) {
        const newStart = start - toRemove.length;
        const newValue = value.slice(0, lineStart) + lineBefore.slice(toRemove.length) + value.slice(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = newStart;
        });
      }
    } else {
      const newValue = before + TAB_STRING + after;
      onChange(newValue);
      const newPos = start + TAB_STRING.length;
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = newPos;
      });
    }
  }

  return (
    <div className={cn("relative rounded-lg border bg-card overflow-hidden", className)}>
      <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <span>Python</span>
      </div>
      <textarea
        ref={textareaRef}
        className="w-full min-h-[280px] resize-y bg-background p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-0 tab-size-[2]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        data-language={language}
      />
    </div>
  );
}
