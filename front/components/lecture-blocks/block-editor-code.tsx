"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/editor/code-editor";
import { LanguageSelector } from "@/components/language-selector";
import { Trash2, Code } from "lucide-react";
import type { LectureBlock } from "@/lib/types";

interface BlockEditorCodeProps {
  block: Extract<LectureBlock, { type: "code" }>;
  onChange: (explanation: string, code: string, language?: string) => void;
  onRemove: () => void;
}

export function BlockEditorCode({
  block,
  onChange,
  onRemove,
}: BlockEditorCodeProps) {
  return (
    <div className="space-y-3 rounded-lg border p-4 bg-card">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground text-xs font-medium flex items-center gap-1">
          <Code className="h-4 w-4" /> Блок: Код
        </Label>
        <div className="flex items-center gap-2">
          <LanguageSelector
            value={block.language ?? "python"}
            onChange={(lang) => onChange(block.explanation, block.code, lang)}
            className="w-36 h-8 text-xs"
          />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} title="Удалить блок">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Пояснение к коду</Label>
        <Textarea
          value={block.explanation}
          onChange={(e) => onChange(e.target.value, block.code, block.language)}
          placeholder="Объясните, что делает этот фрагмент кода"
          rows={3}
          className="resize-y"
        />
      </div>
      <div className="space-y-2">
        <Label>Код</Label>
        <CodeEditor
          value={block.code}
          onChange={(code) => onChange(block.explanation, code, block.language)}
          language={block.language ?? "python"}
          placeholder="# Введите пример кода"
          className="min-h-[200px]"
        />
      </div>
    </div>
  );
}
