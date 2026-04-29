"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeEditor } from "@/components/editor/code-editor";
import { CodeHighlight } from "@/components/code-highlight";
import type { AchievementUnlocked, Layout, Lecture } from "@/lib/types";
import { checkLayout, fetchLayoutDraft, saveLayoutDraft } from "@/lib/api/layouts";
import { fetchLectureById } from "@/lib/api/lectures";
import { hasApi } from "@/lib/api/client";
import { getStoredToken } from "@/lib/api/auth";
import { HintsBlock } from "@/components/hints-block";
import { AvailabilityNotice } from "@/components/availability-notice";
import { LectureBlocks } from "@/app/(main)/lectures/[id]/lecture-blocks";
import { LegacyLectureContent } from "@/app/(main)/lectures/[id]/legacy-lecture-content";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { AchievementUnlockCelebration } from "@/components/achievement-unlock-celebration";

const DRAFT_SAVE_DELAY_MS = 1500;
const CHECK_DEBOUNCE_MS = 800;
type LayoutFile = "html" | "css" | "js";
const FILE_TABS: { id: LayoutFile; label: string }[] = [
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "js", label: "JS" },
];

function buildFallbackLecture(layout: Layout): Lecture | null {
  const content = (layout.description || "").trim();
  if (!content) return null;
  return {
    id: layout.id,
    title: `Теория: ${layout.title}`,
    content,
  };
}

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

