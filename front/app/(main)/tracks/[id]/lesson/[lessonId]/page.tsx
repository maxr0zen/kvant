import { redirect } from "next/navigation";

export default async function TracksLessonRedirectPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  redirect(`/main/${id}/lesson/${lessonId}`);
}
