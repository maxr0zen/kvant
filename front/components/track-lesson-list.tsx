"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, ListChecks, CheckCircle2, CircleDot, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/lib/utils";
import { fetchTrackProgress } from "@/lib/api/tracks";
import type { Track, LessonProgressStatus } from "@/lib/types";

interface TrackLessonListProps {
  track: Track;
  trackId: string;
}

function lessonStatusStyle(status: LessonProgressStatus | undefined): string {
  switch (status) {
    case "completed":
      return "border-brand-green bg-brand-green/10 hover:bg-brand-green/20 text-foreground dark:bg-brand-green/20 dark:hover:bg-brand-green/30";
    case "started":
      return "border-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 text-foreground dark:bg-brand-orange/20 dark:hover:bg-brand-orange/30";
    default:
      return "";
  }
}

export function TrackLessonList({ track, trackId }: TrackLessonListProps) {
  const [progress, setProgress] = useState<Track["progress"]>(track.progress ?? {});

  useEffect(() => {
    let cancelled = false;
    fetchTrackProgress(trackId).then((p) => {
      if (!cancelled) setProgress(p);
    });
    return () => { cancelled = true; };
  }, [trackId]);

  const lessons = [...track.lessons].sort((a, b) => a.order - b.order);

  return (
    <ul className="space-y-2">
      {lessons.map((lesson) => {
        const status: LessonProgressStatus | undefined =
          (lesson.type === "task" || lesson.type === "puzzle") ? (progress?.[lesson.id] ?? "not_started") : undefined;
        const statusClass = lessonStatusStyle(status);
        const Icon =
          lesson.type === "lecture" ? BookOpen : lesson.type === "puzzle" ? Puzzle : ListChecks;
        const StatusIcon =
          status === "completed" ? CheckCircle2 : status === "started" ? CircleDot : null;

        return (
          <li key={lesson.id}>
            <Link href={`/tracks/${trackId}/lesson/${lesson.id}`}>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start gap-2",
                  statusClass && `border-2 ${statusClass}`
                )}
                size="lg"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {StatusIcon && (
                  <StatusIcon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      status === "completed" && "text-brand-green",
                      status === "started" && "text-brand-orange"
                    )}
                  />
                )}
                {lesson.title}
              </Button>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
