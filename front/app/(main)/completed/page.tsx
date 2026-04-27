"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Code2, HelpCircle, ListChecks, MessageCircle, Puzzle, Trophy } from "lucide-react";
import { fetchPlatformCompleted, type PlatformCompletedItem } from "@/lib/api/profile";
import { getStoredToken } from "@/lib/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatLateSeconds } from "@/components/availability-countdown";

const TYPE_LABELS: Record<PlatformCompletedItem["lesson_type"], string> = {
  lecture: "Лекция",
  task: "Задание",
  puzzle: "Пазл",
  question: "Вопрос",
  survey: "Опрос",
  layout: "Верстка",
};

const TYPE_ICONS: Record<PlatformCompletedItem["lesson_type"], typeof BookOpen> = {
  lecture: BookOpen,
  task: ListChecks,
  puzzle: Puzzle,
  question: HelpCircle,
  survey: MessageCircle,
  layout: Code2,
};

function lessonHref(item: PlatformCompletedItem): string {
  if (item.lesson_type === "lecture") return `/lectures/${item.lesson_id}`;
  if (item.lesson_type === "task") return `/tasks/${item.lesson_id}`;
  if (item.lesson_type === "puzzle") return `/puzzles/${item.lesson_id}`;
  if (item.lesson_type === "question") return `/questions/${item.lesson_id}`;
  if (item.lesson_type === "layout") return `/layouts/${item.lesson_id}`;
  return `/surveys/${item.lesson_id}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function CompletedPage() {
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [items, setItems] = useState<PlatformCompletedItem[]>([]);

  useEffect(() => {
    setHasToken(Boolean(getStoredToken()));
  }, []);

  useEffect(() => {
    if (hasToken !== true) {
      setLoading(false);
      return;
    }

    let mounted = true;
    fetchPlatformCompleted()
      .then((list) => {
        if (mounted) setItems(list);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [hasToken]);

  if (hasToken === null) {
    return <div className="py-8 text-sm text-muted-foreground">Загрузка...</div>;
  }

  if (!hasToken) {
    return (
      <EmptyState
        title="Требуется авторизация"
        description="Войдите, чтобы видеть завершенные материалы и историю прохождения."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  const completedLate = items.filter((item) => item.status === "completed_late").length;

  return (
    <div className="content-block">
      <section className="hero-surface p-6 sm:p-7 lg:p-8">
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <span className="kavnt-badge">Completed items</span>
            <PageHeader
              title="Завершенные материалы"
              description="История того, что уже пройдено: видно качество завершения, тайминг и быстрый возврат к материалам."
              breadcrumbs={[{ label: "Completed" }]}
              compact
              className="mb-0"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Всего завершено</p>
                  <p className="text-2xl font-semibold tracking-[-0.03em]">{items.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-amber-500/12 text-amber-700 dark:text-amber-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Завершено позже</p>
                  <p className="text-2xl font-semibold tracking-[-0.03em]">{completedLate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">Загрузка...</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Пока нет завершенных заданий"
          description="Когда материалы будут завершены, они появятся здесь с полным контекстом."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.lesson_type];
            const isLate = item.status === "completed_late";

            return (
              <Card key={`${item.lesson_type}-${item.lesson_id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-secondary/72 text-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border/70 bg-background/82 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {TYPE_LABELS[item.lesson_type]}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isLate
                              ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                              : "bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]"
                          }`}
                        >
                          {isLate ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {isLate ? "Completed late" : "Completed"}
                        </span>
                      </div>
                      <CardTitle className="text-base">{item.lesson_title}</CardTitle>
                      <CardDescription>{formatDate(item.completed_at)}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLate && (item.late_by_seconds ?? 0) > 0 ? (
                    <div className="rounded-[1.1rem] bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                      Выполнено с задержкой {formatLateSeconds(item.late_by_seconds ?? 0)}.
                    </div>
                  ) : (
                    <div className="rounded-[1.1rem] bg-secondary/55 px-4 py-3 text-sm text-muted-foreground">
                      Материал завершен вовремя и доступен для повторного просмотра.
                    </div>
                  )}

                  <Link href={lessonHref(item)}>
                    <Button variant="outline" className="w-full justify-between">
                      <span>Открыть материал</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
