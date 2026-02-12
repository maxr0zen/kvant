"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { parseDateTime } from "@/lib/utils/datetime";

interface AvailabilityNoticeProps {
  availableFrom?: string | null;
  availableUntil?: string | null;
  className?: string;
}

/** Формат даты в UTC, одинаковый на сервере и клиенте — избегает hydration mismatch. */
function formatDate(s: string): string {
  const d = parseDateTime(s);
  if (!d) return s;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function AvailabilityNotice({
  availableFrom,
  availableUntil,
  className,
}: AvailabilityNoticeProps) {
  const { isTemp, text } = useMemo(() => {
    const from = availableFrom ?? null;
    const until = availableUntil ?? null;
    if (!from && !until) return { isTemp: false, text: "" };
    const now = new Date();
    const fromDate = from ? parseDateTime(from) : null;
    const untilDate = until ? parseDateTime(until) : null;
    if (fromDate && fromDate > now) {
      return { isTemp: true, text: `Доступно с ${formatDate(from)}` };
    }
    if (untilDate && untilDate < now) {
      return { isTemp: true, text: `Задание было доступно до ${formatDate(until)}` };
    }
    if (from && until) {
      return { isTemp: true, text: `Временное задание: с ${formatDate(from)} по ${formatDate(until)}` };
    }
    if (from) return { isTemp: true, text: `Доступно с ${formatDate(from)}` };
    if (until) return { isTemp: true, text: `Доступно до ${formatDate(until)}` };
    return { isTemp: false, text: "" };
  }, [availableFrom, availableUntil]);

  if (!isTemp || !text) return null;

  return (
    <Card className={className}>
      <CardContent className="py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 shrink-0" />
        {text}
      </CardContent>
    </Card>
  );
}
