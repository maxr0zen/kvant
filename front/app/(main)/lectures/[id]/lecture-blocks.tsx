"use client";

import { useState, useEffect } from "react";
import type { LectureBlock } from "@/lib/types";
import { BlockViewText } from "@/components/lecture-blocks/block-view-text";
import { BlockViewImage } from "@/components/lecture-blocks/block-view-image";
import { BlockViewCode } from "@/components/lecture-blocks/block-view-code";
import { BlockViewQuestion } from "@/components/lecture-blocks/block-view-question";
import { BlockViewVideo } from "@/components/lecture-blocks/block-view-video";
import { fetchLectureQuestionBlocksProgress, type BlockProgressItem } from "@/lib/api/lectures";

interface LectureBlocksProps {
  blocks: LectureBlock[];
  lectureId?: string;
}

export function LectureBlocks({ blocks, lectureId }: LectureBlocksProps) {
  const [blockProgress, setBlockProgress] = useState<Record<string, BlockProgressItem>>({});

  useEffect(() => {
    if (!lectureId) return;
    fetchLectureQuestionBlocksProgress(lectureId).then(setBlockProgress);
  }, [lectureId]);

  return (
    <div className="space-y-8">
      {blocks.map((block, index) => {
        const content = block.type === "text" ? (
          <BlockViewText key={index} block={block} />
        ) : block.type === "image" ? (
          <BlockViewImage key={index} block={block} />
        ) : block.type === "code" ? (
          <BlockViewCode key={index} block={block} />
        ) : block.type === "video" && lectureId && block.id ? (
          <BlockViewVideo
            key={`${block.id}-${block.url ?? ""}`}
            block={block}
            lectureId={lectureId}
            blockProgress={blockProgress}
            onCorrectAnswer={(blockId) => {
              if (blockId) {
                setBlockProgress((prev) => ({
                  ...prev,
                  [blockId]: { status: "completed", correct_ids: prev[blockId]?.correct_ids ?? null },
                }));
              }
              fetchLectureQuestionBlocksProgress(lectureId!).then(setBlockProgress);
            }}
          />
        ) : block.type === "question" && lectureId && block.id ? (
          <BlockViewQuestion
            key={block.id}
            block={block}
            lectureId={lectureId}
            wasEverCorrect={blockProgress[block.id]?.status === "completed"}
            correctIds={blockProgress[block.id]?.correct_ids ?? null}
            onCorrectAnswer={() => {
              fetchLectureQuestionBlocksProgress(lectureId!).then(setBlockProgress);
            }}
          />
        ) : null;
        if (!content) return null;
        return (
          <section key={block.type === "question" || block.type === "video" ? block.id : index} className="scroll-mt-8">
            {content}
          </section>
        );
      })}
    </div>
  );
}
