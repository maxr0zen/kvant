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
import { BookOpen, ListChecks, Puzzle, HelpCircle, MessageCircle, ArrowLeft, Clock } from "lucide-react";
import { AvailabilityOverdue } from "@/components/availability-countdown";

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
  lecture: { href: (id) => `/lectures/${id}`, label: "Лекция", buttonText: "Открыть лекцию", Icon: BookOpen },
  task: { href: (id) => `/tasks/${id}`, label: "Задание", buttonText: "Открыть задание", Icon: ListChecks },
  puzzle: { href: (id) => `/puzzles/${id}`, label: "Puzzle", buttonText: "Открыть puzzle", Icon: Puzzle },
  question: { href: (id) => `/questions/${id}`, label: "Вопрос", buttonText: "Открыть вопрос", Icon: HelpCircle },
  survey: { href: (id) => `/surveys/${id}`, label: "Опрос", buttonText: "Открыть опрос", Icon: MessageCircle },
};

function OrphanCard({ item }: { item: OrphanItem }) {
  const { href, label, buttonText, Icon } = ORPHAN_TYPE_CONFIG[item.type];
  return (
    <Card className="flex flex-col border-amber-500/20 hover:border-amber-500/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              <Icon className="h-5 w-5 shrink-0" />
              {item.title}
              {item.type === "task" && item.hard && (
                <span className="text-amber-500" title="Повышенная сложность">★</span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                <Clock className="h-3 w-3" />
                Просрочено
              </span>
            </CardTitle>
            <CardDescription>{label}</CardDescription>
          </div>
          {item.availableUntil && (
            <AvailabilityOverdue availableUntil={item.availableUntil} className="shrink-0 text-xs" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Задание можно сдать, но оно будет отмечено как выполненное после срока.
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
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Войдите, чтобы видеть просроченные задания.</p>
        <Link href="/login">
          <Button>Войти</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/main">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-500" />
            Просроченные задания
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Задания с истёкшим сроком. Их можно сдать — будет отмечено как выполнение после срока.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : orphanItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Нет просроченных заданий.
            </p>
          </CardContent>
        </Card>
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
