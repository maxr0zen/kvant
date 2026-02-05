"use client";

import React from "react";

// No-op flash provider/hook: global flash disabled per user request.
export function FlashProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useFlash() {
  return (_: "success" | "error") => {};
}
