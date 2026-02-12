"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createTrack } from "@/lib/api/tracks";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import { ArrowLeft, LayoutList } from "lucide-react";

export default function NewTrackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название трека",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const track = await createTrack({
        title: title.trim(),
        description: description.trim(),
        lessons: [],
        order: 0,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : undefined,
      });
      toast({ title: "Трек создан", description: track.title });
      router.push(`/main/${track.id}`);
    } catch (e) {
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось создать трек",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 w-full max-w-2xl">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Link href="/main">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Назад">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
              <LayoutList className="h-6 w-6 text-primary shrink-0" />
              Создание трека
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Трек объединяет лекции и задачи в один курс. Уроки можно добавить позже.
            </p>
          </div>
        </div>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Основное</CardTitle>
            <CardDescription className="text-sm">Название и описание трека. Группы, которым виден трек.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-medium">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Введение в Python"
                required
                className="rounded-lg h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="font-medium">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание курса"
                rows={4}
                className="rounded-lg resize-y min-h-[100px]"
              />
            </div>
            <div className="pt-2 border-t border-border/60">
              <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={loading} className="rounded-lg min-w-[160px]">
            {loading ? "Создание…" : "Создать трек"}
          </Button>
          <Link href="/main">
            <Button type="button" variant="outline" className="rounded-lg">
              Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
