"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ExternalLink, Layers3, ShieldAlert } from "lucide-react";
import { getStoredRole } from "@/lib/api/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
        title="Материалы преподавателей"
        description="Единая точка входа для просмотра треков и standalone-материалов, созданных преподавательской командой."
        breadcrumbs={[{ label: "Главная", href: "/main" }, { label: "Материалы преподавателей" }]}
      />

      <section className="hero-surface rounded-[2rem] border border-border/60 px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.3fr,0.7fr] lg:items-end">
          <div className="space-y-4">
            <div className="kavnt-badge w-fit">Teacher library</div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Общий каталог материалов без потери контроля над видимостью
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Здесь удобно переходить к трекам и отдельным заданиям коллег. Смена видимости влияет на исходный материал,
              поэтому этот раздел оформлен как наблюдение и навигация, а не как массовое редактирование.
            </p>
          </div>

          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="h-4 w-4" />
              Важно
            </div>
            <p className="mt-3 leading-6">
              Любые изменения доступности делаются на оригинальном материале и сразу отражаются у всех преподавателей.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Треки и учебные маршруты
            </CardTitle>
            <CardDescription>
              Откройте полный каталог треков, включая материалы других преподавателей, и перейдите к нужному маршруту.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
              Подходит для просмотра структуры трека, уроков, связанных lecture/task/puzzle/question/survey блоков и общей композиции.
            </div>
            <Link href="/main">
              <Button className="w-full gap-2">
                Открыть треки
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-primary" />
              Standalone-задания
            </CardTitle>
            <CardDescription>
              Monitoring-экран для одиночных и временных заданий с прогрессом по ученикам, группам и срокам.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
              Здесь удобнее всего смотреть просрочку, completion и открывать task submissions или survey responses.
            </div>
            <Link href="/admin/assignments-detail">
              <Button variant="outline" className="w-full gap-2">
                Открыть детализацию заданий
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
