"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole } from "@/lib/api/auth";
import { fetchSystemStats, type SystemStats } from "@/lib/api/analytics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, GaugeCard, BarChartCard } from "@/components/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  Database,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 15000;

const ROLE_LABELS: Record<string, string> = {
  superuser: "Администраторы",
  teacher: "Учителя",
  student: "Ученики",
};

function formatDate(value: string | null): string {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function InsightCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <Card className="border-white/50 bg-background/80">
      <CardContent className="flex items-start gap-4 p-5 !pt-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-semibold tracking-[-0.02em]">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const data = await fetchSystemStats();
    setStats(data ?? null);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "superuser") {
      router.replace("/main");
      return;
    }

    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, router]);

  useEffect(() => {
    if (getStoredRole() !== "superuser" || !stats) return;
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load, stats]);

  if (getStoredRole() !== "superuser") return null;

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <PageHeader title="Панель мониторинга" description="Серверные показатели и состояние продукта в реальном времени." />
        <ListSkeleton rows={8} className="py-8" />
      </div>
    );
  }

  const server = stats?.server;
  const mongodb = stats?.mongodb;
  const app = stats?.app;
  const totalUsers = app ? Object.values(app.users_by_role).reduce((sum, value) => sum + value, 0) : 0;

  return (
    <div className="content-block">
      <section className="hero-surface p-6 sm:p-7 lg:p-8">
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <span className="kavnt-badge">Admin dashboard</span>
            <PageHeader
              title="Платформенный мониторинг"
              description="Системная зона для superuser: здоровье инфраструктуры, динамика обучения и быстрый контроль критичных точек."
              compact
              className="mb-0"
              actions={
                <Button variant="outline" onClick={() => load()} className="justify-between">
                  <span>Обновить данные</span>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              }
            />

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Обновлено"
                value={
                  lastUpdate
                    ? lastUpdate.toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "—"
                }
                description="Автообновление каждые 15 секунд."
                icon={Activity}
              />
              <StatCard title="Пользователи" value={totalUsers} description="Все роли в одной платформе." icon={Users} />
              <StatCard
                title="Активных сегодня"
                value={app?.active_users_today ?? 0}
                description="Показатель текущей вовлеченности."
                icon={Workflow}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <InsightCard
              title="Monitoring-oriented hierarchy"
              description="Исключения и риски не спорят с основными метриками, а поддерживают спокойное принятие решений."
              icon={ShieldCheck}
            />
            <InsightCard
              title="Implementation-friendly surfaces"
              description="Карты, таблицы и графики остаются пригодными для прямой реализации на Tailwind и shadcn-style primitives."
              icon={AlertTriangle}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div>
            <h2 className="section-title">Сервер и база данных</h2>
            <p className="section-caption">Базовые ресурсные показатели и состояние MongoDB, читаемые за один взгляд.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {server && (
              <>
                <GaugeCard title="CPU" value={server.cpu_percent} unit="%" />
                <GaugeCard
                  title="RAM"
                  used={server.ram_used_mb}
                  total={server.ram_total_mb}
                  value={server.ram_total_mb > 0 ? (server.ram_used_mb / server.ram_total_mb) * 100 : 0}
                  unit=""
                />
                <StatCard
                  title="Диск"
                  value={`${server.disk_used_gb} / ${server.disk_total_gb} ГБ`}
                  description="Использование файлового пространства."
                  icon={HardDrive}
                />
              </>
            )}
            {mongodb && (
              <StatCard
                title="MongoDB"
                value={`${mongodb.db_size_mb} МБ`}
                description="Текущий размер базы данных."
                icon={Database}
              />
            )}
          </div>

          {mongodb?.collections && (
            <Card>
              <CardHeader>
                <CardTitle>Коллекции</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Коллекция</TableHead>
                        <TableHead className="text-right">Документов</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(mongodb.collections).map(([name, count]) => (
                        <TableRow key={name}>
                          <TableCell className="font-mono text-sm">{name}</TableCell>
                          <TableCell className="text-right tabular-nums">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="section-title">Продукт и пользователи</h2>
            <p className="section-caption">Ролевой состав, учебная активность и последние сигналы использования платформы.</p>
          </div>

          {app && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard title="Ученики" value={app.users_by_role.student ?? 0} description="Основной контур обучения." icon={UsersRound} />
                <StatCard title="Учителя" value={app.users_by_role.teacher ?? 0} description="Управление группами и проверками." icon={UsersRound} />
                <StatCard title="Группы" value={app.total_groups} description="Активные организационные единицы." icon={Users} />
                <StatCard title="Треки" value={app.total_tracks} description="Доступные учебные маршруты." icon={Workflow} />
                <StatCard title="Отправок сегодня" value={app.submissions_today} description="Динамика выполнения заданий." icon={Activity} />
                <StatCard title="Отправок за неделю" value={app.submissions_week} description="Недельный темп платформы." icon={Activity} />
              </div>

              <BarChartCard
                title="Пользователи по ролям"
                data={[
                  { name: ROLE_LABELS.student, value: app.users_by_role.student ?? 0 },
                  { name: ROLE_LABELS.teacher, value: app.users_by_role.teacher ?? 0 },
                  { name: ROLE_LABELS.superuser, value: app.users_by_role.superuser ?? 0 },
                ]}
              />

              {app.recent_activity && app.recent_activity.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Последняя активность</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Материал</TableHead>
                            <TableHead>Тип</TableHead>
                            <TableHead className="text-right">Обновлено</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {app.recent_activity.slice(0, 10).map((item, index) => (
                            <TableRow key={`${item.user_id}-${item.updated_at}-${index}`}>
                              <TableCell className="max-w-[220px] truncate font-medium">{item.lesson_title}</TableCell>
                              <TableCell className="text-muted-foreground">{item.lesson_type}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">{formatDate(item.updated_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
