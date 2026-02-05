"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Image as ImageIcon } from "lucide-react";
import type { LectureBlock } from "@/lib/types";

interface BlockEditorImageProps {
  block: Extract<LectureBlock, { type: "image" }>;
  onChange: (url: string, alt?: string) => void;
  onRemove: () => void;
}

export function BlockEditorImage({
  block,
  onChange,
  onRemove,
}: BlockEditorImageProps) {
  const [url, setUrl] = useState(block.url);
  const [alt, setAlt] = useState(block.alt ?? "");

  useEffect(() => {
    setUrl(block.url);
    setAlt(block.alt ?? "");
  }, [block.url, block.alt]);

  function applyUrl() {
    onChange(url, alt.trim() || undefined);
  }

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-card">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground text-xs font-medium flex items-center gap-1">
          <ImageIcon className="h-4 w-4" /> Блок: Изображение
        </Label>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} title="Удалить блок">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>URL изображения</Label>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={applyUrl}
              placeholder="https://example.com/image.png"
            />
            <Button type="button" variant="secondary" size="sm" onClick={applyUrl}>
              Применить
            </Button>
          </div>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Подпись (alt)</Label>
          <Input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onBlur={applyUrl}
            placeholder="Описание изображения"
          />
        </div>
      </div>
      {url && (
        <div className="lecture-image-preview rounded-lg border overflow-hidden bg-muted/30 flex items-center justify-center min-h-[120px] max-h-[280px]">
          <img
            src={url}
            alt={alt || "Превью"}
            className="max-w-full max-h-[260px] w-auto h-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}
