"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageCircle,
  PlusCircle,
  Puzzle,
  UserCircle,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/lib/utils";
import { useSidebar } from "./sidebar-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchTracks } from "@/lib/api/tracks";
import { getStoredRole, getStoredToken } from "@/lib/api/auth";
import type { Track } from "@/lib/types";

const teacherCreateItems = [
  { label: "Трек", href: "/admin/tracks/new", icon: PlusCircle },
  { label: "Лекцию", href: "/admin/lectures/new", icon: FileText },
  { label: "Задачу", href: "/admin/tasks/new", icon: ListChecks },
  { label: "Puzzle", href: "/admin/puzzles/new", icon: Puzzle },
  { label: "Вопрос", href: "/admin/questions/new", icon: HelpCircle },
  { label: "Опрос", href: "/admin/surveys/new", icon: MessageCircle },
  { label: "Верстку", href: "/admin/layouts/new", icon: Code2 },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  isCollapsed: boolean;
}

function NavItem({ href, label, icon: Icon, active, isCollapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={cn(
        "group flex items-center rounded-[1.15rem] text-sm transition-all duration-200",
        isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-3",
        active
          ? "bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.72)]"
          : "text-muted-foreground hover:bg-secondary/75 hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", !active && "group-hover:scale-105")} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SectionLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
  if (isCollapsed) return null;

  return (
    <div className="px-2 pb-1 pt-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/72">{label}</span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { width, isCollapsed } = useSidebar();
  const [tracksOpen, setTracksOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchTracks().then((data) => setTracks(data.tracks));
  }, []);

  useEffect(() => {
    const role = getStoredRole();
    setIsTeacher(role === "teacher" || role === "superuser");
    setIsSuperuser(role === "superuser");
    setIsLoggedIn(Boolean(getStoredToken()));
  }, [pathname]);

  const isMainActive = pathname === "/main" || pathname.startsWith("/main/");
  const isCreateActive = teacherCreateItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r border-border/70 bg-transparent lg:flex lg:flex-col",
        "transition-[width] duration-300 ease-out"
      )}
      style={{ width }}
    >
      <div className="flex h-full flex-col px-3 py-4">
        {!isCollapsed && (
          <div className="mb-4 rounded-[var(--radius-lg)] border border-border/70 bg-background/95 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Navigation</p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em]">Навигация по платформе</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Быстрый доступ к трекам, задачам, аналитике и рабочим зонам преподавателя.
            </p>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <SectionLabel label="Платформа" isCollapsed={isCollapsed} />

          {isCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  title="Треки"
                  className={cn(
                    "flex w-full items-center justify-center rounded-[1.15rem] py-3 text-sm transition-all duration-200",
                    isMainActive
                      ? "bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.72)]"
                      : "text-muted-foreground hover:bg-secondary/75 hover:text-foreground"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-60 rounded-[var(--radius-md)]">
                <DropdownMenuItem asChild>
                  <Link href="/main" className="cursor-pointer font-medium">
                    Все треки
                  </Link>
                </DropdownMenuItem>
                {tracks.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      По трекам
                    </DropdownMenuLabel>
                    {tracks.map((track) => (
                      <DropdownMenuItem key={track.id} asChild>
                        <Link href={`/main/${track.id}`} className="cursor-pointer">
                          {track.title}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <button
                onClick={() => setTracksOpen((open) => !open)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[1.15rem] px-3.5 py-3 text-sm transition-all duration-200",
                  isMainActive ? "bg-secondary/80 text-foreground" : "text-muted-foreground hover:bg-secondary/75 hover:text-foreground"
                )}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span className="truncate">Треки</span>
                <ChevronDown
                  className={cn("ml-auto h-4 w-4 shrink-0 transition-transform duration-200", tracksOpen && "rotate-180")}
                />
              </button>
              {tracksOpen && (
                <div className="ml-5 mt-1 space-y-1 border-l border-border/70 pl-4">
                  <Link
                    href="/main"
                    className={cn(
                      "block rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                      pathname === "/main" ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Все треки
                  </Link>
                  {tracks.map((track) => (
                    <Link
                      key={track.id}
                      href={`/main/${track.id}`}
                      className={cn(
                        "block truncate rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                        pathname === `/main/${track.id}`
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {track.title}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {isLoggedIn && (
            <>
              <NavItem
                href="/completed"
                label="Выполненные"
                icon={CheckCircle2}
                active={pathname === "/completed" || pathname.startsWith("/completed/")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/overdue"
                label="Просроченные"
                icon={Clock}
                active={pathname === "/overdue" || pathname.startsWith("/overdue/")}
                isCollapsed={isCollapsed}
              />
            </>
          )}

          {isSuperuser && (
            <>
              <SectionLabel label="Администрирование" isCollapsed={isCollapsed} />
              <NavItem
                href="/admin/dashboard"
                label="Мониторинг"
                icon={Activity}
                active={pathname.startsWith("/admin/dashboard")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/admin/groups"
                label="Группы"
                icon={UsersRound}
                active={pathname.startsWith("/admin/groups")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/admin/users"
                label="Пользователи"
                icon={Users}
                active={pathname.startsWith("/admin/users")}
                isCollapsed={isCollapsed}
              />
            </>
          )}

          {isTeacher && (
            <>
              <SectionLabel label="Управление" isCollapsed={isCollapsed} />
              <NavItem href="/profile" label="Кабинет" icon={UserCircle} active={pathname === "/profile"} isCollapsed={isCollapsed} />
              <NavItem
                href="/admin/teachers-materials"
                label="Материалы учителей"
                icon={Library}
                active={pathname.startsWith("/admin/teachers-materials")}
                isCollapsed={isCollapsed}
              />

              {isCollapsed ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      title="Создать"
                      className={cn(
                        "flex w-full items-center justify-center rounded-[1.15rem] py-3 text-sm transition-all duration-200",
                        isCreateActive
                          ? "bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.72)]"
                          : "text-muted-foreground hover:bg-secondary/75 hover:text-foreground"
                      )}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-56 rounded-[var(--radius-md)]">
                    <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Создать
                    </DropdownMenuLabel>
                    {teacherCreateItems.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex cursor-pointer items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <button
                    onClick={() => setCreateOpen((open) => !open)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[1.15rem] px-3.5 py-3 text-sm transition-all duration-200",
                      isCreateActive ? "bg-secondary/80 text-foreground" : "text-muted-foreground hover:bg-secondary/75 hover:text-foreground"
                    )}
                  >
                    <PlusCircle className="h-4 w-4 shrink-0" />
                    <span className="truncate">Создать</span>
                    <ChevronDown
                      className={cn("ml-auto h-4 w-4 shrink-0 transition-transform duration-200", createOpen && "rotate-180")}
                    />
                  </button>
                  {createOpen && (
                    <div className="ml-5 mt-1 space-y-1 border-l border-border/70 pl-4">
                      {teacherCreateItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                              isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <NavItem
                href="/admin/notifications/new"
                label="Уведомления"
                icon={Bell}
                active={pathname.startsWith("/admin/notifications")}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href="/admin/assignments-detail"
                label="Детализация"
                icon={BarChart3}
                active={pathname.startsWith("/admin/assignments-detail")}
                isCollapsed={isCollapsed}
              />
            </>
          )}
        </nav>

        {!isCollapsed && (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-border/70 bg-secondary/45 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">KAVNT Workspace</p>
                <p className="text-xs text-muted-foreground">Theme-ready learning system</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
