"use client";

import { OwnerActions } from "@/components/owner-actions";
import { deleteTrack } from "@/lib/api/tracks";

export function TrackOwnerActions({
  trackId,
  canEdit,
}: {
  trackId: string;
  canEdit: boolean;
}) {
  return (
    <OwnerActions
      canEdit={canEdit}
      onDelete={() => deleteTrack(trackId)}
      afterDeleteRedirect="/main"
      deleteLabel="Удалить трек"
      deleteDescription="Это действие нельзя отменить. Трек будет удалён безвозвратно."
    />
  );
}
