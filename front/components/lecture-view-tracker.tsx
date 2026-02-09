"use client";

import { useEffect } from "react";
import { fetchLectureById } from "@/lib/api/lectures";
import { getStoredToken } from "@/lib/api/auth";

interface LectureViewTrackerProps {
  lectureId: string;
}

/** Отмечает лекцию как просмотренную: fetch с токеном триггерит mark на бэкенде при retrieve. */
export function LectureViewTracker({ lectureId }: LectureViewTrackerProps) {
  useEffect(() => {
    if (!lectureId || typeof window === "undefined") return;
    if (!getStoredToken()) return;
    fetchLectureById(lectureId).catch(() => {});
  }, [lectureId]);
  return null;
}
