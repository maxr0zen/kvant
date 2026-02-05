import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import type { LessonRef } from "@/lib/types";
import { getLessonHref } from "@/lib/utils/track-nav";

interface TrackLessonNavProps {
  trackId: string;
  trackTitle?: string;
  prev: LessonRef | null;
  next: LessonRef | null;
  className?: string;
}

export function TrackLessonNav({
  trackId,
  trackTitle,
  prev,
  next,
  className,
}: TrackLessonNavProps) {
  const hasNav = prev || next;

  if (!hasNav) return null;

  return (
    <nav
      className={className}
      aria-label="Навигация по урокам трека"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        {prev ? (
          <Link href={getLessonHref(prev, trackId)} className="order-2 sm:order-1">
            <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 justify-start">
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Предыдущий: {prev.title}
              </span>
            </Button>
          </Link>
        ) : (
          <div className="order-2 sm:order-1 w-full sm:w-auto" />
        )}
        {trackTitle && (
          <Link
            href={`/tracks/${trackId}`}
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground order-1 sm:order-2 shrink-0"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="truncate max-w-[200px]">{trackTitle}</span>
          </Link>
        )}
        {next ? (
          <Link href={getLessonHref(next, trackId)} className="order-3 sm:order-3">
            <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 justify-end sm:justify-start">
              <span className="truncate">
                Следующий: {next.title}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          </Link>
        ) : (
          <div className="order-3 w-full sm:w-auto" />
        )}
      </div>
    </nav>
  );
}
