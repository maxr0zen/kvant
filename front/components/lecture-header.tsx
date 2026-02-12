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
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      {canEdit && (
        <OwnerActions
          canEdit
          editHref={`/lectures/${lectureId}/edit`}
          onDelete={() => deleteLecture(lectureId)}
          afterDeleteRedirect="/main"
        />
      )}
    </div>
  );
}
