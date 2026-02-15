"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole } from "@/lib/api/auth";
import { fetchSystemStats, type SystemStats } from "@/lib/api/analytics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, GaugeCard, BarChartCard } from "@/components/charts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HardDrive, Database, Users, UsersRound, BookOpen, Activity, RefreshCw } from "lucide-react";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

const POLL_INTERVAL_MS = 15000;

const ROLE_LABELS: Record<string, string> = {
  superuser: "Администратор",
  teacher: "Учитель",
  student: "Ученик",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
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
  }, [router, load]);

  useEffect(() => {
    if (getStoredRole() !== "superuser" || !stats) return;
    const t = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load, stats]);

  if (getStoredRole() !== "superuser") {
    return null;
  }

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <PageHeader title="Панель мониторинга" description="Сервер и аналитика проекта" />
        <ListSkeleton rows={8} className="py-8" />
      </div>
    );
  }

  const server = stats?.server;
  const mongodb = stats?.mongodb;
  const app = stats?.app;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Панель мониторинга"
        description={
          lastUpdate
            ? `Обновлено: ${lastUpdate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · автообновление каждые 15 с`
            : "Сервер и аналитика проекта"
        }
        actions={
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: Server ── */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Сервер</h2>
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
                  icon={HardDrive}
                />
              </>
            )}
            {mongodb && (
              <StatCard
                title="MongoDB"
                value={`${mongodb.db_size_mb} МБ`}
                icon={Database}
              />
            )}
          </div>
          {mongodb?.collections && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Коллекции</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Project ── */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Проект</h2>
          {app && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Пользователи" value={Object.values(app.users_by_role).reduce((a, b) => a + b, 0)} icon={Users} />
                <StatCard title="Ученики" value={app.users_by_role.student ?? 0} icon={UsersRound} />
                <StatCard title="Учителя" value={app.users_by_role.teacher ?? 0} icon={UsersRound} />
                <StatCard title="Группы" value={app.total_groups} icon={UsersRound} />
                <StatCard title="Треки" value={app.total_tracks} icon={BookOpen} />
              </div>
              <BarChartCard
                title="Пользователи по ролям"
                data={[
                  { name: ROLE_LABELS.student, value: app.users_by_role.student ?? 0 },
                  { name: ROLE_LABELS.teacher, value: app.users_by_role.teacher ?? 0 },
                  { name: ROLE_LABELS.superuser, value: app.users_by_role.superuser ?? 0 },
                ]}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard title="Отправок сегодня" value={app.submissions_today} icon={Activity} />
                <StatCard title="Отправок за неделю" value={app.submissions_week} icon={Activity} />
                <StatCard title="Активных сегодня" value={app.active_users_today} icon={Activity} />
              </div>
              {app.recent_activity && app.recent_activity.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Последняя активность</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Урок</TableHead>
                          <TableHead>Тип</TableHead>
                          <TableHead className="text-right">Обновлено</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {app.recent_activity.slice(0, 10).map((a, i) => (
                          <TableRow key={`${a.user_id}-${a.updated_at}-${i}`}>
                            <TableCell className="font-medium truncate max-w-[180px]">{a.lesson_title}</TableCell>
                            <TableCell className="text-muted-foreground">{a.lesson_type}</TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs">
                              {formatDate(a.updated_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
