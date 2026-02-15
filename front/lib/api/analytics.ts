/**
 * Analytics API — system stats (admin), teacher analytics.
 */

import { apiFetch, hasApi } from "@/lib/api/client";

export interface SystemStats {
  server: {
    cpu_percent: number;
    ram_used_mb: number;
    ram_total_mb: number;
    disk_used_gb: number;
    disk_total_gb: number;
  };
  mongodb: {
    db_size_mb: number;
    collections: Record<string, number>;
  };
  app: {
    users_by_role: Record<string, number>;
    total_groups: number;
    total_tracks: number;
    submissions_today: number;
    submissions_week: number;
    active_users_today: number;
    recent_activity?: { user_id: string; lesson_title: string; lesson_type: string; updated_at: string | null }[];
  };
}

export interface TeacherAnalyticsGroupSummary {
  group_id: string;
  group_title: string;
  avg_percent: number;
  total_students: number;
  completed_all: number;
  late_count: number;
}

export interface TeacherAnalytics {
  groups_summary: TeacherAnalyticsGroupSummary[];
  activity_heatmap: { date: string; count: number }[];
  lesson_type_breakdown: Record<string, number>;
}

export async function fetchSystemStats(): Promise<SystemStats | null> {
  if (!hasApi()) return null;
  try {
    const res = await apiFetch("/api/auth/admin/system-stats/");
    if (!res.ok) return null;
    return (await res.json()) as SystemStats;
  } catch {
    return null;
  }
}

export async function fetchTeacherAnalytics(): Promise<TeacherAnalytics | null> {
  if (!hasApi()) return null;
  try {
    const res = await apiFetch("/api/auth/teacher/analytics/");
    if (!res.ok) return null;
    return (await res.json()) as TeacherAnalytics;
  } catch {
    return null;
  }
}
