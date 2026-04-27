"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-white/50 bg-card/85", className)}>
      <CardContent className="p-5 !pt-5 sm:!pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-[1.75rem] font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
            {description != null && (
              <p className="text-xs leading-5 text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon != null && (
            <div className="rounded-[1rem] border border-border/70 bg-secondary/65 p-3">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
