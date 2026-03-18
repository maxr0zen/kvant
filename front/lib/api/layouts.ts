/**
 * Layouts API (HTML/CSS/JS assignments).
 */

import type { Layout, LayoutCheckResult } from "@/lib/types";
import { getStoredToken } from "@/lib/api/auth";
import { apiFetch, hasApi } from "@/lib/api/client";

function mapLayoutFromApi(data: Record<string, unknown>): Layout {
  const editable = Array.isArray(data.editable_files)
    ? (data.editable_files as string[]).filter((f) => ["html", "css", "js"].includes(f)) as ("html" | "css" | "js")[]
    : (["html", "css", "js"] as const);
  const subtasks = Array.isArray(data.subtasks)
    ? (data.subtasks as Record<string, unknown>[]).map((s) => ({
        id: String(s.id),
        title: String(s.title),
        checkType: (s.check_type ?? "html_contains") as "selector_exists" | "html_contains",
        checkValue: String(s.check_value ?? ""),
      }))
    : [];
  return {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description ?? ""),
    trackId: data.track_id != null ? String(data.track_id) : undefined,
    templateHtml: String(data.template_html ?? ""),
    templateCss: String(data.template_css ?? ""),
    templateJs: String(data.template_js ?? ""),
    editableFiles: editable.length ? editable : (["html", "css", "js"] as const),
    subtasks,
    visibleGroupIds: Array.isArray(data.visible_group_ids) ? (data.visible_group_ids as string[]) : undefined,
    hints: Array.isArray(data.hints) ? (data.hints as string[]) : undefined,
    availableFrom: data.available_from != null ? String(data.available_from) : undefined,
    availableUntil: data.available_until != null ? String(data.available_until) : undefined,
    maxAttempts: data.max_attempts != null ? Number(data.max_attempts) : undefined,
    canEdit: Boolean(data.can_edit),
  };
}

export async function fetchLayoutById(id: string, token?: string | null): Promise<Layout | null> {
  if (!hasApi()) return null;
  try {
    const res = await apiFetch(`/api/layouts/${id}/`, { token: token ?? undefined });
    if (!res.ok) return null;
    const data = await res.json();
    return mapLayoutFromApi(data);
  } catch {
    return null;
  }
}

export async function checkLayout(
  layoutId: string,
  html: string,
  css: string,
  js: string
): Promise<LayoutCheckResult> {
  if (!hasApi()) {
    return { passed: false, subtasks: [] };
  }
  const res = await apiFetch(`/api/layouts/${layoutId}/check/`, {
    method: "POST",
    body: { html, css, js },
  });
  if (!res.ok) {
    return { passed: false, subtasks: [] };
  }
  const data = (await res.json()) as { passed?: boolean; subtasks?: Array<{ id: string; title: string; passed: boolean; message: string }> };
  return {
    passed: Boolean(data.passed),
    subtasks: Array.isArray(data.subtasks)
      ? data.subtasks.map((s) => ({ id: s.id, title: s.title, passed: s.passed, message: s.message ?? "" }))
      : [],
  };
}

export async function fetchLayoutDraft(layoutId: string): Promise<{ html: string; css: string; js: string } | null> {
  if (!hasApi() || !getStoredToken()) return null;
  try {
    const res = await apiFetch(`/api/layouts/${layoutId}/draft/`);
    if (!res.ok) return null;
    const data = (await res.json()) as { html?: string; css?: string; js?: string };
    return {
      html: String(data.html ?? ""),
      css: String(data.css ?? ""),
      js: String(data.js ?? ""),
    };
  } catch {
    return null;
  }
}

export async function createLayout(data: {
  title: string;
  description?: string;
  trackId?: string;
  templateHtml: string;
  templateCss: string;
  templateJs: string;
  editableFiles?: ("html" | "css" | "js")[];
  subtasks: { id: string; title: string; checkType: "selector_exists" | "html_contains"; checkValue: string }[];
  visibleGroupIds?: string[];
  hints?: string[];
  availableFrom?: string | null;
  availableUntil?: string | null;
  maxAttempts?: number | null;
}): Promise<Layout> {
  if (!hasApi()) throw new Error("API не настроен");
  const res = await apiFetch("/api/layouts/", {
    method: "POST",
    body: {
      title: data.title,
      description: data.description ?? "",
      track_id: data.trackId ?? "",
      template_html: data.templateHtml,
      template_css: data.templateCss,
      template_js: data.templateJs,
      editable_files: data.editableFiles ?? ["html", "css", "js"],
      subtasks: (data.subtasks ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        check_type: s.checkType,
        check_value: s.checkValue,
      })),
      visible_group_ids: data.visibleGroupIds ?? [],
      hints: data.hints ?? [],
      available_from: data.availableFrom ?? null,
      available_until: data.availableUntil ?? null,
      max_attempts: data.maxAttempts ?? null,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof (err as { detail?: string }).detail === "string" ? (err as { detail: string }).detail : "Ошибка создания задания");
  }
  const created = await res.json();
  return mapLayoutFromApi(created);
}

export async function updateLayout(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    trackId: string;
    templateHtml: string;
    templateCss: string;
    templateJs: string;
    editableFiles: ("html" | "css" | "js")[];
    subtasks: { id: string; title: string; checkType: "selector_exists" | "html_contains"; checkValue: string }[];
    visibleGroupIds: string[];
    hints: string[];
    availableFrom: string | null;
    availableUntil: string | null;
    maxAttempts: number | null;
  }>
): Promise<Layout> {
  if (!hasApi()) throw new Error("API не настроен");
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.trackId !== undefined) body.track_id = data.trackId;
  if (data.templateHtml !== undefined) body.template_html = data.templateHtml;
  if (data.templateCss !== undefined) body.template_css = data.templateCss;
  if (data.templateJs !== undefined) body.template_js = data.templateJs;
  if (data.editableFiles !== undefined) body.editable_files = data.editableFiles;
  if (data.subtasks !== undefined)
    body.subtasks = data.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      check_type: s.checkType,
      check_value: s.checkValue,
    }));
  if (data.visibleGroupIds !== undefined) body.visible_group_ids = data.visibleGroupIds;
  if (data.hints !== undefined) body.hints = data.hints;
  if (data.availableFrom !== undefined) body.available_from = data.availableFrom;
  if (data.availableUntil !== undefined) body.available_until = data.availableUntil;
  if (data.maxAttempts !== undefined) body.max_attempts = data.maxAttempts;
  const res = await apiFetch(`/api/layouts/${id}/`, {
    method: "PATCH",
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof (err as { detail?: string }).detail === "string" ? (err as { detail: string }).detail : "Ошибка обновления задания");
  }
  const updated = await res.json();
  return mapLayoutFromApi(updated);
}

export async function deleteLayout(id: string): Promise<void> {
  if (!hasApi()) throw new Error("API не настроен");
  const res = await apiFetch(`/api/layouts/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof (err as { detail?: string }).detail === "string" ? (err as { detail: string }).detail : "Ошибка удаления задания");
  }
}

export async function saveLayoutDraft(
  layoutId: string,
  html: string,
  css: string,
  js: string,
  keepalive = false
): Promise<void> {
  if (!hasApi() || !getStoredToken()) return;
  try {
    await apiFetch(`/api/layouts/${layoutId}/draft/`, {
      method: "PUT",
      body: { html, css, js },
      keepalive,
    });
  } catch {
    // ignore
  }
}
