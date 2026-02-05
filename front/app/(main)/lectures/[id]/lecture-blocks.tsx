"use client";

import type { LectureBlock } from "@/lib/types";
import { BlockViewText } from "@/components/lecture-blocks/block-view-text";
import { BlockViewImage } from "@/components/lecture-blocks/block-view-image";
import { BlockViewCode } from "@/components/lecture-blocks/block-view-code";

export function LectureBlocks({ blocks }: { blocks: LectureBlock[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.type === "text") {
          return <BlockViewText key={index} block={block} />;
        }
        if (block.type === "image") {
          return <BlockViewImage key={index} block={block} />;
        }
        if (block.type === "code") {
          return <BlockViewCode key={index} block={block} />;
        }
        return null;
      })}
    </div>
  );
}
