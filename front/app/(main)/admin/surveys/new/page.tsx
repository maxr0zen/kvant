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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createSurvey } from "@/lib/api/surveys";
import { Settings2, ArrowLeft, ClipboardList } from "lucide-react";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";

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

  return (
    <div className="space-y-6 w-full max-w-2xl">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Link href={trackId ? `/main/${trackId}` : "/main"}>
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Назад">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
              <ClipboardList className="h-6 w-6 text-primary shrink-0" />
              Создание опроса
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {trackId
                ? "Опрос будет добавлен в трек после сохранения."
                : "Опрос с свободной формой ответа. Ответы учеников видны в детализации заданий и на странице опроса."}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm border-border/80">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">Основное</CardTitle>
                <CardDescription className="text-sm">Название и описание (вопрос) опроса</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2 rounded-lg">
                    <Settings2 className="h-4 w-4" />
                    Дополнительное
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
                  <DialogHeader>
                    <DialogTitle>Дополнительное</DialogTitle>
                    <CardDescription className="text-sm">
                      Права доступа (группы) и ограничение по времени
                    </CardDescription>
                  </DialogHeader>
                  <div className="space-y-0 pt-2">
                    <div className="pb-5">
                      <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
                    </div>
                    <div className="border-t border-border/60 pt-5 space-y-2">
                      <Label>Временное задание</Label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/60 transition-colors">
                          <input
                            type="radio"
                            name="tempMode"
                            checked={tempMode === "none"}
                            onChange={() => setTempMode("none")}
                            className="rounded-full border-input"
                          />
                          Всегда доступно
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/60 transition-colors">
                          <input
                            type="radio"
                            name="tempMode"
                            checked={tempMode === "until_date"}
                            onChange={() => setTempMode("until_date")}
                            className="rounded-full border-input"
                          />
                          До даты
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/60 transition-colors">
                          <input
                            type="radio"
                            name="tempMode"
                            checked={tempMode === "duration"}
                            onChange={() => setTempMode("duration")}
                            className="rounded-full border-input"
                          />
                          По длительности
                        </label>
                      </div>
                      {tempMode === "until_date" && (
                        <div className="grid gap-2 sm:grid-cols-2 pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Доступно с</Label>
                            <Input
                              type="datetime-local"
                              value={availableFrom}
                              onChange={(e) => setAvailableFrom(e.target.value)}
                              className="text-sm h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Доступно до</Label>
                            <Input
                              type="datetime-local"
                              value={availableUntil}
                              onChange={(e) => setAvailableUntil(e.target.value)}
                              className="text-sm h-9"
                            />
                          </div>
                        </div>
                      )}
                      {tempMode === "duration" && (
                        <div className="flex gap-3 items-end pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Часы</Label>
                            <Input
                              type="number"
                              min={0}
                              value={durationHours}
                              onChange={(e) => setDurationHours(e.target.value)}
                              placeholder="0"
                              className="w-20 h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Минуты</Label>
                            <Input
                              type="number"
                              min={0}
                              max={59}
                              value={durationMinutes}
                              onChange={(e) => setDurationMinutes(e.target.value)}
                              placeholder="0"
                              className="w-20 h-9 text-sm"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground pb-2">Доступно с текущего момента</p>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-medium">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название опроса"
                className="max-w-md rounded-lg h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt" className="font-medium">Описание / вопрос</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Текст вопроса или пояснение для учеников..."
                className="min-h-[100px] rounded-lg resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={loading} className="rounded-lg min-w-[160px]">
            {loading ? "Создание…" : "Создать опрос"}
          </Button>
          <Link href="/main">
            <Button type="button" variant="outline" className="rounded-lg">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
