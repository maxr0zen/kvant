import { redirect, notFound } from "next/navigation";
import { fetchLectureById } from "@/lib/api/lectures";

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lecture = await fetchLectureById(id);
  if (!lecture) notFound();

  if (lecture.trackId) {
    redirect(`/tracks/${lecture.trackId}/lesson/${id}`);
  }

  redirect("/tracks");
}
