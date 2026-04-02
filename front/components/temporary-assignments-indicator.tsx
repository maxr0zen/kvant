"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { parseDateTime } from "@/lib/utils/datetime";
import { useNow } from "@/lib/hooks/use-now";
interface TemporaryAssignmentsIndicatorProps {
  orphanLectures?: { available_until?: string | null; availableUntil?: string | null }[];
  orphanTasks: { available_until?: string | null; availableUntil?: string | null }[];
  orphanPuzzles: { available_until?: string | null; availableUntil?: string | null }[];
  orphanQuestions: { available_until?: string | null; availableUntil?: string | null }[];
  orphanLayouts?: { available_until?: string | null; availableUntil?: string | null }[];
  className?: string;
}

function parseUntil(s: string | null | undefined): number | null {
  const d = parseDateTime(s ?? null);
  if (!d) return null;
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "истекло";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  if (days > 0) return `${days} д ${h} ч`;
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  return `${minutes} мин`;
}

export function TemporaryAssignmentsIndicator({
  orphanLectures = [],
  orphanTasks,
  orphanPuzzles,
  orphanQuestions,
  orphanLayouts = [],
  className = "",
}: TemporaryAssignmentsIndicatorProps) {
  const now = useNow(60_000);

  // Parse "until" timestamps only when input arrays change.
  const untilItems = useMemo(() => {
    const list: { until: number }[] = [];
    for (const lec of orphanLectures) {
      const u = parseUntil(lec.available_until ?? lec.availableUntil);
      if (u != null) list.push({ until: u });
    }
    for (const t of orphanTasks) {
      const u = parseUntil(t.available_until ?? t.availableUntil);
      if (u != null) list.push({ until: u });
    }
    for (const p of orphanPuzzles) {
      const u = parseUntil(p.available_until ?? p.availableUntil);
      if (u != null) list.push({ until: u });
    }
    for (const q of orphanQuestions) {
      const u = parseUntil(q.available_until ?? q.availableUntil);
      if (u != null) list.push({ until: u });
    }
    for (const l of orphanLayouts) {
      const u = parseUntil(l.available_until ?? l.availableUntil);
      if (u != null) list.push({ until: u });
    }
    return list;
  }, [orphanLectures, orphanTasks, orphanPuzzles, orphanQuestions, orphanLayouts]);

  const { activeCount, nearestUntil } = useMemo(() => {
    let activeCount = 0;
    let nearestUntil: number | null = null;

    for (const item of untilItems) {
      if (item.until <= now) continue;
      activeCount += 1;
      if (nearestUntil === null || item.until < nearestUntil) nearestUntil = item.until;
    }

    return { activeCount, nearestUntil };
  }, [untilItems, now]);

  if (activeCount === 0 || nearestUntil === null) return null;

  const timeLeft = formatTimeLeft(nearestUntil - now);

  return (
    <div
      className={
        "flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm " + className
      }
    >
      <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex flex-col leading-tight">
        <span className="font-medium text-amber-800 dark:text-amber-200">Временные задания</span>
        <span className="text-xs text-amber-700 dark:text-amber-300">
          {activeCount === 1 ? "Истекает через " : `Активно ${activeCount}, ближайшее истекает через `}
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
