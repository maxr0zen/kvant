"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CodeEditor } from "@/components/editor/code-editor";
import { fetchLayoutById, updateLayout } from "@/lib/api/layouts";
import { fetchTrackById } from "@/lib/api/tracks";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/loading-skeleton";
import type { LayoutSubtask } from "@/lib/types";
import { Trash2, Plus, Settings2 } from "lucide-react";

type LayoutFile = "html" | "css" | "js";
type LayoutCheckType = "selector_exists" | "html_contains" | "css_contains" | "js_contains";

function buildPreviewDoc(html: string, css: string, js: string): string {
  const styleTag = css ? `<style>\n${css}\n</style>` : "";
  const scriptTag = js ? `<script>\n${js}\n</script>` : "";
  let doc = html?.trim() || "";
  if (!doc) doc = "<!DOCTYPE html><html><head></head><body></body></html>";
  if (!doc.toLowerCase().includes("<!doctype") && !doc.toLowerCase().startsWith("<html")) {
    doc = `<!DOCTYPE html><html><head></head><body>${doc}</body></html>`;
  }
  if (styleTag) {
    if (doc.includes("</head>")) doc = doc.replace("</head>", `${styleTag}</head>`);
    else if (doc.includes("<head>")) doc = doc.replace("<head>", `<head>${styleTag}`);
    else doc = doc.replace("<html>", `<html><head>${styleTag}</head>`);
  }
  if (scriptTag) {
    if (doc.includes("</body>")) doc = doc.replace("</body>", `${scriptTag}</body>`);
    else if (doc.includes("<body>")) doc = doc.replace("<body>", `<body>${scriptTag}`);
    else doc = doc.replace("</html>", `<body>${scriptTag}</body></html>`);
  }
  return doc;
}

