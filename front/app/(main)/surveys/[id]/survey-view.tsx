"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Filter, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import type { Survey } from "@/lib/types";
import {
  acceptSurveyResponse,
  fetchSurveyResponses,
  submitSurveyResponse,
  type SurveyResponseItem,
} from "@/lib/api/surveys";
import { AvailabilityNotice } from "@/components/availability-notice";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/components/lib/utils";

interface SurveyViewProps {
  survey: Survey;
}

function collectGroups(responses: SurveyResponseItem[]) {
  const map = new Map<string, string>();
  const hasUngrouped = responses.some((item) => !item.group_id || !item.group_title);
  if (hasUngrouped) map.set("__none__", "Без группы");
  for (const item of responses) {
    if (item.group_id && item.group_title) map.set(item.group_id, item.group_title);
  }
  return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
}

export function SurveyView({ survey }: SurveyViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [answer, setAnswer] = useState(survey.myResponse ?? "");
  const [submitted, setSubmitted] = useState(Boolean(survey.myResponse));
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<SurveyResponseItem[]>([]);
  const [responsesLoaded, setResponsesLoaded] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [acceptingUserId, setAcceptingUserId] = useState<string | null>(null);

  useEffect(() => {
    setAnswer(survey.myResponse ?? "");
    setSubmitted(Boolean(survey.myResponse));
  }, [survey.myResponse, survey.id]);

  const loadResponses = useCallback(async () => {
    const next = await fetchSurveyResponses(survey.id);
    setResponses(next);
    setResponsesLoaded(true);
  }, [survey.id]);

  useEffect(() => {
    if (!survey.isTeacherOrAdmin) return;
    void loadResponses();
  }, [loadResponses, survey.isTeacherOrAdmin]);

  const groups = useMemo(() => collectGroups(responses), [responses]);

  const filteredResponses = useMemo(() => {
    if (!selectedGroupId) return responses;
    if (selectedGroupId === "__none__") return responses.filter((item) => !item.group_id || !item.group_title);
    return responses.filter((item) => item.group_id === selectedGroupId);
  }, [responses, selectedGroupId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!answer.trim()) {
      toast({ title: "Введите ответ", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await submitSurveyResponse(survey.id, answer.trim());
      setSubmitted(true);
      toast({ title: "Ответ сохранен" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Не удалось отправить ответ",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(userId: string) {
    setAcceptingUserId(userId);
    try {
      await acceptSurveyResponse(survey.id, userId);
      await loadResponses();
      toast({ title: "Ответ принят", description: "Опрос засчитан как выполненный." });
      router.refresh();
    } catch (error) {
      toast({
        title: "Не удалось принять ответ",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setAcceptingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AvailabilityNotice availableFrom={survey.availableFrom} availableUntil={survey.availableUntil} />

      <section className="hero-surface rounded-[2rem] border border-border/60 px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr,0.65fr] lg:items-end">
          <div className="space-y-4">
            <div className="kavnt-badge w-fit">Reflective survey</div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">{survey.title}</h2>
              {survey.prompt ? (
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{survey.prompt}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Статус</p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-foreground">
                {submitted ? "Ответ отправлен" : "Ожидается ответ"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Дедлайн</p>
              <div className="mt-3">
                <AvailabilityCountdown availableUntil={survey.availableUntil} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>{submitted ? "Ваш ответ" : "Напишите ответ"}</CardTitle>
            <CardDescription>
              Текст увидит преподаватель. Можно отправить новый вариант, если хотите уточнить мысль.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted ? (
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 text-sm leading-7 text-foreground whitespace-pre-wrap">
                {answer || "(пусто)"}
              </div>
            ) : null}
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Сформулируйте ответ свободным текстом..."
                className="min-h-[180px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <Button type="submit" disabled={loading} className="gap-2">
                <Send className="h-4 w-4" />
                {loading ? "Сохраняю..." : submitted ? "Обновить ответ" : "Отправить ответ"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Подсказка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                Отвечайте конкретно: полезнее несколько ясных тезисов, чем длинный, но расплывчатый текст.
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                Если вопрос про рефлексию, опишите не только результат, но и вывод, который вы сделали.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {survey.isTeacherOrAdmin && responsesLoaded ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Ответы учеников</CardTitle>
                <CardDescription>Просмотр, фильтрация по группам и ручное принятие ответов.</CardDescription>
              </div>
              {responses.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor="survey-group-filter" className="text-sm font-medium">
                    <Filter className="mr-2 inline h-4 w-4" />
                    Показать
                  </Label>
                  <select
                    id="survey-group-filter"
                    value={selectedGroupId}
                    onChange={(event) => setSelectedGroupId(event.target.value)}
                    className="flex h-11 min-w-[220px] rounded-2xl border border-input bg-background px-4 text-sm"
                  >
                    <option value="">Все ответы</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {responses.length === 0 ? (
              <EmptyState
                icon={MessageSquareText}
                title="Ответов пока нет"
                description="Когда ученики начнут отправлять ответы, они появятся здесь."
              />
            ) : filteredResponses.length === 0 ? (
              <EmptyState
                icon={Filter}
                title="По фильтру пусто"
                description="Снимите фильтр или выберите другую группу."
              />
            ) : (
              filteredResponses.map((response) => (
                <div key={response.user_id} className="rounded-3xl border border-border/70 bg-muted/15 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            response.status === "completed" || response.status === "completed_late"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
                              : "border-border bg-background text-muted-foreground"
                          )}
                        >
                          {response.status === "completed" || response.status === "completed_late" ? "Принято" : "Ожидает принятия"}
                        </span>
                        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {response.group_title || "Без группы"}
                        </span>
                      </div>
                      <div>
                        <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">{response.full_name}</p>
                      </div>
                    </div>

                    {response.status === "completed" || response.status === "completed_late" ? (
                      <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
                        <ShieldCheck className="h-4 w-4" />
                        Ответ принят
                      </div>
                    ) : (
                      <Button onClick={() => void handleAccept(response.user_id)} disabled={acceptingUserId === response.user_id} className="gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        {acceptingUserId === response.user_id ? "Принимаю..." : "Принять ответ"}
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4 text-sm leading-7 text-foreground whitespace-pre-wrap">
                    {response.answer || "(пусто)"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
