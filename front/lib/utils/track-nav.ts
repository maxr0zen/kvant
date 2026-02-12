import type { Track, LessonRef } from "@/lib/types";

/**
 * Возвращает предыдущий и следующий урок в треке для текущего элемента.
 */
export function getPrevNextLesson(
  track: Track,
  currentLessonId: string
): { prev: LessonRef | null; next: LessonRef | null } {
  const sorted = [...track.lessons].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((l) => l.id === currentLessonId);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? sorted[index - 1]! : null,
    next: index < sorted.length - 1 ? sorted[index + 1]! : null,
  };
}

/** Ссылка на урок в контексте трека (переключение лекция ↔ задание в одном треке). */
export function getLessonHref(lesson: LessonRef, trackId: string): string {
  return `/main/${trackId}/lesson/${lesson.id}`;
}
