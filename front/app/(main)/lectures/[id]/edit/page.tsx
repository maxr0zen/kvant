"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchLectureById, updateLecture } from "@/lib/api/lectures";
import { LectureEditorForm } from "@/components/lecture-editor-form";

export default function LectureEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const [lecture, setLecture] = useState<{
    title: string;
    blocks: Array<unknown>;
    visibleGroupIds: string[];
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
    return <div className="text-sm text-muted-foreground">Загрузка...</div>;
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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Редактирование лекции
        </h1>
        <p className="text-muted-foreground mt-1">
          Внесите изменения в название и блоки лекции.
        </p>
      </div>
      <LectureEditorForm
        mode="edit"
        lectureId={id}
        initialTitle={lecture.title}
        initialBlocks={lecture.blocks as Parameters<typeof LectureEditorForm>[0]["initialBlocks"]}
        initialVisibleGroupIds={lecture.visibleGroupIds}
        onCreate={async () => ({ id: "" })}
        onUpdate={async (data) => {
          await updateLecture(id, {
            title: data.title,
            blocks: data.blocks,
            visibleGroupIds: data.visibleGroupIds,
          });
        }}
      />
    </div>
  );
}
