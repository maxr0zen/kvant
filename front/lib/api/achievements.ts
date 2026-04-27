import { apiFetch, hasApi } from "@/lib/api/client";

export interface AchievementCatalogItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export async function fetchAchievementsCatalog(): Promise<AchievementCatalogItem[]> {
  if (!hasApi()) return [];
  try {
    const res = await apiFetch("/api/auth/achievements/catalog/");
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.items)) return [];
    return (data.items as unknown[])
      .filter((value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object")
      .map((value): AchievementCatalogItem => ({
        id: String(value.id ?? ""),
        title: String(value.title ?? ""),
        description: String(value.description ?? ""),
        icon: String(value.icon ?? "trophy"),
      }))
      .filter((value: AchievementCatalogItem) => value.id !== "");
  } catch {
    return [];
  }
}
