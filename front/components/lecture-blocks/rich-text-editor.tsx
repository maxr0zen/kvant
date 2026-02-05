"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, List, ListOrdered, Strikethrough } from "lucide-react";
import { cn } from "@/components/lib/utils";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const ALLOWED_TAGS = "p,br,strong,b,em,i,u,s,ul,ol,li,h2,h3,h4";

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Введите текст...",
  className,
  minHeight = "120px",
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  function handleInput() {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    onChange(html);
  }

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    ref.current?.focus();
    handleInput();
  }

  return (
    <div className={cn("rounded-lg border bg-background overflow-hidden", className)}>
      <div className="flex flex-wrap gap-0.5 border-b bg-muted/50 p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => exec("bold")}
          title="Жирный"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => exec("italic")}
          title="Курсив"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => exec("underline")}
          title="Подчёркнутый"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => exec("strikeThrough")}
          title="Зачёркнутый"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border self-center mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => exec("insertUnorderedList")}
          title="Маркированный список"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => exec("insertOrderedList")}
          title="Нумерованный список"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => exec("formatBlock", "h2")}
          title="Заголовок 2"
        >
          H2
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => exec("formatBlock", "h3")}
          title="Заголовок 3"
        >
          H3
        </Button>
      </div>
      <div
        ref={ref}
        contentEditable
        data-placeholder={placeholder}
        className="p-3 text-sm min-w-0 outline-none focus:ring-0 [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-muted-foreground"
        style={{ minHeight }}
        onInput={handleInput}
        onBlur={handleInput}
        suppressContentEditableWarning
      />
    </div>
  );
}