export function LayoutView({
  layout,
  initialAttachedLecture = null,
}: {
  layout: Layout;
  /** Предзагрузка с сервера (обходит проблемы с JWT и ускоряет вкладку «Теория»). */
  initialAttachedLecture?: Lecture | null;
}) {
  const router = useRouter();
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [editorWidth, setEditorWidth] = useState(54);
  const [wideLayout, setWideLayout] = useState(false);
  const [contentMode, setContentMode] = useState<"assignment" | "lecture">("assignment");
  const editable = new Set(layout.editableFiles);
  const [activeFile, setActiveFile] = useState<LayoutFile>("html");
  const [html, setHtml] = useState(layout.templateHtml);
  const [css, setCss] = useState(layout.templateCss);
  const [js, setJs] = useState(layout.templateJs);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [checkResult, setCheckResult] = useState<{ passed: boolean; subtasks: { id: string; title: string; passed: boolean; message: string }[] } | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkErrors, setCheckErrors] = useState<string[]>([]);
  const [checkWarnings, setCheckWarnings] = useState<string[]>([]);
  const [abuseFlags, setAbuseFlags] = useState<string[]>([]);
  const [attachedLecture, setAttachedLecture] = useState<Lecture | null>(null);
  const [lectureLoading, setLectureLoading] = useState(false);
  const [lectureError, setLectureError] = useState<string | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<AchievementUnlocked[]>([]);
  const shownAchievementIds = useRef<Set<string>>(new Set());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedLectureId =
    layout.attachedLectureId?.trim() || layout.attachedLecture?.id?.trim() || "";
  const hasAttachedLecture = Boolean(resolvedLectureId);

  useEffect(() => {
    if (!hasApi() || !getStoredToken()) {
      setDraftLoaded(true);
      return;
    }
    let cancelled = false;
    fetchLayoutDraft(layout.id).then((draft) => {
      if (!cancelled && draft) {
        setHtml(draft.html || layout.templateHtml);
        setCss(draft.css || layout.templateCss);
        setJs(draft.js || layout.templateJs);
      }
      if (!cancelled) setDraftLoaded(true);
    });
    return () => { cancelled = true; };
  }, [layout.id, layout.templateHtml, layout.templateCss, layout.templateJs]);

  const scheduleSaveDraft = useCallback(() => {
    if (!hasApi() || !getStoredToken()) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveLayoutDraft(layout.id, html, css, js);
    }, DRAFT_SAVE_DELAY_MS);
  }, [layout.id, html, css, js]);

  useEffect(() => {
    if (!draftLoaded) return;
    scheduleSaveDraft();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [draftLoaded, html, css, js, scheduleSaveDraft]);

  const runCheck = useCallback(() => {
    if (!hasApi()) return;
    checkLayout(layout.id, html, css, js).then((res) => {
      setCheckResult(res);
      setCheckError(res.error ?? null);
      setCheckErrors(res.errors ?? []);
      setCheckWarnings(res.warnings ?? []);
      setAbuseFlags(res.abuseFlags ?? []);
      if (res.passed && Array.isArray(res.unlockedAchievements) && res.unlockedAchievements.length > 0) {
        const fresh = res.unlockedAchievements.filter(
          (a) => a.id && !shownAchievementIds.current.has(a.id)
        );
        if (fresh.length > 0) {
          for (const a of fresh) shownAchievementIds.current.add(a.id);
          setUnlockedAchievements(fresh);
        }
      }
      if (res.passed) router.refresh();
    });
  }, [layout.id, html, css, js, router]);

  useEffect(() => {
    if (!draftLoaded) return;
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(() => {
      checkTimeoutRef.current = null;
      runCheck();
    }, CHECK_DEBOUNCE_MS);
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [draftLoaded, html, css, js, runCheck]);

  useEffect(() => {
    const saveOnLeave = () => {
      if (hasApi() && getStoredToken() && draftLoaded) {
        const changed =
          html !== layout.templateHtml || css !== layout.templateCss || js !== layout.templateJs;
        if (changed) saveLayoutDraft(layout.id, html, css, js, true);
      }
    };
    window.addEventListener("beforeunload", saveOnLeave);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveOnLeave();
    });
    return () => {
      window.removeEventListener("beforeunload", saveOnLeave);
    };
  }, [layout.id, layout.templateHtml, layout.templateCss, layout.templateJs, html, css, js, draftLoaded]);

  const previewDoc = buildPreviewDoc(html, css, js);
  const allPassed = checkResult?.passed ?? false;
  const activeLanguage = activeFile === "js" ? "javascript" : activeFile;
  const activeValue = activeFile === "html" ? html : activeFile === "css" ? css : js;
  const isActiveEditable = editable.has(activeFile);

  const setActiveValue = useCallback(
    (value: string) => {
      if (activeFile === "html") {
        setHtml(value);
      } else if (activeFile === "css") {
        setCss(value);
      } else {
        setJs(value);
      }
    },
    [activeFile]
  );

  useEffect(() => {
    if (!hasAttachedLecture && contentMode === "lecture") {
      setContentMode("assignment");
    }
  }, [contentMode, hasAttachedLecture]);

  useEffect(() => {
    const lectureId = resolvedLectureId;
    if (!lectureId || contentMode !== "lecture") return;

    if (layout.attachedLecture && layout.attachedLecture.id === lectureId) {
      setAttachedLecture(layout.attachedLecture);
      setLectureError(null);
      setLectureLoading(false);
      return;
    }

    if (initialAttachedLecture?.id === lectureId) {
      setAttachedLecture(initialAttachedLecture);
      setLectureError(null);
      setLectureLoading(false);
      return;
    }

    let active = true;
    setLectureLoading(true);
    setLectureError(null);
    // Без Authorization: retrieve лекции с AllowAny; иначе просроченный JWT даёт 401 и «лекция не найдена».
    fetchLectureById(lectureId, undefined, { skipAuth: true })
      .then((lecture) => {
        if (!active) return;
        if (!lecture) {
          const fallback = buildFallbackLecture(layout);
          setAttachedLecture(fallback);
          setLectureError(fallback ? null : "Лекция не найдена или недоступна.");
          return;
        }
        setAttachedLecture(lecture);
      })
      .catch(() => {
        if (!active) return;
        const fallback = buildFallbackLecture(layout);
        setAttachedLecture(fallback);
        setLectureError(fallback ? null : "Не удалось загрузить лекцию.");
      })
      .finally(() => {
        if (active) setLectureLoading(false);
      });
    return () => {
      active = false;
    };
  }, [resolvedLectureId, layout, layout.attachedLecture, contentMode, initialAttachedLecture]);

  useEffect(() => {
    const onChange = () => setWideLayout(window.innerWidth >= 1280);
    onChange();
    window.addEventListener("resize", onChange);
    return () => window.removeEventListener("resize", onChange);
  }, []);

  useEffect(() => {
    const root = splitRef.current;
    if (!root || !wideLayout) return;

    let dragging = false;

    const stopDragging = () => {
      dragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const onMove = (event: MouseEvent) => {
      if (!dragging || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      if (!rect.width) return;
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(35, Math.min(65, next));
      setEditorWidth(clamped);
    };

    const onHandleDown = (event: MouseEvent) => {
      dragging = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      event.preventDefault();
    };

    const onHandleMouseDown: EventListener = (event) => {
      onHandleDown(event as MouseEvent);
    };

    const handle = root.querySelector("[data-layout-split-handle='true']");
    if (!handle) return;
    handle.addEventListener("mousedown", onHandleMouseDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stopDragging);

    return () => {
      handle.removeEventListener("mousedown", onHandleMouseDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stopDragging);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [wideLayout]);

  return (
    <>
      <div className="space-y-6">
      <AvailabilityNotice availableFrom={layout.availableFrom} availableUntil={layout.availableUntil} />
      {hasAttachedLecture && (
        <div className="overflow-x-auto">
          <div className="inline-flex rounded-xl border border-border/70 bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setContentMode("assignment")}
              className={[
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200",
                contentMode === "assignment"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/70",
              ].join(" ")}
            >
              Задание
            </button>
            <button
              type="button"
              onClick={() => setContentMode("lecture")}
              className={[
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200",
                contentMode === "lecture"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/70",
              ].join(" ")}
            >
              Лекция
            </button>
          </div>
        </div>
      )}

      {contentMode === "lecture" ? (
        <Card className="min-w-0">
          <CardHeader className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {attachedLecture?.title ?? "Теория по заданию"}
              </CardTitle>
              {resolvedLectureId && (
                <Link href={`/lectures/${resolvedLectureId}?layoutId=${encodeURIComponent(layout.id)}`}>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    Открыть отдельно
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {lectureLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка лекции...</p>
            ) : lectureError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {lectureError}
              </div>
            ) : attachedLecture?.blocks && attachedLecture.blocks.length > 0 ? (
              <LectureBlocks blocks={attachedLecture.blocks} lectureId={attachedLecture.id} />
            ) : attachedLecture?.content ? (
              <div className="rounded-xl border bg-muted/20 px-6 py-5 prose prose-sm dark:prose-invert max-w-none">
                <LegacyLectureContent content={attachedLecture.content} />
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="Содержимое пусто"
                description="В прикрепленной лекции пока нет материалов."
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            ref={splitRef}
            className="grid grid-cols-1 items-stretch gap-3"
            style={{
              gridTemplateColumns: wideLayout
                ? `minmax(0, ${editorWidth}fr) 16px minmax(0, ${100 - editorWidth}fr)`
                : "minmax(0, 1fr)",
            }}
          >
            <Card
              className="min-w-0 overflow-hidden"
              style={{ width: "100%" }}
            >
              <CardHeader className="space-y-3 pb-3">
                <CardTitle className="text-base">Редактор</CardTitle>
                <div className="overflow-x-auto">
                  <div className="inline-flex min-w-[240px] rounded-xl border border-border/70 bg-muted/40 p-1">
                    {FILE_TABS.map(({ id, label }) => {
                      const isActive = activeFile === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setActiveFile(id)}
                          className={[
                            "relative flex-1 whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium",
                            "transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-background/70",
                          ].join(" ")}
                          aria-pressed={isActive}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div key={activeFile} className="transition-opacity duration-200 ease-out animate-in fade-in-0">
                  {isActiveEditable ? (
                    <CodeEditor value={activeValue} onChange={setActiveValue} language={activeLanguage} className="code-font-mono" />
                  ) : (
                    <div className="relative rounded-lg border border-border/80 overflow-hidden bg-card" data-testid={`read-only-${activeFile}`}>
                      <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        <span>{activeFile.toUpperCase()} (только чтение)</span>
                      </div>
                      <CodeHighlight code={activeValue} language={activeLanguage} className="min-h-[240px]" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <button
              type="button"
              aria-label="Изменить ширину редактора и превью"
              data-layout-split-handle="true"
              className="group hidden w-4 cursor-col-resize items-center justify-center rounded-md border border-border/60 bg-muted/40 p-0"
              style={{ display: wideLayout ? "flex" : "none" }}
            >
              <span className="h-16 w-1 rounded bg-border/80 transition-colors group-hover:bg-primary/70" />
            </button>

            <Card className="overflow-hidden min-w-0">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Превью</CardTitle>
                  <p className="text-xs text-muted-foreground">Обновляется автоматически</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <iframe
                  srcDoc={previewDoc}
                  sandbox="allow-scripts"
                  title="Preview"
                  className="w-full h-[460px] border-0 rounded-b-lg bg-background dark:bg-zinc-900"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-4 min-w-0">
              {checkError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {checkError}
                </div>
              )}
              {checkErrors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive space-y-1">
                  <p className="font-medium">Зачёт недоступен: исправьте синтаксические ошибки.</p>
                  {checkErrors.map((msg) => (
                    <p key={msg}>{msg}</p>
                  ))}
                </div>
              )}
              {checkWarnings.length > 0 && (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  {checkWarnings.join(" ")}
                </div>
              )}
              {abuseFlags.length > 0 && (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  Обнаружены подозрительные паттерны: {abuseFlags.join(", ")}
                </div>
              )}
              {((checkResult?.subtasks?.length ?? 0) > 0 || layout.subtasks.length > 0) && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Подзадачи и прогресс</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(checkResult?.subtasks ?? layout.subtasks).map((st) => {
                      const status = checkResult?.subtasks?.find((s) => s.id === st.id);
                      const passed = status?.passed ?? false;
                      return (
                        <div key={st.id} className="flex items-start gap-2 text-sm">
                          <span className={passed ? "text-green-600" : "text-muted-foreground"}>
                            {passed ? "✓" : "○"}
                          </span>
                          <span className={passed ? "text-foreground" : "text-muted-foreground"}>
                            {st.title}
                          </span>
                        </div>
                      );
                    })}
                    {allPassed && (
                      <p className="text-sm text-green-600 font-medium pt-1">Все подзадачи выполнены!</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="space-y-4 min-w-0">
              {(layout.description || resolvedLectureId) && (
                <Card>
                  <CardHeader
                    className="py-3 cursor-pointer select-none"
                    onClick={() => setTheoryOpen((o) => !o)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {theoryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <CardTitle className="text-base">Теория</CardTitle>
                      </div>
                      {resolvedLectureId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContentMode("lecture");
                          }}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          К лекции
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  {theoryOpen && (
                    <CardContent className="pt-0">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                        {layout.description
                          ? layout.description.split("\n").map((line, i) => (
                              <p key={i}>{line}</p>
                            ))
                          : <p>Теория не добавлена. Используйте прикрепленную лекцию.</p>}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
              <HintsBlock hints={layout.hints ?? []} />
            </div>
          </div>
        </>
      )}
      </div>
      <AchievementUnlockCelebration
        items={unlockedAchievements}
        onDone={() => setUnlockedAchievements([])}
      />
    </>
  );
}
