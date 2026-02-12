"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

interface OwnerActionsProps {
  canEdit: boolean;
  editHref?: string;
  editLabel?: string;
  deleteLabel?: string;
  deleteDescription?: string;
  onDelete: () => Promise<void>;
  afterDeleteRedirect: string;
}

export function OwnerActions({
  canEdit,
  editHref,
  editLabel = "Редактировать",
  deleteLabel = "Удалить",
  deleteDescription = "Это действие нельзя отменить. Задание будет удалено безвозвратно.",
  onDelete,
  afterDeleteRedirect,
}: OwnerActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  if (!canEdit) return null;

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
      setOpen(false);
      router.push(afterDeleteRedirect);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {editHref && (
        <Link href={editHref}>
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="h-4 w-4" />
            {editLabel}
          </Button>
        </Link>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            {deleteLabel}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить?</DialogTitle>
            <DialogDescription>
              {deleteDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
