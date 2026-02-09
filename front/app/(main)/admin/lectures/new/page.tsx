"use client";

import { createLecture } from "@/lib/api/lectures";
import { LectureEditorForm } from "@/components/lecture-editor-form";

export default function NewLecturePage() {
  return (
    <div className="space-y-6 w-full max-w-full">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Создание лекции
        </h1>
        <p className="text-muted-foreground mt-1">
          Укажите название и добавьте блоки: текст (с форматированием), изображения или код с пояснением и кнопкой «Запустить».
        </p>
      </div>
      <LectureEditorForm
        mode="create"
        onCreate={async (data) => {
          const lecture = await createLecture({
            title: data.title,
            blocks: data.blocks,
            visibleGroupIds: data.visibleGroupIds.length > 0 ? data.visibleGroupIds : undefined,
          });
          return { id: lecture.id };
        }}
        onUpdate={async () => {}}
      />
    </div>
  );
}
