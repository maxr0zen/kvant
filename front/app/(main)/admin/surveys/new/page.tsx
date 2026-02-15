"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getStoredRole } from "@/lib/api/auth";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createSurvey } from "@/lib/api/surveys";
import { Settings2 } from "lucide-react";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import { PageHeader } from "@/components/ui/page-header";

export default function NewSurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId");
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [tempMode, setTempMode] = useState<"none" | "until_date" | "duration">("none");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "teacher" && role !== "superuser") {
      router.replace("/main");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Ошибка", description: "Введите название опроса", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let from: string | undefined;
      let until: string | undefined;
      if (tempMode === "until_date") {
        from = availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : undefined;
        until = availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : undefined;
      } else if (tempMode === "duration") {
        const h = parseInt(durationHours, 10) || 0;
        const m = parseInt(durationMinutes, 10) || 0;
        if (h > 0 || m > 0) {
          from = new Date().toISOString();
          until = new Date(Date.now() + h * 3600000 + m * 60000).toISOString();
        }
      }
      const survey = await createSurvey({
        title: title.trim(),
        prompt: prompt.trim(),
        trackId: trackId ?? undefined,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : undefined,
        availableFrom: from,
        availableUntil: until,
      });
      toast({ title: "Опрос создан" });
      if (trackId) {
        router.push(
          `/main/${trackId}?added=survey&id=${encodeURIComponent(survey.id)}&title=${encodeURIComponent(survey.title)}&type=survey`
        );
      } else {
        router.push(`/surveys/${survey.id}`);
      }
    } catch (err) {
      toast({ title: "Ошибка", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const breadcrumbs = trackId
    ? [{ label: "Треки", href: "/main" }, { label: "Трек", href: `/main/${trackId}` }, { label: "Новый опрос" }]
    : [{ label: "Треки", href: "/main" }, { label: "Новый опрос" }];

  return (
    <div className="space-y-6 w-full max-w-2xl">
      <PageHeader
        title="Создание опроса"
        description={trackId ? "Опрос будет добавлен в трек после сохранения." : "Опрос со свободной формой ответа."}
        breadcrumbs={breadcrumbs}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Основное</CardTitle>
                <CardDescription className="text-sm">Название и описание. Дополнительные настройки — в кнопке справа.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Дополнительное
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Дополнительное</DialogTitle>
                    <CardDescription className="text-sm">
                      Группы и ограничение по времени
                    </CardDescription>
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
                    <div className="space-y-2 border-t pt-5">
                      <Label>Временное задание</Label>
                      <div className="flex flex-wrap gap-2">
                        {([{ value: "none", label: "Всегда доступно" }, { value: "until_date", label: "До даты" }, { value: "duration", label: "По длительности" }] as const).map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border py-2 px-3 hover:bg-muted/50 transition-colors">
                            <input type="radio" name="tempMode" checked={tempMode === opt.value} onChange={() => setTempMode(opt.value)} className="rounded-full border-input" />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      {tempMode === "until_date" && (
                        <div className="grid gap-3 sm:grid-cols-2 pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Доступно с</Label>
                            <Input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Доступно до</Label>
                            <Input type="datetime-local" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} className="h-9" />
                          </div>
                        </div>
                      )}
                      {tempMode === "duration" && (
                        <div className="flex gap-3 items-end pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Часы</Label>
                            <Input type="number" min={0} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} placeholder="0" className="w-20 h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Минуты</Label>
                            <Input type="number" min={0} max={59} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="0" className="w-20 h-9" />
                          </div>
                          <p className="text-xs text-muted-foreground pb-2">С текущего момента</p>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название опроса"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">Описание / вопрос</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Текст вопроса или пояснение для учеников..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="min-w-[160px]">
            {loading ? "Создание..." : "Создать опрос"}
          </Button>
          <Link href={trackId ? `/main/${trackId}` : "/main"}>
            <Button type="button" variant="outline">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
