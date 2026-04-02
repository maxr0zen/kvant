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
    return data.items
      .filter((x: unknown): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x) => ({
        id: String(x.id ?? ""),
        title: String(x.title ?? ""),
        description: String(x.description ?? ""),
        icon: String(x.icon ?? "🏆"),
      }))
      .filter((x) => x.id !== "");
  } catch {
    return [];
  }
}
