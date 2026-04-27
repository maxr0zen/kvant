"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Clock, HelpCircle, ListChecks, MessageCircle, Puzzle } from "lucide-react";
import { fetchTracks, type OrphanLecture, type OrphanPuzzle, type OrphanQuestion, type OrphanSurvey, type OrphanTask } from "@/lib/api/tracks";
import { getStoredToken } from "@/lib/api/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  { href: (id: string) => string; label: string; action: string; Icon: typeof BookOpen }
> = {
  lecture: { href: (id) => `/lectures/${id}`, label: "Лекция", action: "Открыть лекцию", Icon: BookOpen },
  task: { href: (id) => `/tasks/${id}`, label: "Задание", action: "Открыть задание", Icon: ListChecks },
  puzzle: { href: (id) => `/puzzles/${id}`, label: "Пазл", action: "Открыть пазл", Icon: Puzzle },
  question: { href: (id) => `/questions/${id}`, label: "Вопрос", action: "Открыть вопрос", Icon: HelpCircle },
  survey: { href: (id) => `/surveys/${id}`, label: "Опрос", action: "Открыть опрос", Icon: MessageCircle },
};

function OrphanCard({ item }: { item: OrphanItem }) {
  const { href, label, action, Icon } = ORPHAN_TYPE_CONFIG[item.type];

  return (
    <Card className="border-amber-500/18 bg-card/88">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-amber-500/12 text-amber-700 dark:text-amber-300">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/70 bg-background/82 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                <Clock className="h-3 w-3" />
                Overdue
              </span>
            </div>
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription>Можно завершить, но система отметит это как выполнение после срока.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.availableUntil && <AvailabilityOverdue availableUntil={item.availableUntil} />}
        <Link href={href(item.id)}>
          <Button variant="outline" className="w-full justify-between">
            <span>{action}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function OverduePage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<{
    orphan_overdue_lectures: OrphanLecture[];
    orphan_overdue_tasks: OrphanTask[];
    orphan_overdue_puzzles: OrphanPuzzle[];
    orphan_overdue_questions: OrphanQuestion[];
    orphan_overdue_surveys: OrphanSurvey[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!getStoredToken()) {
      setLoading(false);
      return;
    }

    let active = true;
    fetchTracks()
      .then((response) => {
        if (!active) return;
        setData({
          orphan_overdue_lectures: response.orphan_overdue_lectures ?? [],
          orphan_overdue_tasks: response.orphan_overdue_tasks ?? [],
          orphan_overdue_puzzles: response.orphan_overdue_puzzles ?? [],
          orphan_overdue_questions: response.orphan_overdue_questions ?? [],
          orphan_overdue_surveys: response.orphan_overdue_surveys ?? [],
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mounted]);

  const orphanItems = useMemo((): OrphanItem[] => {
    if (!data) return [];

    return [
      ...data.orphan_overdue_lectures.map((item) => ({
        id: item.id,
        title: item.title,
        type: "lecture" as const,
        availableUntil: item.available_until,
      })),
      ...data.orphan_overdue_tasks.map((item) => ({
        id: item.id,
        title: item.title,
        type: "task" as const,
        availableUntil: item.available_until,
        hard: item.hard,
      })),
      ...data.orphan_overdue_puzzles.map((item) => ({
        id: item.id,
        title: item.title,
        type: "puzzle" as const,
        availableUntil: item.available_until,
      })),
      ...data.orphan_overdue_questions.map((item) => ({
        id: item.id,
        title: item.title,
        type: "question" as const,
        availableUntil: item.available_until,
      })),
      ...data.orphan_overdue_surveys.map((item) => ({
        id: item.id,
        title: item.title,
        type: "survey" as const,
        availableUntil: item.available_until,
      })),
    ];
  }, [data]);

  if (!mounted) return null;

  if (!getStoredToken()) {
    return (
      <EmptyState
        title="Требуется авторизация"
        description="Войдите, чтобы видеть просроченные задания и возвращаться к ним осознанно."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="content-block">
      <section className="hero-surface p-6 sm:p-7 lg:p-8">
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <span className="kavnt-badge">Overdue items</span>
            <PageHeader
              title="Просроченные материалы"
              description="Точка триажа для материалов с истекшим сроком. Здесь приоритет читается быстро, а следующий шаг остается понятным."
              breadcrumbs={[{ label: "Overdue" }]}
              compact
              className="mb-0"
            />
          </div>

          <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/10 p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-amber-500/16 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold tracking-[-0.02em]">Supportive urgency</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Экран не наказывает визуально, а помогает быстро выбрать, что закрыть первым и почему это важно.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : orphanItems.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Нет просроченных заданий"
          description="Все материалы в порядке: ничего не требует срочного внимания."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {orphanItems.map((item) => (
            <OrphanCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
