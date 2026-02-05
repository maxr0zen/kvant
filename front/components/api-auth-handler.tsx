"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setOn401 } from "@/lib/api/client";

/**
 * Sets global 401 handler: clear token/role and redirect to login.
 * Mount once in the main app layout.
 */
export function ApiAuthHandler() {
  const router = useRouter();
  useEffect(() => {
    setOn401(() => {
      router.push("/login");
    });
    return () => setOn401(null);
  }, [router]);
  return null;
}
