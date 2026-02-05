"use client";

import { RichTextEditor } from "./rich-text-editor";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { LectureBlock } from "@/lib/types";

interface BlockEditorTextProps {
  block: Extract<LectureBlock, { type: "text" }>;
  onChange: (content: string) => void;
  onRemove: () => void;
}

export function BlockEditorText({
  block,
  onChange,
  onRemove,
}: BlockEditorTextProps) {
  return (
    <div className="space-y-2 rounded-lg border p-4 bg-card">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground text-xs font-medium">
          Блок: Текст
        </Label>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} title="Удалить блок">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <RichTextEditor value={block.content} onChange={onChange} minHeight="100px" />
    </div>
  );
}
