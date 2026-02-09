"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeacherStudentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-muted-foreground">Перенаправление...</p>
    </div>
  );
}
