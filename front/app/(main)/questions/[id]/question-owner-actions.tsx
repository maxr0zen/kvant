"use client";

import { OwnerActions } from "@/components/owner-actions";
import { deleteQuestion } from "@/lib/api/questions";

export function QuestionOwnerActions({ questionId, canEdit }: { questionId: string; canEdit: boolean }) {
  return (
    <OwnerActions
      canEdit={canEdit}
      editHref={`/questions/${questionId}/edit`}
      onDelete={() => deleteQuestion(questionId)}
      afterDeleteRedirect="/main"
    />
  );
}
