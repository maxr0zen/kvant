"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock } from "lucide-react";
import { parseDateTime } from "@/lib/utils/datetime";

interface AvailabilityCountdownProps {
  availableUntil?: string | null;
  className?: string;
}

function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 с";
  const sec = Math.floor((ms / 1000) % 60);
  const min = Math.floor((ms / 60000) % 60);
  const hours = Math.floor((ms / 3600000) % 24);
  const days = Math.floor(ms / 86400000);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} д`);
  if (hours > 0) parts.push(`${hours} ч`);
  if (days === 0 && (hours > 0 || min > 0)) parts.push(`${min} мин`);
  if (days === 0 && hours === 0) parts.push(`${sec} с`);
  return parts.join(" ");
}

/** Форматирует просрочку (положительное число миллисекунд) */
export function formatOverdue(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 с";
  return formatRemaining(ms);
}

/** Форматирует просрочку в секундах (для completed_late) */
export function formatLateSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 с";
  const sec = seconds % 60;
  const min = Math.floor(seconds / 60) % 60;
  const hours = Math.floor(seconds / 3600) % 24;
  const days = Math.floor(seconds / 86400);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} д`);
  if (hours > 0) parts.push(`${hours} ч`);
  if (days === 0 && (hours > 0 || min > 0)) parts.push(`${min} мин`);
  if (days === 0 && hours === 0) parts.push(`${sec} с`);
  return parts.join(" ");
}

function parseUntil(value: string | null | undefined): number | null {
  const d = parseDateTime(value ?? null);
  if (!d) return null;
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

export function AvailabilityCountdown({
  availableUntil,
  className = "",
}: AvailabilityCountdownProps) {
  const until = useMemo(() => parseUntil(availableUntil), [availableUntil]);

  const [remaining, setRemaining] = useState<string | null>(() => {
    if (until == null) return null;
    const ms = until - Date.now();
    if (ms <= 0) return null;
    return formatRemaining(ms);
  });

  useEffect(() => {
    if (until == null) {
      setRemaining(null);
      return;
    }

    const update = () => {
      const now = Date.now();
      if (until <= now) {
        setRemaining(null);
        return;
      }
      setRemaining(formatRemaining(until - now));
    };

    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [until]);

  if (remaining === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm font-medium text-muted-foreground ${className}`}
      title="До окончания доступности задания"
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>Осталось: {remaining}</span>
    </div>
  );
}

/** Показывает «Просрочено на X» когда availableUntil в прошлом */
export function AvailabilityOverdue({
  availableUntil,
  className = "",
}: {
  availableUntil?: string | null;
  className?: string;
}) {
  const until = useMemo(() => parseUntil(availableUntil), [availableUntil]);
  const [overdue, setOverdue] = useState<string | null>(() => {
    if (until == null) return null;
    const ms = Date.now() - until;
    if (ms <= 0) return null;
    return formatOverdue(ms);
  });

  useEffect(() => {
    if (until == null) {
      setOverdue(null);
      return;
    }
    const update = () => {
      const ms = Date.now() - until;
      if (ms <= 0) {
        setOverdue(null);
        return;
      }
      setOverdue(formatOverdue(ms));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [until]);

  if (overdue === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200 ${className}`}
      title="Задание просрочено"
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>Просрочено на {overdue}</span>
    </div>
  );
}
