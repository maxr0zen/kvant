"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setOn401 } from "@/lib/api/client";
import { getStoredToken, setAuthTokenCookie } from "@/lib/api/auth";

/**
 * Sets global 401 handler: clear token/role and redirect to login.
 * Синхронизирует токен из localStorage в cookie для SSR (can_edit и т.д.).
 * Mount once in the main app layout.
 */
export function ApiAuthHandler() {
  const router = useRouter();
  useEffect(() => {
    const token = getStoredToken();
    if (token) setAuthTokenCookie(token);
    setOn401(() => {
      router.push("/login");
    });
    return () => setOn401(null);
  }, [router]);
  return null;
}
