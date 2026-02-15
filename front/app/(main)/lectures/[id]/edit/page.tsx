"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchLectureById, updateLecture } from "@/lib/api/lectures";
import { LectureEditorForm } from "@/components/lecture-editor-form";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/loading-skeleton";

export default function LectureEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const [lecture, setLecture] = useState<{
    title: string;
    blocks: Array<unknown>;
    visibleGroupIds: string[];
    hints: string[];
    availableFrom: string;
    availableUntil: string;
    maxAttempts: string;
    canEdit: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchLectureById(id).then((lec) => {
      if (cancelled) return;
      if (!lec) {
        setError("Лекция не найдена");
        setLoading(false);
        return;
      }
      if (!lec.canEdit) {
        setError("Нет прав на редактирование этой лекции");
        setLoading(false);
        return;
      }
      setLecture({
        title: lec.title,
        blocks: (lec.blocks ?? []) as Array<unknown>,
        visibleGroupIds: lec.visibleGroupIds ?? [],
        hints: lec.hints ?? [],
        availableFrom: lec.availableFrom ?? "",
        availableUntil: lec.availableUntil ?? "",
        maxAttempts: lec.maxAttempts != null ? String(lec.maxAttempts) : "",
        canEdit: lec.canEdit ?? false,
      });
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError("Не удалось загрузить лекцию");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (!id || loading) {
    return <PageSkeleton cards={2} />;
  }

  if (error || !lecture) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error || "Лекция не найдена"}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-primary hover:underline"
        >
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <PageHeader
        title="Редактирование лекции"
        description="Внесите изменения в название и блоки лекции."
        breadcrumbs={[{ label: "Треки", href: "/main" }, { label: "Лекция", href: `/lectures/${id}` }, { label: "Редактирование" }]}
      />
      <LectureEditorForm
        mode="edit"
        lectureId={id}
        initialTitle={lecture.title}
        initialBlocks={lecture.blocks as Parameters<typeof LectureEditorForm>[0]["initialBlocks"]}
        initialVisibleGroupIds={lecture.visibleGroupIds}
        initialHints={lecture.hints}
        initialAvailableFrom={lecture.availableFrom}
        initialAvailableUntil={lecture.availableUntil}
        initialMaxAttempts={lecture.maxAttempts}
        onCreate={async () => ({ id: "" })}
        onUpdate={async (data) => {
          await updateLecture(id, {
            title: data.title,
            blocks: data.blocks,
            visibleGroupIds: data.visibleGroupIds,
            hints: data.hints,
            availableFrom: data.availableFrom,
            availableUntil: data.availableUntil,
            maxAttempts: data.maxAttempts,
          });
        }}
      />
    </div>
  );
}
