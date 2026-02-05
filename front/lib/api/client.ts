import { getStoredToken, clearStoredToken, clearStoredRole, clearStoredUser } from "@/lib/api/auth";

// Use NEXT_PUBLIC_API_URL both on server and client. Next will inline the env var
// at build time for client bundles and process.env is available on the server.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

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

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: Record<string, unknown> | string;
  skipAuth?: boolean;
}

/**
 * Единая точка запросов к API: base URL, Authorization, Content-Type.
 * При 401 вызывает очистку токена/роли и опциональный callback (редирект на /login).
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { body, skipAuth = false, headers: optHeaders = {}, ...rest } = options;
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: HeadersInit = {
    ...(optHeaders as Record<string, string>),
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!skipAuth && typeof window !== "undefined") {
    const token = getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  const res = await fetch(url, {
    ...rest,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  if (res.status === 401) {
    handle401();
  }
  return res;
}
