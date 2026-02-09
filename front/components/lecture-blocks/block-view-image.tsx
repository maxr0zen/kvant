"use client";

import type { LectureBlock } from "@/lib/types";

interface BlockViewImageProps {
  block: Extract<LectureBlock, { type: "image" }>;
}

/** Единый формат отображения изображений: не выбиваются из вёрстки */
const imageClassName =
  "w-full max-w-2xl mx-auto h-auto max-h-[400px] object-contain rounded-lg border bg-muted/30 block";

export function BlockViewImage({ block }: BlockViewImageProps) {
  if (!block.url) return null;

  return (
    <figure className="rounded-xl border border-border/60 bg-muted/20 p-4 overflow-hidden">
      <div className="flex justify-center overflow-hidden rounded-lg min-h-[120px]">
        <img
          src={block.url}
          alt={block.alt ?? "Иллюстрация"}
          className={imageClassName}
          loading="lazy"
        />
      </div>
      {block.alt && (
        <figcaption className="text-center text-sm text-muted-foreground mt-2">
          {block.alt}
        </figcaption>
      )}
    </figure>
  );
}
