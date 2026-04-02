"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole } from "@/lib/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ListChecks } from "lucide-react";

export default function TeachersMaterialsPage() {
  const router = useRouter();

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "teacher" && role !== "superuser") {
      router.replace("/main");
    }
  }, [router]);

  return (
    <div className="content-block space-y-6">
      <PageHeader
        title="Материалы учителей"
        description="Просмотр треков и одиночных заданий, созданных другими учителями"
        breadcrumbs={[{ label: "Управление" }, { label: "Материалы учителей" }]}
      />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6 text-sm text-amber-800 dark:text-amber-200">
          Изменение видимости выполняется на оригинальном материале и влияет на всех учителей.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Треки учителей
            </CardTitle>
            <CardDescription>
              Список всех доступных треков, включая материалы других учителей.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/main">
              <Button className="w-full">Открыть треки</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Одиночные задания
            </CardTitle>
            <CardDescription>
              Одиночные задания и статусы по ним для назначения группам.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/assignments-detail">
              <Button variant="outline" className="w-full">
                Открыть задания
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
