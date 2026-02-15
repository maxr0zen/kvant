"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchTracks, type OrphanLecture, type OrphanTask, type OrphanPuzzle, type OrphanQuestion, type OrphanSurvey } from "@/lib/api/tracks";
import { getStoredToken } from "@/lib/api/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ListChecks, Puzzle, HelpCircle, MessageCircle, Clock, CheckCircle2 } from "lucide-react";
import { AvailabilityOverdue } from "@/components/availability-countdown";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";

type OrphanItemType = "lecture" | "task" | "puzzle" | "question" | "survey";

interface OrphanItem {
  id: string;
  title: string;
  type: OrphanItemType;
  availableUntil?: string | null;
  hard?: boolean;
}

const ORPHAN_TYPE_CONFIG: Record<
  OrphanItemType,
  { href: (id: string) => string; label: string; buttonText: string; Icon: typeof BookOpen }
> = {
  lecture: { href: (id) => `/lectures/${id}`, label: "Лекция", buttonText: "Открыть", Icon: BookOpen },
  task: { href: (id) => `/tasks/${id}`, label: "Задание", buttonText: "Открыть", Icon: ListChecks },
  puzzle: { href: (id) => `/puzzles/${id}`, label: "Puzzle", buttonText: "Открыть", Icon: Puzzle },
  question: { href: (id) => `/questions/${id}`, label: "Вопрос", buttonText: "Открыть", Icon: HelpCircle },
  survey: { href: (id) => `/surveys/${id}`, label: "Опрос", buttonText: "Открыть", Icon: MessageCircle },
};

function OrphanCard({ item }: { item: OrphanItem }) {
  const { href, label, buttonText, Icon } = ORPHAN_TYPE_CONFIG[item.type];
  return (
    <Card className="flex flex-col border-amber-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{item.title}</span>
              {item.type === "task" && item.hard && (
                <span className="text-amber-500 text-sm">&#9733;</span>
              )}
            </CardTitle>
            <CardDescription className="mt-0.5 flex items-center gap-1.5">
              {label}
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                Просрочено
              </span>
            </CardDescription>
          </div>
          {item.availableUntil && (
            <AvailabilityOverdue availableUntil={item.availableUntil} className="shrink-0 text-xs" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2 pt-1">
        <p className="text-xs text-muted-foreground">
          Можно сдать, но будет отмечено как выполнение после срока.
        </p>
        <Link href={href(item.id)} className="mt-auto pt-2">
          <Button variant="outline" size="sm" className="w-full">
            {buttonText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function OverduePage() {
  const [data, setData] = useState<{
    orphan_overdue_lectures: OrphanLecture[];
    orphan_overdue_tasks: OrphanTask[];
    orphan_overdue_puzzles: OrphanPuzzle[];
    orphan_overdue_questions: OrphanQuestion[];
    orphan_overdue_surveys: OrphanSurvey[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchTracks()
      .then((d) => {
        if (mounted) {
          setData({
            orphan_overdue_lectures: d.orphan_overdue_lectures ?? [],
            orphan_overdue_tasks: d.orphan_overdue_tasks ?? [],
            orphan_overdue_puzzles: d.orphan_overdue_puzzles ?? [],
            orphan_overdue_questions: d.orphan_overdue_questions ?? [],
            orphan_overdue_surveys: d.orphan_overdue_surveys ?? [],
          });
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const orphanItems = useMemo((): OrphanItem[] => {
    if (!data) return [];
    const list: OrphanItem[] = [];
    for (const l of data.orphan_overdue_lectures) {
      list.push({ id: l.id, title: l.title, type: "lecture", availableUntil: l.available_until });
    }
    for (const t of data.orphan_overdue_tasks) {
      list.push({ id: t.id, title: t.title, type: "task", availableUntil: t.available_until, hard: t.hard });
    }
    for (const p of data.orphan_overdue_puzzles) {
      list.push({ id: p.id, title: p.title, type: "puzzle", availableUntil: p.available_until });
    }
    for (const q of data.orphan_overdue_questions) {
      list.push({ id: q.id, title: q.title, type: "question", availableUntil: q.available_until });
    }
    for (const s of data.orphan_overdue_surveys) {
      list.push({ id: s.id, title: s.title, type: "survey", availableUntil: s.available_until });
    }
    return list;
  }, [data]);

  if (!getStoredToken()) {
    return (
      <EmptyState
        title="Требуется авторизация"
        description="Войдите, чтобы видеть просроченные задания."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Просроченные задания"
        description="Задания с истекшим сроком. Их можно сдать — будет отмечено как выполнение после срока."
        breadcrumbs={[
          { label: "Треки", href: "/main" },
          { label: "Просроченные" },
        ]}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : orphanItems.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Нет просроченных заданий"
          description="Все задания выполнены вовремя."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orphanItems.map((item) => (
            <OrphanCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
