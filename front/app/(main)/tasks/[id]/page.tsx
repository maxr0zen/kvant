import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
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
    : [
        { label: "Треки", href: "/main" },
        { label: task.title },
      ];

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        title={task.title}
        description={task.description}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            <AvailabilityCountdown availableUntil={task.availableUntil} className="shrink-0" />
            {task.canEdit && <TaskOwnerActions taskId={id} canEdit={task.canEdit} />}
          </div>
        }
      />
      {task.hard && (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300">
          <span>&#9733;</span> Повышенная сложность
        </div>
      )}
      <TaskView task={task} />
    </div>
  );
}
