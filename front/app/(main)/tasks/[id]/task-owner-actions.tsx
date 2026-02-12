"use client";

import { OwnerActions } from "@/components/owner-actions";
import { deleteTask } from "@/lib/api/tasks";

export function TaskOwnerActions({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  return (
    <OwnerActions
      canEdit={canEdit}
      editHref={`/tasks/${taskId}/edit`}
      onDelete={() => deleteTask(taskId)}
      afterDeleteRedirect="/main"
    />
  );
}
