/**
 * Layouts API (HTML/CSS/JS assignments).
 */

import type { Layout, LayoutCheckResult } from "@/lib/types";
import { getStoredToken } from "@/lib/api/auth";
import { apiFetch, hasApi } from "@/lib/api/client";
import { mapLectureFromApi } from "@/lib/api/lectures";

type LayoutSubtaskCheckType = "selector_exists" | "html_contains" | "css_contains" | "js_contains";
type LayoutFileKey = "html" | "css" | "js";

const MOCK_LAYOUTS: Record<string, Layout> = {
  "mock-layout-1": {
    id: "mock-layout-1",
    title: "Карточка профиля: базовый вариант",
    description:
      "Простая карточка: имя, роль и кнопка.\nСначала сверстайте структуру, затем добавьте базовые стили.",
    attachedLectureId: "mock-web-theory-card",
    attachedLecture: {
      id: "mock-web-theory-card",
      title: "Лекция к заданию 1: карточка профиля (пошагово)",
      content: `## Что нужно сделать
Собрать простую карточку: имя, роль и кнопку.

## Шаг 1 — HTML
Создайте контейнер \`.profile-card\`.
Внутри добавьте \`h2.name\`, \`p.role\` и \`button.action-btn\`.

## Шаг 2 — CSS
Добавьте отступы, скругление и границу для карточки.
Для кнопки обязательно задайте \`border-radius\`.

## Шаг 3 — Проверка
Проверьте, что в тексте роли есть фраза **Frontend Junior**.`,
    },
    templateHtml: `<article class="profile-card">
  <h2 class="name">Анна Смирнова</h2>
  <p class="role">Frontend Junior</p>
  <button class="action-btn">Связаться</button>
</article>`,
    templateCss: `.profile-card {
  max-width: 320px;
  margin: 24px auto;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.name {
  margin: 0 0 8px;
}

.role {
  margin: 0 0 12px;
  color: #475569;
}

.action-btn {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  background: #2563eb;
  color: #fff;
}`,
    templateJs: "",
    editableFiles: ["html", "css"],
    subtasks: [
      { id: "s1", title: "Есть контейнер карточки", checkType: "selector_exists", checkValue: ".profile-card" },
      { id: "s2", title: "Кнопка имеет скругление", checkType: "css_contains", checkValue: "border-radius" },
      { id: "s3", title: "Есть подпись роли", checkType: "html_contains", checkValue: "Frontend Junior" },
    ],
    hints: [
      "Классы должны совпадать: .profile-card, .role, .action-btn.",
      "Проверьте, что текст роли написан как Frontend Junior.",
    ],
  },
  "mock-layout-2": {
    id: "mock-layout-2",
    title: "Адаптивная сетка: 3-2-1",
    description:
      "Сверстайте адаптивную сетку: 3 колонки на десктопе, 2 на планшете и 1 на телефоне.",
    attachedLectureId: "mock-web-theory-grid",
    attachedLecture: {
      id: "mock-web-theory-grid",
      title: "Лекция к заданию 2: простая адаптивная сетка",
      content: `## Шаг 1 — включите Grid
У контейнера \`.products\` задайте \`display: grid\`.

## Шаг 2 — базовая сетка
Добавьте \`grid-template-columns: repeat(3, 1fr)\` и \`gap\`.

## Шаг 3 — адаптив
Через \`@media\` сделайте 2 колонки до 900px и 1 колонку до 600px.`,
    },
    templateHtml: `<section class="products">
  <article class="product-card">Карточка 1</article>
  <article class="product-card">Карточка 2</article>
  <article class="product-card">Карточка 3</article>
  <article class="product-card">Карточка 4</article>
</section>`,
    templateCss: `.products {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, 1fr);
}

.product-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
}

@media (max-width: 900px) {
  .products {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .products {
    grid-template-columns: 1fr;
  }
}`,
    templateJs: "",
    editableFiles: ["css"],
    subtasks: [
      { id: "s1", title: "Используется CSS Grid", checkType: "css_contains", checkValue: "display: grid" },
      { id: "s2", title: "Есть адаптивный media query", checkType: "css_contains", checkValue: "@media" },
      { id: "s3", title: "Присутствуют карточки товара", checkType: "selector_exists", checkValue: ".product-card" },
    ],
    hints: ["Сделайте сначала display: grid, потом добавляйте media queries."],
  },
  "mock-layout-3": {
    id: "mock-layout-3",
    title: "Форма: валидация одного поля",
    description:
      "Соберите простую форму и проверьте email на пустое значение в JavaScript.",
    attachedLectureId: "mock-web-theory-form",
    attachedLecture: {
      id: "mock-web-theory-form",
      title: "Лекция к заданию 3: форма и простая JS-валидация",
      content: `## Шаг 1 — HTML
Создайте форму \`#login-form\`, поле \`#email\`, кнопку и блок \`#form-message\`.

## Шаг 2 — submit
Повесьте обработчик \`submit\` и вызовите \`event.preventDefault()\`.

## Шаг 3 — проверка
Если email пустой, покажите текст: **Заполните email.**
Если email заполнен, покажите: **Форма готова к отправке.**`,
    },
    templateHtml: `<form class="login-form" id="login-form">
  <h2>Вход</h2>
  <label for="email">Email</label>
  <input id="email" type="email" placeholder="you@example.com">
  <button type="submit" class="submit-btn">Проверить</button>
  <p class="form-message" id="form-message"></p>
</form>`,
    templateCss: `.login-form {
  width: min(100%, 360px);
  margin: 24px auto;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: grid;
  gap: 10px;
  background: #fff;
}

.submit-btn {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  background: #0f172a;
  color: #fff;
}

.form-message {
  min-height: 20px;
  color: #dc2626;
}`,
    templateJs: `const form = document.getElementById("login-form");
const email = document.getElementById("email");
const message = document.getElementById("form-message");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!email?.value) {
    if (message) message.textContent = "Заполните email.";
    return;
  }
  if (message) message.textContent = "Форма готова к отправке.";
});`,
    editableFiles: ["html", "css", "js"],
    subtasks: [
      { id: "s1", title: "Есть форма входа", checkType: "selector_exists", checkValue: ".login-form" },
      { id: "s2", title: "Сообщение об ошибке выводится", checkType: "js_contains", checkValue: "Заполните email" },
      { id: "s3", title: "Кнопка submit оформлена", checkType: "selector_exists", checkValue: ".submit-btn" },
    ],
    hints: ["Проверьте id: login-form, email, form-message."],
  },
};

