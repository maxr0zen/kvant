import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AlertCircle, ArrowRight, Sparkles, Star } from "lucide-react";
import { fetchTaskById } from "@/lib/api/tasks";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { TaskView } from "./task-view";
import { PageHeader } from "@/components/ui/page-header";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { TaskOwnerActions } from "./task-owner-actions";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const task = await fetchTaskById(id, token);
  if (!task) notFound();

  const breadcrumbs = task.trackId
    ? [
        { label: "Треки", href: "/main" },
        { label: "Трек", href: `/main/${task.trackId}` },
        { label: task.title },
      ]
    : [{ label: "Треки", href: "/main" }, { label: task.title }];

  return (
    <div className="space-y-6">
      <section className="hero-surface p-6 sm:p-7 lg:p-8">
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <span className="kavnt-badge">Coding workspace</span>
            <PageHeader
              title={task.title}
              description={task.description}
              breadcrumbs={breadcrumbs}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <AvailabilityCountdown availableUntil={task.availableUntil} className="shrink-0" />
                  {task.canEdit && <TaskOwnerActions taskId={id} canEdit={task.canEdit} />}
                </div>
              }
              compact
              className="mb-0"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {task.hard && (
              <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-amber-500/16 text-amber-700 dark:text-amber-300">
                    <Star className="h-5 w-5 fill-current" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Повышенная сложность</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Задача требует более аккуратной проверки и часто включает нетривиальные кейсы.</p>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Implementation-ready paneling</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Инструкции, редактор, тесты и hints разделены на читаемые поверхности без перегруза.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Четкий next action</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Запустить тесты, исправить код и отправить решение можно без лишних переходов между страницами.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TaskView task={task} />
    </div>
  );
}
