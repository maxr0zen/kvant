"use client";

import { useMemo, useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { parseDateTime } from "@/lib/utils/datetime";
interface TemporaryAssignmentsIndicatorProps {
  orphanLectures?: { available_until?: string | null; availableUntil?: string | null }[];
  orphanTasks: { available_until?: string | null; availableUntil?: string | null }[];
  orphanPuzzles: { available_until?: string | null; availableUntil?: string | null }[];
  orphanQuestions: { available_until?: string | null; availableUntil?: string | null }[];
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
  className = "",
}: TemporaryAssignmentsIndicatorProps) {
  const [now, setNow] = useState(() => Date.now());

  const items = useMemo(() => {
    const list: { until: number }[] = [];
    for (const lec of orphanLectures) {
      const u = parseUntil(lec.available_until ?? lec.availableUntil);
      if (u != null && u > now) list.push({ until: u });
    }
    for (const t of orphanTasks) {
      const u = parseUntil(t.available_until ?? t.availableUntil);
      if (u != null && u > now) list.push({ until: u });
    }
    for (const p of orphanPuzzles) {
      const u = parseUntil(p.available_until ?? p.availableUntil);
      if (u != null && u > now) list.push({ until: u });
    }
    for (const q of orphanQuestions) {
      const u = parseUntil(q.available_until ?? q.availableUntil);
      if (u != null && u > now) list.push({ until: u });
    }
    return list;
  }, [orphanLectures, orphanTasks, orphanPuzzles, orphanQuestions, now]);

  const nearest = useMemo(() => {
    if (items.length === 0) return null;
    return items.reduce((a, b) => (a.until < b.until ? a : b));
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  const timeLeft = nearest ? formatTimeLeft(nearest.until - now) : "";

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
          {items.length === 1 ? "Истекает через " : `Активно ${items.length}, ближайшее истекает через `}
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
