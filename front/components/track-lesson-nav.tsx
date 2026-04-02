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
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-4">
        {prev ? (
          <Link href={getLessonHref(prev, trackId)} className="block w-full min-w-0 max-w-full lg:w-auto lg:justify-self-start">
            <Button variant="outline" size="sm" className="w-full min-w-0 max-w-full overflow-hidden gap-1.5 justify-start lg:w-auto">
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="block sm:hidden truncate text-left">Назад</span>
              <span className="hidden sm:block lg:hidden truncate text-left">Предыдущий</span>
              <span className="hidden lg:block 2xl:hidden truncate text-left">Предыдущий</span>
              <span className="hidden 2xl:block min-w-0 truncate text-left">Предыдущий: {prev.title}</span>
            </Button>
          </Link>
        ) : (
          <div className="hidden lg:block" />
        )}
        {trackTitle && (
          <Link
            href={`/main/${trackId}`}
            className="min-w-0 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:justify-self-center"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span className="truncate max-w-[65vw] sm:max-w-[320px] lg:max-w-[220px] xl:max-w-[320px] 2xl:max-w-[420px]">{trackTitle}</span>
          </Link>
        )}
        {next ? (
          <Link href={getLessonHref(next, trackId)} className="block w-full min-w-0 max-w-full lg:w-auto lg:justify-self-end">
            <Button variant="outline" size="sm" className="w-full min-w-0 max-w-full overflow-hidden gap-1.5 justify-start lg:w-auto">
              <span className="block sm:hidden truncate text-left">Вперед</span>
              <span className="hidden sm:block lg:hidden truncate text-left">Следующий</span>
              <span className="hidden lg:block 2xl:hidden truncate text-left">Следующий</span>
              <span className="hidden 2xl:block min-w-0 truncate text-left">Следующий: {next.title}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          </Link>
        ) : (
          <div className="hidden lg:block" />
        )}
      </div>
    </nav>
  );
}
