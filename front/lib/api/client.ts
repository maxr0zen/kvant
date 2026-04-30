import { getStoredToken, clearStoredToken, clearStoredRole, clearStoredUser } from "@/lib/api/auth";

// Use NEXT_PUBLIC_API_URL on client (inlined at build time).
// Use INTERNAL_API_URL on server (set in Docker) so SSR fetches reach nginx/backend inside the container network.
const API_BASE_CLIENT = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const API_BASE_SERVER = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const API_BASE = typeof window === "undefined" ? API_BASE_SERVER : API_BASE_CLIENT;

export function getApiBase(): string {
  return API_BASE;
}

export function hasApi(): boolean {
  return Boolean(API_BASE);
}

type On401 = () => void;

let on401Callback: On401 | null = null;

export function setOn401(callback: On401): void {
  on401Callback = callback;
}

function handle401(): void {
  clearStoredToken();
  clearStoredRole();
  clearStoredUser();
  if (typeof window !== "undefined" && on401Callback) {
    on401Callback();
  }
}

/** Сброс сессии при 401 (можно вызвать вручную после повторного запроса без токена). */
export function clearSessionOn401(): void {
  handle401();
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: Record<string, unknown> | string;
  skipAuth?: boolean;
  /** Не вызывать очистку сессии при 401 (для повторного запроса без токена). */
  skipLogoutOn401?: boolean;
  /** Токен для SSR (когда localStorage недоступен) */
  token?: string | null;
}

/**
 * Единая точка запросов к API: base URL, Authorization, Content-Type.
 * При 401 вызывает очистку токена/роли и опциональный callback (редирект на /login).
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { body, skipAuth = false, token: optToken, headers: optHeaders = {}, skipLogoutOn401 = false, ...rest } = options;
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    ...(optHeaders as Record<string, string>),
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const token = optToken ?? (typeof window !== "undefined" ? getStoredToken() : null);
  if (skipAuth) {
    delete (headers as Record<string, string>)["Authorization"];
  } else if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    ...rest,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  if (res.status === 401 && !skipLogoutOn401) {
    handle401();
  }
  return res;
}
