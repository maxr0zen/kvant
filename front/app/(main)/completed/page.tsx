"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, ListChecks, Puzzle, HelpCircle, BookOpen, MessageCircle, Code2 } from "lucide-react";
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
      month: "2-digit",
      year: "numeric",
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
    // Avoid SSR/CSR mismatch: token is readable only on the client.
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
    return (
      <div className="content-block">
        <PageHeader
          title="Выполненные задания"
          description="Отдельные задания, которые уже зачтены"
          breadcrumbs={[{ label: "Выполненные" }]}
        />
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">Загрузка...</CardContent>
        </Card>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <EmptyState
        title="Требуется авторизация"
        description="Войдите, чтобы видеть выполненные задания."
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
      <PageHeader
        title="Выполненные задания"
        description="Отдельные задания, которые уже зачтены"
        breadcrumbs={[{ label: "Выполненные" }]}
      />

      {loading ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">Загрузка...</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Пока нет выполненных заданий"
          description="Выполненные отдельные задания будут отображаться здесь."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.lesson_type];
            const isLate = item.status === "completed_late";
            return (
              <Card key={`${item.lesson_type}-${item.lesson_id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{item.lesson_title}</span>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span>{TYPE_LABELS[item.lesson_type]}</span>
                    {isLate ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                        <Clock className="h-3 w-3" />
                        После срока
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Выполнено
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.completed_at)}
                    {isLate && (item.late_by_seconds ?? 0) > 0
                      ? ` · Просрочка ${formatLateSeconds(item.late_by_seconds ?? 0)}`
                      : ""}
                  </p>
                  <Link href={lessonHref(item)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Открыть
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
