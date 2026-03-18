"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeEditor } from "@/components/editor/code-editor";
import { CodeHighlight } from "@/components/code-highlight";
import type { Layout } from "@/lib/types";
import { checkLayout, fetchLayoutDraft, saveLayoutDraft } from "@/lib/api/layouts";
import { hasApi } from "@/lib/api/client";
import { getStoredToken } from "@/lib/api/auth";
import { HintsBlock } from "@/components/hints-block";
import { AvailabilityNotice } from "@/components/availability-notice";
import { ChevronDown, ChevronRight } from "lucide-react";

const DRAFT_SAVE_DELAY_MS = 1500;
const CHECK_DEBOUNCE_MS = 800;
type LayoutFile = "html" | "css" | "js";

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

export function LayoutView({ layout }: { layout: Layout }) {
  const router = useRouter();
  const editable = new Set(layout.editableFiles);
  const [activeFile, setActiveFile] = useState<LayoutFile>("html");
  const [html, setHtml] = useState(layout.templateHtml);
  const [css, setCss] = useState(layout.templateCss);
  const [js, setJs] = useState(layout.templateJs);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [checkResult, setCheckResult] = useState<{ passed: boolean; subtasks: { id: string; title: string; passed: boolean; message: string }[] } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div className="space-y-4">
      <AvailabilityNotice availableFrom={layout.availableFrom} availableUntil={layout.availableUntil} />
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center gap-2 border-b pb-2">
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
          {isActiveEditable ? (
            <CodeEditor value={activeValue} onChange={setActiveValue} language={activeLanguage} className="code-font-mono" />
          ) : (
            <div className="relative rounded-lg border border-border/80 overflow-hidden bg-card" data-testid={`read-only-${activeFile}`}>
              <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <span>{activeFile.toUpperCase()} (только чтение)</span>
              </div>
              <CodeHighlight code={activeValue} language={activeLanguage} className="min-h-[200px]" />
            </div>
          )}
        </div>
        <div className="space-y-4 lg:border-l lg:pl-6 min-w-0">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Превью</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <iframe
                srcDoc={previewDoc}
                sandbox="allow-scripts"
                title="Preview"
                className="w-full h-[280px] border-0 rounded-b-lg bg-white dark:bg-zinc-900"
              />
            </CardContent>
          </Card>
          {layout.subtasks.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Подзадачи</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(checkResult?.subtasks ?? layout.subtasks).map((st) => {
                  const status = checkResult?.subtasks?.find((s) => s.id === st.id);
                  const passed = status?.passed ?? false;
                  return (
                    <div
                      key={st.id}
                      className="flex items-center gap-2 text-sm"
                    >
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
          {layout.description && (
            <Card>
              <CardHeader
                className="py-3 cursor-pointer select-none"
                onClick={() => setTheoryOpen((o) => !o)}
              >
                <div className="flex items-center gap-2">
                  {theoryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base">Теория</CardTitle>
                </div>
              </CardHeader>
              {theoryOpen && (
                <CardContent className="pt-0">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                    {layout.description.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
          <HintsBlock hints={layout.hints ?? []} />
        </div>
      </div>
    </div>
  );
}