function readLayoutDraftMock(layoutId: string): { html: string; css: string; js: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`layout_draft_${layoutId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<LayoutFileKey, unknown>>;
    return {
      html: typeof parsed.html === "string" ? parsed.html : "",
      css: typeof parsed.css === "string" ? parsed.css : "",
      js: typeof parsed.js === "string" ? parsed.js : "",
    };
  } catch {
    return null;
  }
}

function mapLayoutFromApi(data: Record<string, unknown>): Layout {
  const editable: ("html" | "css" | "js")[] = Array.isArray(data.editable_files)
    ? ((data.editable_files as string[]).filter((f) => ["html", "css", "js"].includes(f)) as ("html" | "css" | "js")[])
    : ["html", "css", "js"];
  const subtasks = Array.isArray(data.subtasks)
    ? (data.subtasks as Record<string, unknown>[]).map((s) => ({
        id: String(s.id),
        title: String(s.title),
        checkType: (s.check_type ?? "html_contains") as LayoutSubtaskCheckType,
        checkValue: String(s.check_value ?? ""),
      }))
    : [];
  const rawEmbed = data.attached_lecture;
  const attachedLecture =
    rawEmbed != null && typeof rawEmbed === "object" && !Array.isArray(rawEmbed)
      ? mapLectureFromApi(rawEmbed as Record<string, unknown>)
      : undefined;

  return {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description ?? ""),
    checkMode: (data.check_mode === "full_match" ? "full_match" : "subtasks") as "subtasks" | "full_match",
    attachedLectureId:
      data.attached_lecture_id != null && String(data.attached_lecture_id).trim() !== ""
        ? String(data.attached_lecture_id).trim()
        : undefined,
    attachedLecture,
    trackId: data.track_id != null ? String(data.track_id) : undefined,
    templateHtml: String(data.template_html ?? ""),
    templateCss: String(data.template_css ?? ""),
    templateJs: String(data.template_js ?? ""),
    referenceHtml: data.reference_html != null ? String(data.reference_html) : undefined,
    referenceCss: data.reference_css != null ? String(data.reference_css) : undefined,
    referenceJs: data.reference_js != null ? String(data.reference_js) : undefined,
    editableFiles: editable.length ? editable : ["html", "css", "js"],
    subtasks,
    visibleGroupIds: Array.isArray(data.visible_group_ids) ? (data.visible_group_ids as string[]) : undefined,
    hints: Array.isArray(data.hints) ? (data.hints as string[]) : undefined,
    availableFrom: data.available_from != null ? String(data.available_from) : undefined,
    availableUntil: data.available_until != null ? String(data.available_until) : undefined,
    maxAttempts: data.max_attempts != null ? Number(data.max_attempts) : undefined,
    canEdit: Boolean(data.can_edit),
    rewardAchievementIds: Array.isArray(data.reward_achievement_ids) ? (data.reward_achievement_ids as string[]) : undefined,
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
    const layout = MOCK_LAYOUTS[layoutId];
    if (!layout) return { passed: false, subtasks: [], error: "Задание не найдено" };
    const sources: Record<LayoutFileKey, string> = { html, css, js };
    const subtasks = layout.subtasks.map((st) => {
      let passed = false;
      if (st.checkType === "selector_exists") {
        passed = sources.html.includes(st.checkValue);
      } else if (st.checkType === "html_contains") {
        passed = sources.html.includes(st.checkValue);
      } else if (st.checkType === "css_contains") {
        passed = sources.css.includes(st.checkValue);
      } else if (st.checkType === "js_contains") {
        passed = sources.js.includes(st.checkValue);
      }
      return {
        id: st.id,
        title: st.title,
        passed,
        message: passed ? "" : `Не найдено: ${st.checkValue}`,
      };
    });
    return {
      passed: subtasks.length > 0 && subtasks.every((s) => s.passed),
      subtasks,
    };
  }
  try {
    const res = await apiFetch(`/api/layouts/${layoutId}/check/`, {
      method: "POST",
      body: { html, css, js },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message =
        typeof (err as { detail?: unknown }).detail === "string"
          ? (err as { detail: string }).detail
          : "Не удалось проверить задание";
      return { passed: false, subtasks: [], error: message };
    }
    const data = (await res.json()) as {
      passed?: boolean;
      subtasks?: Array<{ id: string; title: string; passed: boolean; message: string }>;
      warnings?: unknown;
      errors?: unknown;
      abuse_flags?: unknown;
      unlocked_achievements?: unknown;
    };
    return {
      passed: Boolean(data.passed),
      subtasks: Array.isArray(data.subtasks)
        ? data.subtasks.map((s) => ({ id: s.id, title: s.title, passed: s.passed, message: s.message ?? "" }))
        : [],
      errors: Array.isArray(data.errors)
        ? data.errors.filter((e): e is string => typeof e === "string")
        : [],
      warnings: Array.isArray(data.warnings)
        ? data.warnings.filter((w): w is string => typeof w === "string")
        : [],
      abuseFlags: Array.isArray(data.abuse_flags)
        ? data.abuse_flags.filter((f): f is string => typeof f === "string")
        : [],
      unlockedAchievements: Array.isArray(data.unlocked_achievements)
        ? data.unlocked_achievements
            .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
            .map((a) => ({
              id: String(a.id ?? ""),
              title: String(a.title ?? ""),
              description: String(a.description ?? ""),
              icon: String(a.icon ?? "🏆"),
            }))
        : [],
    };
  } catch {
    return { passed: false, subtasks: [], error: "Ошибка сети при проверке задания" };
  }
}

export async function fetchLayoutDraft(layoutId: string): Promise<{ html: string; css: string; js: string } | null> {
  if (!hasApi()) {
    const draft = readLayoutDraftMock(layoutId);
    if (draft) return draft;
    const layout = MOCK_LAYOUTS[layoutId];
    if (!layout) return null;
    return { html: layout.templateHtml, css: layout.templateCss, js: layout.templateJs };
  }
  if (!getStoredToken()) return null;
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
  checkMode?: "subtasks" | "full_match";
  attachedLectureId?: string;
  trackId?: string;
  templateHtml: string;
  templateCss: string;
  templateJs: string;
  referenceHtml?: string;
  referenceCss?: string;
  referenceJs?: string;
  editableFiles?: ("html" | "css" | "js")[];
  subtasks: { id: string; title: string; checkType: LayoutSubtaskCheckType; checkValue: string }[];
  visibleGroupIds?: string[];
  hints?: string[];
  availableFrom?: string | null;
  availableUntil?: string | null;
  maxAttempts?: number | null;
  rewardAchievementIds?: string[];
}): Promise<Layout> {
  if (!hasApi()) throw new Error("API не настроен");
  const res = await apiFetch("/api/layouts/", {
    method: "POST",
    body: {
      title: data.title,
      description: data.description ?? "",
      check_mode: data.checkMode ?? "subtasks",
      attached_lecture_id: data.attachedLectureId ?? "",
      track_id: data.trackId ?? "",
      template_html: data.templateHtml,
      template_css: data.templateCss,
      template_js: data.templateJs,
      reference_html: data.referenceHtml ?? "",
      reference_css: data.referenceCss ?? "",
      reference_js: data.referenceJs ?? "",
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
      reward_achievement_ids: data.rewardAchievementIds ?? [],
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
    checkMode: "subtasks" | "full_match";
    attachedLectureId: string;
    trackId: string;
    templateHtml: string;
    templateCss: string;
    templateJs: string;
    referenceHtml: string;
    referenceCss: string;
    referenceJs: string;
    editableFiles: ("html" | "css" | "js")[];
    subtasks: { id: string; title: string; checkType: LayoutSubtaskCheckType; checkValue: string }[];
    visibleGroupIds: string[];
    hints: string[];
    availableFrom: string | null;
    availableUntil: string | null;
    maxAttempts: number | null;
    rewardAchievementIds: string[];
  }>
): Promise<Layout> {
  if (!hasApi()) throw new Error("API не настроен");
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.checkMode !== undefined) body.check_mode = data.checkMode;
  if (data.attachedLectureId !== undefined) body.attached_lecture_id = data.attachedLectureId;
  if (data.trackId !== undefined) body.track_id = data.trackId;
  if (data.templateHtml !== undefined) body.template_html = data.templateHtml;
  if (data.templateCss !== undefined) body.template_css = data.templateCss;
  if (data.templateJs !== undefined) body.template_js = data.templateJs;
  if (data.referenceHtml !== undefined) body.reference_html = data.referenceHtml;
  if (data.referenceCss !== undefined) body.reference_css = data.referenceCss;
  if (data.referenceJs !== undefined) body.reference_js = data.referenceJs;
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
  if (data.rewardAchievementIds !== undefined) body.reward_achievement_ids = data.rewardAchievementIds;
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
  if (!hasApi()) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`layout_draft_${layoutId}`, JSON.stringify({ html, css, js }));
    } catch {
      // ignore
    }
    return;
  }
  if (!getStoredToken()) return;
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
