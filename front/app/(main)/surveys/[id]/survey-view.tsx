"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import type { Survey } from "@/lib/types";
import { submitSurveyResponse, fetchSurveyResponses, type SurveyResponseItem } from "@/lib/api/surveys";
import { AvailabilityNotice } from "@/components/availability-notice";

interface SurveyViewProps {
  survey: Survey;
}

/** Уникальные группы по ответам (включая тех без группы) */
function getGroupsFromResponses(responses: SurveyResponseItem[]): { id: string; title: string }[] {
  const byId = new Map<string, string>();
  const hasUngrouped = responses.some((r) => !r.group_id || !r.group_title);
  if (hasUngrouped) {
    byId.set("__none__", "Без группы");
  }
  for (const r of responses) {
    if (r.group_id && r.group_title) {
      byId.set(r.group_id, r.group_title);
    }
  }
  return Array.from(byId.entries()).map(([id, title]) => ({ id, title }));
}

export function SurveyView({ survey }: SurveyViewProps) {
  const router = useRouter();
  const [answer, setAnswer] = useState(survey.myResponse ?? "");
  const [submitted, setSubmitted] = useState(!!survey.myResponse);
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<SurveyResponseItem[]>([]);
  const [responsesLoaded, setResponsesLoaded] = useState(false);
  /** group_id для фильтрации ответов (пустая = все группы) */
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { toast } = useToast();

  const groups = useMemo(() => getGroupsFromResponses(responses), [responses]);
  const filteredResponses = useMemo(() => {
    if (!selectedGroupId) return responses;
    if (selectedGroupId === "__none__") {
      return responses.filter((r) => !r.group_id || !r.group_title);
    }
    return responses.filter((r) => r.group_id === selectedGroupId);
  }, [responses, selectedGroupId]);

  useEffect(() => {
    if (survey.myResponse != null) {
      setAnswer(survey.myResponse);
      setSubmitted(true);
    }
  }, [survey.myResponse]);

  useEffect(() => {
    if (!survey.isTeacherOrAdmin) return;
    let cancelled = false;
    fetchSurveyResponses(survey.id).then((list) => {
      if (!cancelled) {
        setResponses(list);
        setResponsesLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [survey.id, survey.isTeacherOrAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) {
      toast({ title: "Введите ответ", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await submitSurveyResponse(survey.id, answer.trim());
      setSubmitted(true);
      toast({ title: "Ответ сохранён" });
      router.refresh();
    } catch (err) {
      toast({ title: "Ошибка", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AvailabilityNotice availableFrom={survey.availableFrom} availableUntil={survey.availableUntil} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{survey.title}</h1>
          {survey.prompt && <p className="text-muted-foreground mt-2">{survey.prompt}</p>}
        </div>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ваш ответ</CardTitle>
              <CardDescription>Свободная форма. Ответ будет виден преподавателю.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Введите ваш ответ..."
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={5}
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Отправка..." : "Отправить ответ"}
              </Button>
            </CardContent>
          </Card>
        </form>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ваш ответ сохранён</CardTitle>
            <CardDescription>Вы можете изменить его, отправив новый текст ниже.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{answer || "(пусто)"}</div>
            <form onSubmit={handleSubmit} className="space-y-2">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Изменить ответ..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={3}
              />
              <Button type="submit" variant="outline" size="sm" disabled={loading}>
                {loading ? "Сохранение..." : "Обновить ответ"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {survey.isTeacherOrAdmin && responsesLoaded && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Ответы учеников</CardTitle>
                <CardDescription>Детализация по опросу</CardDescription>
              </div>
              {responses.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="survey-group-filter" className="text-xs whitespace-nowrap">
                    Показать:
                  </Label>
                  <select
                    id="survey-group-filter"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px] font-medium"
                  >
                    <option value="">Все ответы</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет ответов.</p>
            ) : filteredResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                В выбранной группе нет ответов.
              </p>
            ) : selectedGroupId ? (
              <ul className="space-y-4">
                {filteredResponses.map((r) => (
                  <li key={r.user_id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="font-medium text-sm">{r.full_name}</div>
                    <div className="mt-1 text-sm whitespace-pre-wrap rounded bg-muted/50 p-2">{r.answer || "(пусто)"}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const byGroup = new Map<string, { title: string; items: SurveyResponseItem[] }>();
                  for (const r of filteredResponses) {
                    const gid = r.group_id || "__none__";
                    const gtitle = r.group_title || "Без группы";
                    if (!byGroup.has(gid)) byGroup.set(gid, { title: gtitle, items: [] });
                    byGroup.get(gid)!.items.push(r);
                  }
                  return Array.from(byGroup.entries()).map(([gid, { title, items }]) => (
                    <div key={gid}>
                      <h3 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b">
                        {title}
                      </h3>
                      <ul className="space-y-4">
                        {items.map((r) => (
                          <li key={r.user_id} className="border-b pb-3 last:border-0 last:pb-0">
                            <div className="font-medium text-sm">{r.full_name}</div>
                            <div className="mt-1 text-sm whitespace-pre-wrap rounded bg-muted/50 p-2">{r.answer || "(пусто)"}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ));
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
