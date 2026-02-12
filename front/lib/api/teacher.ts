/**
 * API для учителя: группы с прогрессом, ссылки групп, прогресс ученика по треку, детализация по одиночным/временным заданиям.
 */

import { apiFetch, hasApi } from "@/lib/api/client";

// --- Группы с прогрессом учеников (профиль учителя) ---

export interface GroupLink {
  label: string;
  url: string;
}

export interface StudentInGroup {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  progress: {
    track_id: string;
    track_title: string;
    total: number;
    completed: number;
    started: number;
    percent: number;
  }[];
}

export interface GroupWithStudents {
  id: string;
  title: string;
  order?: number;
  child_chat_url?: string;
  parent_chat_url?: string;
  links?: GroupLink[];
  students: StudentInGroup[];
}

export interface TeacherGroupsProgressResponse {
  groups: GroupWithStudents[];
}

export async function fetchTeacherGroupsProgress(
  token?: string | null
): Promise<TeacherGroupsProgressResponse> {
  if (!hasApi()) return { groups: [] };
  const res = await apiFetch("/api/auth/teacher/groups-progress/", { token: token ?? undefined });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Не удалось загрузить группы");
  }
  const data = await res.json();
  return {
    groups: Array.isArray(data.groups) ? data.groups : [],
  };
}

export interface UpdateGroupLinksPayload {
  child_chat_url?: string;
  parent_chat_url?: string;
  links?: GroupLink[];
}

export interface UpdateGroupLinksResponse {
  id: string;
  child_chat_url: string;
  parent_chat_url: string;
  links: GroupLink[];
}

export async function updateGroupLinks(
  groupId: string,
  payload: UpdateGroupLinksPayload,
  token?: string | null
): Promise<UpdateGroupLinksResponse | null> {
  if (!hasApi()) return null;
  const res = await apiFetch(`/api/auth/teacher/groups/${encodeURIComponent(groupId)}/links/`, {
    method: "PATCH",
    body: payload,
    token: token ?? undefined,
  });
  if (!res.ok) return null;
  return res.json();
}

export interface StudentTrackProgressLesson {
  lesson_id: string;
  lesson_title: string;
  lesson_type: string;
  lesson_type_label: string;
  status: string;
  late_by_seconds?: number;
}

export interface StudentTrackProgressResponse {
  track_title: string;
  student_name: string;
  lessons: StudentTrackProgressLesson[];
}

export async function fetchStudentTrackProgress(
  studentId: string,
  trackId: string,
  token?: string | null
): Promise<StudentTrackProgressResponse | null> {
  if (!hasApi()) return null;
  const res = await apiFetch(
    `/api/auth/teacher/students/${encodeURIComponent(studentId)}/track/${encodeURIComponent(trackId)}/progress/`,
    { token: token ?? undefined }
  );
  if (!res.ok) return null;
  return res.json();
}

// --- Одиночные/временные задания (детализация) ---

export type StandaloneStatus = "completed" | "completed_late" | "started" | "not_started";

export interface StandaloneStudentProgress {
  user_id: string;
  full_name: string;
  group_id: string;
  group_title: string;
  status: StandaloneStatus;
  /** Просрочка в секундах (для completed_late) */
  late_by_seconds?: number;
  /** ISO datetime выполнения (для completed/completed_late) */
  completed_at?: string | null;
  /** Текст ответа (только для типа survey) */
  response_text?: string | null;
}

export interface StandaloneAssignment {
  id: string;
  title: string;
  type: "lecture" | "task" | "puzzle" | "question" | "survey";
  students: StandaloneStudentProgress[];
  /** ISO datetime или null — для временных заданий */
  available_until?: string | null;
}

export interface StandaloneProgressResponse {
  assignments: StandaloneAssignment[];
  groups: { id: string; title: string }[];
}

export async function fetchStandaloneProgress(token?: string | null): Promise<StandaloneProgressResponse> {
  if (!hasApi()) return { assignments: [], groups: [] };
  const res = await apiFetch("/api/auth/teacher/standalone-progress/", { token: token ?? undefined });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Не удалось загрузить детализацию");
  }
  const data = await res.json();
  return {
    assignments: Array.isArray(data.assignments) ? data.assignments : [],
    groups: Array.isArray(data.groups) ? data.groups : [],
  };
}

export interface TaskSubmissionResponse {
  code: string;
  passed: boolean;
  created_at: string;
}

export async function fetchStudentTaskSubmission(
  taskId: string,
  studentId: string,
  token?: string | null
): Promise<TaskSubmissionResponse | null> {
  if (!hasApi()) return null;
  const res = await apiFetch(
    `/api/auth/teacher/tasks/${encodeURIComponent(taskId)}/submissions/${encodeURIComponent(studentId)}/`,
    { token: token ?? undefined }
  );
  if (!res.ok) return null;
  return res.json();
}
