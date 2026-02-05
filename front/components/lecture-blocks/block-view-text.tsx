"use client";

import { useState, useEffect } from "react";
import { sanitizeLectureHtml } from "@/lib/sanitize-html";
import type { LectureBlock } from "@/lib/types";

interface BlockViewTextProps {
  block: Extract<LectureBlock, { type: "text" }>;
}

export function BlockViewText({ block }: BlockViewTextProps) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    setHtml(sanitizeLectureHtml(block.content));
  }, [block.content]);

  if (!html) return null;

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:my-0.5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
