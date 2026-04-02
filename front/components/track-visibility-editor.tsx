"use client";

import { useEffect, useState } from "react";
import { getStoredRole } from "@/lib/api/auth";
import { updateTrack } from "@/lib/api/tracks";
import { fetchGroups } from "@/lib/api/groups";
import { GroupSelector } from "@/components/group-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Eye, AlertTriangle } from "lucide-react";

interface TrackVisibilityEditorProps {
  trackId: string;
  initialVisibleGroupIds?: string[];
  canEdit: boolean;
}

export function TrackVisibilityEditor({
  trackId,
  initialVisibleGroupIds = [],
  canEdit,
}: TrackVisibilityEditorProps) {
  const { toast } = useToast();
  const [isTeacher, setIsTeacher] = useState(false);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>(initialVisibleGroupIds);
  const [saving, setSaving] = useState(false);
  const [allowedGroupIds, setAllowedGroupIds] = useState<string[] | null>(null);

  useEffect(() => {
    const role = getStoredRole();
    setIsTeacher(role === "teacher" || role === "superuser");
  }, []);

  useEffect(() => {
    setVisibleGroupIds(initialVisibleGroupIds);
  }, [initialVisibleGroupIds]);

  useEffect(() => {
    if (!isTeacher) return;
    let mounted = true;
    fetchGroups()
      .then((groups) => {
        if (!mounted) return;
        setAllowedGroupIds(groups.map((g) => g.id));
      })
      .catch(() => {
        if (!mounted) return;
        setAllowedGroupIds([]);
      });
    return () => {
      mounted = false;
    };
  }, [isTeacher]);

  if (!isTeacher) return null;

  async function handleSave() {
    if (allowedGroupIds == null) {
      toast({
        title: "Подождите",
        description: "Загружаем список ваших групп. Попробуйте сохранить снова через секунду.",
        variant: "destructive",
      });
      return;
    }
    const allowedSet = new Set(allowedGroupIds);
    const payloadVisibleGroupIds = visibleGroupIds.filter((id) => allowedSet.has(id));
    setSaving(true);
    try {
      if (payloadVisibleGroupIds.length !== visibleGroupIds.length) {
        toast({
          title: "Часть групп не сохранена",
          description: "Убраны группы, к которым у вас нет доступа. Сохранены только ваши группы.",
        });
      }
      await updateTrack(trackId, { visibleGroupIds: payloadVisibleGroupIds });
      setVisibleGroupIds(payloadVisibleGroupIds);
      toast({ title: "Сохранено", description: "Область видимости трека обновлена." });
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось сохранить область видимости",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-5 overflow-hidden border-border/80 bg-gradient-to-b from-muted/30 to-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Eye className="h-4 w-4" />
          </span>
          Область видимости
        </CardTitle>
        <CardDescription>
          Настройте, каким группам доступен этот трек.
        </CardDescription>
        {!canEdit && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Вы редактируете видимость оригинального чужого трека.</span>
          </div>
        )}
        {allowedGroupIds && visibleGroupIds.some((id) => !allowedGroupIds.includes(id)) && (
          <div className="mt-2 rounded-lg border border-sky-300/50 bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">
            В текущих настройках есть группы другого учителя. При сохранении будут применены только ваши группы.
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-background/70 p-4">
          <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} disabled={saving} />
        </div>
        <div className="flex items-center justify-end border-t border-border/60 pt-2">
          <Button onClick={handleSave} disabled={saving} className="rounded-lg min-w-[180px]">
            {saving ? "Сохранение..." : "Сохранить видимость"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
