import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonRef } from "@/lib/types";
import { getLessonHref } from "@/lib/utils/track-nav";

interface TrackLessonNavProps {
  trackId: string;
  trackTitle?: string;
  prev: LessonRef | null;
  next: LessonRef | null;
  className?: string;
}

export function TrackLessonNav({ trackId, trackTitle, prev, next, className }: TrackLessonNavProps) {
  if (!prev && !next) return null;

  return (
    <nav
      className={`rounded-[1.6rem] border border-white/55 bg-background/76 p-3 shadow-[var(--shadow-soft)] backdrop-blur-xl dark:border-white/10 ${className ?? ""}`}
      aria-label="Навигация по урокам трека"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          {prev ? (
            <Link href={getLessonHref(prev, trackId)} className="block">
              <Button variant="ghost" className="h-auto w-full justify-start gap-3 rounded-[1.2rem] px-3 py-3">
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <div className="min-w-0 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Предыдущий</p>
                  <p className="truncate text-sm text-foreground">{prev.title}</p>
                </div>
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>

        {trackTitle && (
          <Link
            href={`/main/${trackId}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-background/82 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span className="max-w-[16rem] truncate">{trackTitle}</span>
          </Link>
        )}

        <div className="min-w-0">
          {next ? (
            <Link href={getLessonHref(next, trackId)} className="block">
              <Button variant="ghost" className="h-auto w-full justify-between gap-3 rounded-[1.2rem] px-3 py-3">
                <div className="min-w-0 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Следующий</p>
                  <p className="truncate text-sm text-foreground">{next.title}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </nav>
  );
}
