"use client";

import { useEffect, useState } from "react";
import { fetchLectureById } from "@/lib/api/lectures";
import { OwnerActions } from "@/components/owner-actions";
import { deleteLecture } from "@/lib/api/lectures";

interface LectureHeaderProps {
  lectureId: string;
  title: string;
  /** Если передан — не запрашиваем canEdit отдельно */
  canEdit?: boolean;
}

export function LectureHeader({ lectureId, title, canEdit: canEditProp }: LectureHeaderProps) {
  const [canEditState, setCanEditState] = useState(false);
  const canEdit = canEditProp ?? canEditState;

  useEffect(() => {
    if (canEditProp !== undefined) return;
    let cancelled = false;
    fetchLectureById(lectureId).then((lec) => {
      if (!cancelled) setCanEditState(lec?.canEdit ?? false);
    });
    return () => { cancelled = true; };
  }, [lectureId, canEditProp]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <h1 className="min-w-0 flex-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      {canEdit && (
        <OwnerActions
          canEdit
          compact
          editHref={`/lectures/${lectureId}/edit`}
          onDelete={() => deleteLecture(lectureId)}
          afterDeleteRedirect="/main"
        />
      )}
    </div>
  );
}
