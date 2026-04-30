"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Code2,
  Copy,
  Edit3,
  ExternalLink,
  FileQuestion,
  HelpCircle,
  Layers3,
  ListChecks,
  MessageCircle,
  Puzzle,
  Search,
  ShieldAlert,
  User,
} from "lucide-react";
import { getStoredRole, getStoredToken } from "@/lib/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  fetchTeacherMaterials,
  copyMaterial,
  type TeacherMaterial,
} from "@/lib/api/teacher";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof BookOpen; editHref: (id: string) => string; viewHref: (id: string) => string }
> = {
  lecture: {
    label: "Лекция",
    icon: BookOpen,
    editHref: (id) => `/lectures/${id}/edit`,
    viewHref: (id) => `/lectures/${id}`,
  },
  task: {
    label: "Задача",
    icon: ListChecks,
    editHref: (id) => `/tasks/${id}/edit`,
    viewHref: (id) => `/tasks/${id}`,
  },
  puzzle: {
    label: "Пазл",
    icon: Puzzle,
    editHref: (id) => `/puzzles/${id}/edit`,
    viewHref: (id) => `/puzzles/${id}`,
  },
  question: {
    label: "Вопрос",
    icon: HelpCircle,
    editHref: (id) => `/questions/${id}/edit`,
    viewHref: (id) => `/questions/${id}`,
  },
  survey: {
    label: "Опрос",
    icon: MessageCircle,
    editHref: (id) => `/surveys/${id}`,
    viewHref: (id) => `/surveys/${id}`,
  },
  layout: {
    label: "Верстка",
    icon: Code2,
    editHref: (id) => `/admin/layouts/${id}/edit`,
    viewHref: (id) => `/layouts/${id}`,
  },
};

export default function TeachersMaterialsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<TeacherMaterial[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "teacher" && role !== "superuser") {
      router.replace("/main");
      return;
    }

    fetchTeacherMaterials(getStoredToken())
      .then((data) => {
        const all = [
          ...data.lectures,
          ...data.tasks,
          ...data.puzzles,
          ...data.questions,
          ...data.surveys,
          ...data.layouts,
        ];
        setMaterials(all);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    let result = materials;
    if (typeFilter !== "all") {
      result = result.filter((m) => m.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(q));
    }
    return result;
  }, [materials, typeFilter, search]);

  const mine = filtered.filter((m) => m.can_edit);
  const others = filtered.filter((m) => !m.can_edit);

  async function handleCopy(material: TeacherMaterial) {
    setCopyingId(material.id);
    try {
      const copy = await copyMaterial(material.type, material.id, getStoredToken());
      const config = TYPE_CONFIG[material.type];
      if (config) {
        router.push(config.editHref(copy.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка копирования");
    } finally {
      setCopyingId(null);
    }
  }

  if (loading) {
    return (
      <div className="content-block space-y-8">
        <PageHeader
          title="Материалы преподавателей"
          description="Библиотека материалов: лекции, задачи, пазлы, вопросы, опросы и верстки."
          breadcrumbs={[{ label: "Главная", href: "/main" }, { label: "Материалы преподавателей" }]}
        />
        <PageSkeleton cards={6} />
      </div>
    );
  }

  return (
    <div className="content-block space-y-8">
      <PageHeader
        title="Материалы преподавателей"
        description="Библиотека материалов: лекции, задачи, пазлы, вопросы, опросы и верстки. Возьмите копию чужого материала и адаптируйте под свою группу."
        breadcrumbs={[{ label: "Главная", href: "/main" }, { label: "Материалы преподавателей" }]}
      />

      <section className="hero-surface rounded-[2rem] border border-border/60 px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.3fr,0.7fr] lg:items-end">
          <div className="space-y-4">
            <div className="kavnt-badge w-fit">Teacher library</div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Берите копии и адаптируйте материалы под свои группы
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Каждый преподаватель видит материалы коллег. При нажатии «Взять копию» создается
              независимая копия, которую вы можете редактировать и назначать своим студентам.
            </p>
          </div>

          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="h-4 w-4" />
              Важно
            </div>
            <p className="mt-3 leading-6">
              Редактирование оригинальных материалов доступно только их создателю. Для изменения
              чужого материала создайте свою копию.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:w-[400px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-2xl pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "Все" },
            { value: "lecture", label: "Лекции" },
            { value: "task", label: "Задачи" },
            { value: "puzzle", label: "Пазлы" },
            { value: "question", label: "Вопросы" },
            { value: "survey", label: "Опросы" },
            { value: "layout", label: "Верстки" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                typeFilter === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-8">
        {mine.length > 0 && (
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
              <User className="h-5 w-5 text-primary" />
              Мои материалы
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mine.map((m) => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  copyingId={copyingId}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
              <Layers3 className="h-5 w-5 text-primary" />
              Материалы других преподавателей
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {others.map((m) => (
                <MaterialCard
                  key={m.id}
                  material={m}
                  copyingId={copyingId}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <EmptyState
            icon={Search}
            title="Материалы не найдены"
            description="Попробуйте изменить фильтры или поисковый запрос."
          />
        )}
      </div>
    </div>
  );
}

function MaterialCard({
  material,
  copyingId,
  onCopy,
}: {
  material: TeacherMaterial;
  copyingId: string | null;
  onCopy: (m: TeacherMaterial) => void;
}) {
  const config = TYPE_CONFIG[material.type];
  const Icon = config?.icon ?? FileQuestion;
  const isCopying = copyingId === material.id;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-[var(--shadow-soft)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <span className="kavnt-badge">{config?.label ?? material.type}</span>
          </div>
          {material.copied_from_id && (
            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-700 dark:text-sky-300">
              Копия
            </span>
          )}
        </div>
        <CardTitle className="mt-2 text-base font-semibold leading-snug">
          {material.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap gap-2">
          {material.can_edit ? (
            <>
              <Link href={config?.editHref(material.id) ?? "#"} className="flex-1">
                <Button size="sm" variant="outline" className="w-full gap-2">
                  <Edit3 className="h-4 w-4" />
                  Редактировать
                </Button>
              </Link>
              <Link href={config?.viewHref(material.id) ?? "#"} className="flex-1">
                <Button size="sm" variant="ghost" className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Просмотр
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button
                size="sm"
                className="flex-1 gap-2"
                onClick={() => onCopy(material)}
                disabled={isCopying}
              >
                <Copy className="h-4 w-4" />
                {isCopying ? "Копирование..." : "Взять копию"}
              </Button>
              <Link href={config?.viewHref(material.id) ?? "#"} className="flex-1">
                <Button size="sm" variant="ghost" className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Просмотр
                </Button>
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
