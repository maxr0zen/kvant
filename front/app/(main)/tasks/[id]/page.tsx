import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchTaskById } from "@/lib/api/tasks";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { TaskView } from "./task-view";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/main">
            <Button variant="ghost" size="sm">
              К трекам
            </Button>
          </Link>
          {task.trackId && (
            <Link href={`/main/${task.trackId}/lesson/${id}`}>
              <Button variant="outline" size="sm">
                Открыть в треке
              </Button>
            </Link>
          )}
        </div>
        {task.canEdit && <TaskOwnerActions taskId={id} canEdit={task.canEdit} />}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            {task.title}
            {task.hard && (
              <span className="text-amber-500" title="Повышенная сложность">★</span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">{task.description}</p>
        </div>
        <AvailabilityCountdown availableUntil={task.availableUntil} className="shrink-0" />
      </div>
      <TaskView task={task} />
      <div className="pt-4">
        <Link href="/main">
          <Button variant="outline">К списку треков</Button>
        </Link>
      </div>
    </div>
  );
}