function toDatetimeLocal(iso: string | undefined | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function EditLayoutPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachedLectureId, setAttachedLectureId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [trackLectures, setTrackLectures] = useState<Array<{ id: string; title: string }>>([]);
  const [templateHtml, setTemplateHtml] = useState("");
  const [templateCss, setTemplateCss] = useState("");
  const [templateJs, setTemplateJs] = useState("");
  const [activeFile, setActiveFile] = useState<LayoutFile>("html");
  const [editableHtml, setEditableHtml] = useState(true);
  const [editableCss, setEditableCss] = useState(true);
  const [editableJs, setEditableJs] = useState(true);
  const [subtasks, setSubtasks] = useState<LayoutSubtask[]>([]);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [tempMode, setTempMode] = useState<"none" | "until_date" | "duration">("none");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    fetchLayoutById(id).then((layout) => {
      if (cancelled || !layout) return;
      if (!layout.canEdit) {
        router.replace(`/layouts/${id}`);
        return;
      }
      setTitle(layout.title);
      setDescription(layout.description ?? "");
      setAttachedLectureId(layout.attachedLectureId ?? "");
      setTrackId(layout.trackId ?? "");
      setTemplateHtml(layout.templateHtml ?? "");
      setTemplateCss(layout.templateCss ?? "");
      setTemplateJs(layout.templateJs ?? "");
      const ed = layout.editableFiles ?? ["html", "css", "js"];
      setEditableHtml(ed.includes("html"));
      setEditableCss(ed.includes("css"));
      setEditableJs(ed.includes("js"));
      setSubtasks(
        (layout.subtasks ?? []).length > 0
          ? layout.subtasks.map((s) => ({
              id: s.id,
              title: s.title,
              checkType: s.checkType,
              checkValue: s.checkValue,
            }))
          : [{ id: "1", title: "Элемент существует", checkType: "selector_exists" as const, checkValue: ".box" }]
      );
      setVisibleGroupIds(layout.visibleGroupIds ?? []);
      setHints((layout.hints ?? []).length > 0 ? layout.hints! : []);
      setAvailableFrom(toDatetimeLocal(layout.availableFrom));
      setAvailableUntil(toDatetimeLocal(layout.availableUntil));
      setTempMode(layout.availableUntil || layout.availableFrom ? "until_date" : "none");
      setMaxAttempts(layout.maxAttempts != null ? String(layout.maxAttempts) : "");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, router]);

  useEffect(() => {
    let cancelled = false;
    if (!trackId) {
      setTrackLectures([]);
      return;
    }
    fetchTrackById(trackId).then((track) => {
      if (cancelled || !track) return;
      const lectures = (track.lessons ?? [])
        .filter((lesson) => lesson.type === "lecture")
        .map((lesson) => ({ id: lesson.id, title: lesson.title }));
      setTrackLectures(lectures);
    });
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  function addSubtask() {
    setSubtasks((prev) => [
      ...prev,
      { id: String(Date.now()), title: "Подзадача", checkType: "selector_exists", checkValue: ".box" },
    ]);
  }

  function updateSubtask(sId: string, patch: Partial<LayoutSubtask>) {
    setSubtasks((prev) => prev.map((s) => (s.id === sId ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Ошибка", description: "Введите название", variant: "destructive" });
      return;
    }
    const editableFiles: ("html" | "css" | "js")[] = [];
    if (editableHtml) editableFiles.push("html");
    if (editableCss) editableFiles.push("css");
    if (editableJs) editableFiles.push("js");
    if (editableFiles.length === 0) {
      toast({ title: "Ошибка", description: "Выберите хотя бы один редактируемый файл", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateLayout(id, {
        title: title.trim(),
        description: description.trim(),
        attachedLectureId: attachedLectureId.trim(),
        templateHtml,
        templateCss,
        templateJs,
        editableFiles,
        subtasks,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : [],
        hints: hints.filter((h) => h.trim()),
        availableFrom: tempMode === "none" ? null : availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : null,
        availableUntil: (() => {
          if (tempMode === "none") return null;
          if (tempMode === "duration") {
            const h = parseInt(durationHours, 10) || 0;
            const m = parseInt(durationMinutes, 10) || 0;
            return new Date(Date.now() + h * 3600000 + m * 60000).toISOString();
          }
          return availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : null;
        })(),
        maxAttempts: maxAttempts.trim() ? parseInt(maxAttempts, 10) : null,
      });
      toast({ title: "Сохранено", description: title });
      router.push(`/layouts/${id}`);
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось сохранить",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton />;

  const activeLanguage = activeFile === "js" ? "javascript" : activeFile;
  const activeValue = activeFile === "html" ? templateHtml : activeFile === "css" ? templateCss : templateJs;
  const setActiveValue = (value: string) => {
    if (activeFile === "html") setTemplateHtml(value);
    else if (activeFile === "css") setTemplateCss(value);
    else setTemplateJs(value);
  };
  const previewDoc = buildPreviewDoc(templateHtml, templateCss, templateJs);

  return (
    <div className="content-block w-full max-w-5xl">
      <PageHeader
        title="Редактирование верстки"
        description={title}
        breadcrumbs={[{ label: "Треки", href: "/main" }, { label: title }]}
        compact
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Основное</CardTitle>
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
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
                    <div className="space-y-2 border-t pt-5">
                      <Label>Подсказки</Label>
                      {hints.map((h, i) => (
                        <div key={i} className="flex gap-2">
                          <Textarea value={h} onChange={(e) => setHints((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} rows={2} className="flex-1 text-sm" />
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => setHints((prev) => prev.filter((_, j) => j !== i))}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setHints((prev) => [...prev, ""])}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Добавить
                      </Button>
                    </div>
                    <div className="space-y-2 border-t pt-5">
                      <Label>Временное задание</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "none", label: "Всегда доступно" },
                          { value: "until_date", label: "До даты" },
                          { value: "duration", label: "По длительности" },
                        ].map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border py-2 px-3 hover:bg-muted/50">
                            <input type="radio" name="tempMode" checked={tempMode === opt.value} onChange={() => setTempMode(opt.value as "none" | "until_date" | "duration")} className="rounded-full border-input" />
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
                        <div className="flex flex-wrap gap-3 items-end pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Часы</Label>
                            <Input type="number" min={0} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className="w-20 h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Минуты</Label>
                            <Input type="number" min={0} max={59} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="w-20 h-9" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 border-t pt-5">
                      <Label htmlFor="maxAttempts">Ограничение попыток</Label>
                      <Input id="maxAttempts" type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="Без ограничения" className="h-9 w-full sm:max-w-[140px]" />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Теория</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachedLecture">Связанная лекция (опционально)</Label>
              {trackId && trackLectures.length > 0 ? (
                <select
                  id="attachedLecture"
                  value={attachedLectureId}
                  onChange={(e) => setAttachedLectureId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Не выбрана</option>
                  {trackLectures.map((lecture) => (
                    <option key={lecture.id} value={lecture.id}>
                      {lecture.title}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="attachedLecture"
                  value={attachedLectureId}
                  onChange={(e) => setAttachedLectureId(e.target.value)}
                  placeholder="ID лекции, например: 67a1c..."
                />
              )}
              <p className="text-xs text-muted-foreground">
                В блоке теории студент увидит кнопку перехода в эту лекцию.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Шаблоны и редактируемые файлы</CardTitle>
            <CardDescription>Отметьте, какие файлы ученик может редактировать</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editableHtml} onChange={(e) => setEditableHtml(e.target.checked)} className="rounded border-input" />
                HTML
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editableCss} onChange={(e) => setEditableCss(e.target.checked)} className="rounded border-input" />
                CSS
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editableJs} onChange={(e) => setEditableJs(e.target.checked)} className="rounded border-input" />
                JS
              </label>
            </div>
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
              <div className="space-y-2">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {(["html", "css", "js"] as LayoutFile[]).map((file) => (
                    <Button
                      key={file}
                      type="button"
                      variant={activeFile === file ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFile(file)}
                    >
                      {file.toUpperCase()}
                    </Button>
                  ))}
                </div>
                <CodeEditor value={activeValue} onChange={setActiveValue} language={activeLanguage} className="code-font-mono" />
              </div>
              <div className="rounded-lg border border-border/80 overflow-hidden bg-card">
                <div className="px-3 py-2 border-b text-xs text-muted-foreground font-medium">Предпросмотр</div>
                <iframe
                  srcDoc={previewDoc}
                  sandbox="allow-scripts"
                  title="Layout template preview"
                  className="w-full h-[260px] border-0 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Подзадачи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subtasks.map((st) => (
              <div key={st.id} className="rounded-lg border p-3 space-y-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Название</Label>
                    <Input value={st.title} onChange={(e) => updateSubtask(st.id, { title: e.target.value })} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Тип</Label>
                    <select value={st.checkType} onChange={(e) => updateSubtask(st.id, { checkType: e.target.value as LayoutCheckType })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="selector_exists">Селектор существует</option>
                      <option value="html_contains">HTML содержит</option>
                      <option value="css_contains">CSS содержит</option>
                      <option value="js_contains">JS содержит</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Значение (селектор или подстрока в HTML/CSS/JS)</Label>
                  <Input value={st.checkValue} onChange={(e) => updateSubtask(st.id, { checkValue: e.target.value })} className="h-9" />
                </div>
                {subtasks.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSubtasks((prev) => prev.filter((s) => s.id !== st.id))}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Удалить
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addSubtask}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Добавить подзадачу
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={saving} className="sm:min-w-[160px]">
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
          <Link href={`/layouts/${id}`}>
            <Button type="button" variant="outline">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
