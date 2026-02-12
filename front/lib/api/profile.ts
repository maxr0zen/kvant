/**
 * Profile API — личный кабинет: активность и успеваемость.
 */

import { apiFetch, hasApi } from "@/lib/api/client";

export interface ProfileActivityItem {
  lesson_id: string;
  lesson_title: string;
  lesson_type: "task" | "puzzle" | "question" | "lecture" | "survey";
  track_id: string;
  track_title: string;
  status: "completed" | "completed_late" | "started";
  late_by_seconds?: number;
  updated_at: string | null;
}

export interface ProfileProgressItem {
  track_id: string;
  track_title: string;
  total: number;
  completed: number;
  started: number;
  percent: number;
}

export interface GroupLinks {
  child_chat_url: string;
  parent_chat_url: string;
  links: { label: string; url: string }[];
}

export interface ProfileAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string | null;
}

export interface ProfileGroup {
  id: string;
  title: string;
  /** ФИО преподавателя (или нескольких через запятую) */
  teacher_name?: string | null;
}

export interface ProfileData {
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role?: string;
  };
  activity: ProfileActivityItem[];
  progress: ProfileProgressItem[];
  group_links?: GroupLinks | null;
  group?: ProfileGroup | null;
  achievements?: ProfileAchievement[];
}

export async function fetchProfile(): Promise<ProfileData | null> {
  if (!hasApi()) return null;
  try {
    const res = await apiFetch("/api/auth/profile/");
    if (!res.ok) return null;
    return (await res.json()) as ProfileData;
  } catch {
    return null;
  }
}
