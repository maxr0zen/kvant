"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/lib/utils";

export interface GaugeCardProps {
  title: string;
  value: number;
  max?: number;
  unit?: string;
  /** For RAM: show "used / total" instead of percent */
  used?: number;
  total?: number;
  className?: string;
}

export function GaugeCard({
  title,
  value,
  max = 100,
  unit = "%",
  used,
  total,
  className,
}: GaugeCardProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const displayValue = used != null && total != null && total > 0
    ? `${used} / ${total}`
    : `${value}${unit}`;
  const gaugePercent = used != null && total != null && total > 0
    ? Math.min(100, Math.round((used / total) * 100))
    : percent;

  // Semi-circle: 180deg = 100%
  const rotation = (gaugePercent / 100) * 180;

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative mx-auto h-24 w-32">
          <svg viewBox="0 0 120 80" className="h-full w-full">
            {/* Background arc */}
            <path
              d="M 10 70 A 50 50 0 0 1 110 70"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d="M 10 70 A 50 50 0 0 1 110 70"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(rotation / 180) * 157} 157`}
            />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 text-center">
            <span className="text-xl font-semibold tabular-nums">{displayValue}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
