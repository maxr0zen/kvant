/**
 * Teacher API — прогресс учеников по группам.
 */

import { apiFetch, hasApi } from "@/lib/api/client";

export interface StudentProgressItem {
  track_id: string;
  track_title: string;
  total: number;
  completed: number;
  started: number;
  percent: number;
}

export interface StudentInGroup {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  progress: StudentProgressItem[];
}

export interface GroupLink {
  label: string;
  url: string;
}

export interface GroupWithStudents {
  id: string;
  title: string;
  order: number;
  child_chat_url?: string;
  parent_chat_url?: string;
  links?: GroupLink[];
  students: StudentInGroup[];
}

export interface TeacherGroupsProgressResponse {
  groups: GroupWithStudents[];
}

export interface GroupLinksUpdate {
  child_chat_url?: string;
  parent_chat_url?: string;
  links?: GroupLink[];
}

export async function updateGroupLinks(
  groupId: string,
  data: GroupLinksUpdate
): Promise<{ id: string; child_chat_url: string; parent_chat_url: string; links: GroupLink[] } | null> {
  if (!hasApi()) return null;
  try {
    const res = await apiFetch(`/api/auth/teacher/groups/${groupId}/links/`, {
      method: "PATCH",
      body: data,
    });
    if (!res.ok) return null;
    return (await res.json()) as { id: string; child_chat_url: string; parent_chat_url: string; links: GroupLink[] };
  } catch {
    return null;
  }
}

export interface TrackLessonProgressItem {
  lesson_id: string;
  lesson_title: string;
  lesson_type: string;
  lesson_type_label: string;
  status: "completed" | "started" | "not_started";
}

export interface StudentTrackProgressResponse {
  track_title: string;
  student_name: string;
  lessons: TrackLessonProgressItem[];
}

export async function fetchStudentTrackProgress(
  studentId: string,
  trackId: string
): Promise<StudentTrackProgressResponse | null> {
  if (!hasApi()) return null;
  try {
    const res = await apiFetch(`/api/auth/teacher/students/${studentId}/track/${trackId}/progress/`);
    if (!res.ok) return null;
    return (await res.json()) as StudentTrackProgressResponse;
  } catch {
    return null;
  }
}

export async function fetchTeacherGroupsProgress(): Promise<TeacherGroupsProgressResponse | null> {
  if (!hasApi()) return null;
  try {
    const res = await apiFetch("/api/auth/teacher/groups-progress/");
    if (!res.ok) return null;
    return (await res.json()) as TeacherGroupsProgressResponse;
  } catch {
    return null;
  }
}
