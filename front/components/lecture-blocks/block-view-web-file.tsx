"use client";

import { useEffect, useRef, useState } from "react";
import type { LectureBlock } from "@/lib/types";

interface BlockViewWebFileProps {
  block: Extract<LectureBlock, { type: "web_file" }>;
  immersive?: boolean;
}

export function BlockViewWebFile({ block, immersive }: BlockViewWebFileProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (immersive) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const updateHeight = () => {
      try {
        const doc = iframe.contentWindow?.document;
        if (doc) {
          const newHeight = Math.max(
            doc.body?.scrollHeight ?? 0,
            doc.documentElement?.scrollHeight ?? 0
          );
          if (newHeight > 0) {
            setHeight(newHeight);
          }
        }
      } catch {
        // Cross-origin or sandbox restriction — ignore and keep fallback height
      }
    };

    const startPolling = () => {
      updateHeight();
      if (!intervalId) {
        intervalId = setInterval(updateHeight, 1000);
      }
    };

    iframe.addEventListener("load", startPolling);
    // Fallback in case load already fired before effect ran
    timeoutId = setTimeout(startPolling, 100);

    const handleResize = () => updateHeight();
    window.addEventListener("resize", handleResize);

    return () => {
      iframe.removeEventListener("load", startPolling);
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("resize", handleResize);
    };
  }, [block.url, immersive]);

  if (!block.url?.trim()) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 px-6 py-8 text-center text-muted-foreground">
        <p className="text-sm font-medium">Не указан URL веб-файла</p>
      </div>
    );
  }

  return (
    <div className={immersive ? "flex-1 flex flex-col min-h-0 bg-background" : "space-y-2"}>
      {!immersive && block.title?.trim() && (
        <h3 className="text-base font-semibold">{block.title}</h3>
      )}
      <iframe
        ref={iframeRef}
        src={block.url}
        title={block.title?.trim() || "Веб-файл"}
        className={`w-full bg-background ${
          immersive
            ? "h-full"
            : "min-h-[400px] rounded-lg border border-border/60"
        }`}
        style={immersive ? undefined : (height ? { height: `${height}px` } : undefined)}
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
      />
    </div>
  );
}
