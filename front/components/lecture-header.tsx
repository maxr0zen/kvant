"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { fetchLectureById } from "@/lib/api/lectures";

interface LectureHeaderProps {
  lectureId: string;
  title: string;
}

export function LectureHeader({ lectureId, title }: LectureHeaderProps) {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLectureById(lectureId).then((lec) => {
      if (cancelled) return;
      setCanEdit(lec?.canEdit ?? false);
    });
    return () => { cancelled = true; };
  }, [lectureId]);

  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      {canEdit && (
        <Link href={`/lectures/${lectureId}/edit`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="h-4 w-4" />
            Редактировать
          </Button>
        </Link>
      )}
    </div>
  );
}
