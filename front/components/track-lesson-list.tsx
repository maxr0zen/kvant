"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  CircleDot,
  Code2,
  HelpCircle,
  ListChecks,
  MessageCircle,
  Puzzle,
  Star,
} from "lucide-react";
import { cn } from "@/components/lib/utils";
import { fetchTrackProgress } from "@/lib/api/tracks";
import { AvailabilityCountdown, formatLateSeconds } from "@/components/availability-countdown";
import type { LessonProgressStatus, Track, TrackProgressLate } from "@/lib/types";

interface TrackLessonListProps {
  track: Track;
  trackId: string;
}

function getLessonStateClasses(status: LessonProgressStatus | undefined) {
  switch (status) {
    case "completed":
    case "completed_late":
      return "border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)]";
    case "started":
      return "border-[hsl(var(--warning)/0.28)] bg-[hsl(var(--warning)/0.09)]";
    default:
      return "border-border/70 bg-background/76 hover:border-primary/20 hover:bg-secondary/50";
  }
}

export function TrackLessonList({ track, trackId }: TrackLessonListProps) {
  const [progress, setProgress] = useState<Track["progress"]>(track.progress ?? {});
  const [progressLate, setProgressLate] = useState<TrackProgressLate | undefined>(track.progressLate);

  useEffect(() => {
    let cancelled = false;
    fetchTrackProgress(trackId).then(({ progress: nextProgress, progressLate: nextProgressLate }) => {
      if (!cancelled) {
        setProgress(nextProgress ?? {});
        setProgressLate(nextProgressLate);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [trackId]);

  const lessons = [...track.lessons].sort((a, b) => a.order - b.order);

  return (
    <ul className="space-y-3">
      {lessons.map((lesson, index) => {
        const status =
          lesson.type === "lecture" ||
          lesson.type === "task" ||
          lesson.type === "puzzle" ||
          lesson.type === "question" ||
          lesson.type === "survey" ||
          lesson.type === "layout"
            ? (progress?.[lesson.id] ?? "not_started")
            : undefined;

        const Icon =
          lesson.type === "lecture"
            ? BookOpen
            : lesson.type === "puzzle"
              ? Puzzle
              : lesson.type === "question"
                ? HelpCircle
                : lesson.type === "survey"
                  ? MessageCircle
                  : lesson.type === "layout"
                    ? Code2
                    : ListChecks;

        const isCompleted = status === "completed" || status === "completed_late";
        const isStarted = status === "started";
        const until =
          (lesson as { available_until?: string | null; availableUntil?: string | null }).available_until ??
          (lesson as { available_until?: string | null; availableUntil?: string | null }).availableUntil;
        const lateSeconds = status === "completed_late" ? progressLate?.[lesson.id] ?? 0 : 0;

        return (
          <li key={lesson.id}>
            <Link
              href={`/main/${trackId}/lesson/${lesson.id}`}
              className={cn(
                "group flex flex-col gap-4 rounded-[1.6rem] border p-4 shadow-[var(--shadow-soft)] transition-all duration-200",
                getLessonStateClasses(status)
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-background/82 text-foreground shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Урок {index + 1}
                    </span>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--success)/0.14)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--success))]">
                        <CheckCircle2 className="h-3 w-3" />
                        {status === "completed_late" ? "Завершено позже" : "Завершено"}
                      </span>
                    )}
                    {isStarted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--warning)/0.14)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--warning))]">
                        <CircleDot className="h-3 w-3" />
                        В процессе
                      </span>
                    )}
                    {lesson.hard && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <Star className="h-3 w-3 fill-current" />
                        Hard
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">{lesson.title}</h3>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {lesson.type === "lecture"
                        ? "Лекция"
                        : lesson.type === "task"
                          ? "Задача"
                          : lesson.type === "puzzle"
                            ? "Пазл"
                            : lesson.type === "question"
                              ? "Вопрос"
                              : lesson.type === "survey"
                                ? "Опрос"
                                : "Верстка"}
                    </span>
                    {lateSeconds > 0 && <span>Просрочка {formatLateSeconds(lateSeconds)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5">
                  Открыть урок
                </div>
                {lesson.type !== "lecture" && until && (
                  <AvailabilityCountdown availableUntil={until} className="text-xs" />
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
