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
      router.push(`/tracks/${track.id}`);
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
    <div className="space-y-6 w-full max-w-full">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Создание трека
        </h1>
        <p className="text-muted-foreground mt-1">
          Трек объединяет лекции и задачи в один курс. Уроки можно добавить позже.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Основное</CardTitle>
            <CardDescription>Название и описание трека</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Введение в Python"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание курса"
                rows={4}
              />
            </div>
            <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading ? "Создание..." : "Создать трек"}
          </Button>
          <Link href="/tracks">
            <Button type="button" variant="outline">
              Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
