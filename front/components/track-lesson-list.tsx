"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, ListChecks, CheckCircle2, CircleDot, Puzzle, HelpCircle, Star, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/lib/utils";
import { fetchTrackProgress } from "@/lib/api/tracks";
import { AvailabilityCountdown, formatLateSeconds } from "@/components/availability-countdown";
import type { Track, LessonProgressStatus, TrackProgressLate } from "@/lib/types";

interface TrackLessonListProps {
  track: Track;
  trackId: string;
}

function lessonStatusStyle(status: LessonProgressStatus | undefined): string {
  switch (status) {
    case "completed":
    case "completed_late":
      return "border-brand-green bg-brand-green/10 hover:bg-brand-green/20 text-foreground dark:bg-brand-green/20 dark:hover:bg-brand-green/30";
    case "started":
      return "border-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 text-foreground dark:bg-brand-orange/20 dark:hover:bg-brand-orange/30";
    default:
      return "";
  }
}

export function TrackLessonList({ track, trackId }: TrackLessonListProps) {
  const [progress, setProgress] = useState<Track["progress"]>(track.progress ?? {});
  const [progressLate, setProgressLate] = useState<TrackProgressLate | undefined>(track.progressLate);

  useEffect(() => {
    let cancelled = false;
    fetchTrackProgress(trackId).then(({ progress: p, progressLate: pl }) => {
      if (!cancelled) {
        setProgress(p ?? {});
        setProgressLate(pl);
      }
    });
    return () => { cancelled = true; };
  }, [trackId]);

  const lessons = [...track.lessons].sort((a, b) => a.order - b.order);

  return (
    <ul className="space-y-2">
      {lessons.map((lesson) => {
        const status: LessonProgressStatus | undefined =
          (lesson.type === "lecture" || lesson.type === "task" || lesson.type === "puzzle" || lesson.type === "question" || lesson.type === "survey")
            ? (progress?.[lesson.id] ?? "not_started")
            : undefined;
        const statusClass = lessonStatusStyle(status);
        const Icon =
          lesson.type === "lecture" ? BookOpen
            : lesson.type === "puzzle" ? Puzzle
            : lesson.type === "question" ? HelpCircle
            : lesson.type === "survey" ? MessageCircle
            : ListChecks;
        const StatusIcon =
          status === "completed" || status === "completed_late" ? CheckCircle2 : status === "started" ? CircleDot : null;
        const until = (lesson as { available_until?: string | null; availableUntil?: string | null }).available_until ?? (lesson as { available_until?: string | null; availableUntil?: string | null }).availableUntil;
        const showCountdown = lesson.type !== "lecture" && Boolean(until);
        const lateSeconds = status === "completed_late" ? (progressLate?.[lesson.id] ?? 0) : 0;
        const lateLabel = lateSeconds > 0 ? `Выполнено после срока (${formatLateSeconds(lateSeconds)})` : null;

        return (
          <li key={lesson.id}>
            <Link href={`/main/${trackId}/lesson/${lesson.id}`}>
              <Button
                variant="outline"
                className={cn(
                  "w-full !justify-start gap-3 text-left",
                  statusClass && `border-2 ${statusClass}`
                )}
                size="lg"
                title={lateLabel ?? undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {StatusIcon && (
                  <StatusIcon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      (status === "completed" || status === "completed_late") && "text-brand-green",
                      status === "started" && "text-brand-orange"
                    )}
                  />
                )}
                {lesson.hard && (
                  <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" title="Повышенная сложность" />
                )}
                <span className="truncate flex-1 min-w-0">{lesson.title}</span>
                {lateLabel && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                    {lateLabel}
                  </span>
                )}
                {showCountdown && (
                  <AvailabilityCountdown
                    availableUntil={until}
                    className="ml-auto text-xs shrink-0"
                  />
                )}
              </Button>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
