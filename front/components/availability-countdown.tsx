"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { parseDateTime } from "@/lib/utils/datetime";
import { useNow } from "@/lib/hooks/use-now";

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

  const now = useNow(1000);

  if (until == null) return null;
  const ms = until - now;
  if (ms <= 0) return null;

  const remaining = formatRemaining(ms);

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
  compact = false,
  iconOnly = false,
}: {
  availableUntil?: string | null;
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const until = useMemo(() => parseUntil(availableUntil), [availableUntil]);

  const now = useNow(1000);

  if (until == null) return null;
  const ms = now - until;
  if (ms <= 0) return null;

  const overdue = formatOverdue(ms);

  return (
    <div
      className={`inline-flex items-center rounded-md border border-amber-500/40 bg-amber-500/10 font-medium text-amber-800 dark:text-amber-200 ${compact ? "gap-1 px-2 py-1 text-xs" : "gap-2 px-3 py-1.5 text-sm"} ${className}`}
      title={iconOnly ? `Просрочено на ${overdue}` : "Задание просрочено"}
      aria-label={`Просрочено на ${overdue}`}
    >
      <Clock className={`${compact ? "h-3 w-3" : "h-4 w-4"} shrink-0`} />
      {!iconOnly && <span>{compact ? `${overdue}` : `Просрочено на ${overdue}`}</span>}
    </div>
  );
}
