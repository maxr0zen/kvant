"use client";

import { useSearchParams } from "next/navigation";
import { createLecture } from "@/lib/api/lectures";
import { LectureEditorForm } from "@/components/lecture-editor-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewLecturePage() {
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId");

  const breadcrumbs = trackId
    ? [{ label: "Треки", href: "/main" }, { label: "Трек", href: `/main/${trackId}` }, { label: "Новая лекция" }]
    : [{ label: "Треки", href: "/main" }, { label: "Новая лекция" }];

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title="Создание лекции"
        description={trackId
          ? "Лекция будет добавлена в трек после сохранения."
          : "Укажите название и добавьте блоки: текст, изображения, код или видео."}
        breadcrumbs={breadcrumbs}
      />
      <LectureEditorForm
        mode="create"
        redirectToTrackAfterCreate={trackId ? { trackId } : undefined}
        onCreate={async (data) => {
          const lecture = await createLecture({
            title: data.title,
            blocks: data.blocks,
            trackId: trackId ?? undefined,
            visibleGroupIds: data.visibleGroupIds.length > 0 ? data.visibleGroupIds : undefined,
            hints: data.hints,
            availableFrom: data.availableFrom,
            availableUntil: data.availableUntil,
            maxAttempts: data.maxAttempts,
          });
          return { id: lecture.id };
        }}
        onUpdate={async () => {}}
      />
    </div>
  );
}
