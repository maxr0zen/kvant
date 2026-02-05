import { redirect, notFound } from "next/navigation";
import { fetchTaskById } from "@/lib/api/tasks";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await fetchTaskById(id);
  if (!task) notFound();

  if (task.trackId) {
    redirect(`/tracks/${task.trackId}/lesson/${id}`);
  }

  redirect("/tracks");
}
