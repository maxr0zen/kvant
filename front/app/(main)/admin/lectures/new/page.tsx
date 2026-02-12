"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createLecture } from "@/lib/api/lectures";
import { LectureEditorForm } from "@/components/lecture-editor-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function NewLecturePage() {
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId");

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Link href={trackId ? `/main/${trackId}` : "/main"}>
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Назад">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
              <BookOpen className="h-6 w-6 text-primary shrink-0" />
              Создание лекции
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {trackId
                ? "Лекция будет добавлена в трек после сохранения."
                : "Укажите название и добавьте блоки: текст (с форматированием), изображения или код с пояснением и кнопкой «Запустить»."}
            </p>
          </div>
        </div>
      </header>
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
