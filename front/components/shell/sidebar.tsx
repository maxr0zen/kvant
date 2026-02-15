"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "./sidebar-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ListChecks,
  PlusCircle,
  BookOpen,
  ChevronDown,
  Users,
  UsersRound,
  UserCircle,
  Puzzle,
  Bell,
  BarChart3,
  MessageCircle,
  HelpCircle,
  Clock,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { fetchTracks } from "@/lib/api/tracks";
import { getStoredRole, getStoredToken } from "@/lib/api/auth";
import type { Track } from "@/lib/types";

/* ---------- Data ---------- */

const teacherCreateItems = [
  { label: "Трек", href: "/admin/tracks/new", icon: PlusCircle },
  { label: "Лекцию", href: "/admin/lectures/new", icon: FileText },
  { label: "Задачу", href: "/admin/tasks/new", icon: ListChecks },
  { label: "Puzzle", href: "/admin/puzzles/new", icon: Puzzle },
  { label: "Вопрос", href: "/admin/questions/new", icon: HelpCircle },
  { label: "Опрос", href: "/admin/surveys/new", icon: MessageCircle },
];

/* ---------- Small helpers ---------- */

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
}

function NavItem({ href, label, icon: Icon, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-lg text-sm transition-colors duration-150",
        collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <span className="px-3 pt-3 pb-1 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider select-none">
      {label}
    </span>
  );
}

/* ---------- Sidebar ---------- */

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const [tracksOpen, setTracksOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetchTracks().then((d) => setTracks(d.tracks));
  }, []);

  useEffect(() => {
    const role = getStoredRole();
    setIsTeacher(role === "teacher" || role === "superuser");
    setIsSuperuser(role === "superuser");
    setIsLoggedIn(Boolean(getStoredToken()));
  }, [pathname]);

  const isMainActive = pathname === "/main" || pathname.startsWith("/main/");
  const isCreateActive = teacherCreateItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r bg-card/50 transition-[width] duration-200 ease-in-out lg:flex lg:flex-col",
        collapsed ? "w-[4.25rem]" : "w-60"
      )}
    >
      <nav className="flex flex-1 flex-col gap-0.5 p-3 overflow-y-auto">
        {/* ── Платформа ── */}
        <SectionLabel label="Платформа" collapsed={collapsed} />

        {collapsed ? (
          /* Collapsed: dropdown для треков */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Треки"
                className={cn(
                  "flex w-full items-center justify-center rounded-lg p-2 text-sm transition-colors duration-150",
                  isMainActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/main" className="cursor-pointer font-medium">
                  Все треки
                </Link>
              </DropdownMenuItem>
              {tracks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-1">
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
          /* Expanded: inline tree */
          <>
            <button
              onClick={() => setTracksOpen((o) => !o)}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors duration-150 gap-3",
                isMainActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span className="truncate">Треки</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 ml-auto transition-transform duration-150",
                  tracksOpen && "rotate-180"
                )}
              />
            </button>
            {tracksOpen && (
              <div className="flex flex-col gap-0.5 ml-5 pl-3 border-l border-border/60">
                <Link
                  href="/main"
                  className={cn(
                    "rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                    pathname === "/main"
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Все треки
                </Link>
                {tracks.map((track) => (
                  <Link
                    key={track.id}
                    href={`/main/${track.id}`}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-sm transition-colors duration-150 truncate",
                      pathname === `/main/${track.id}`
                        ? "text-primary font-medium"
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

        {/* ── Просроченные ── */}
        {isLoggedIn && (
          <NavItem
            href="/overdue"
            label="Просроченные"
            icon={Clock}
            active={pathname === "/overdue" || pathname.startsWith("/overdue/")}
            collapsed={collapsed}
          />
        )}

        {/* ── Администрирование ── */}
        {isSuperuser && (
          <>
            <SectionLabel label="Администрирование" collapsed={collapsed} />
            <NavItem href="/admin/dashboard" label="Панель мониторинга" icon={Activity} active={pathname.startsWith("/admin/dashboard")} collapsed={collapsed} />
            <NavItem href="/admin/groups" label="Группы" icon={UsersRound} active={pathname.startsWith("/admin/groups")} collapsed={collapsed} />
            <NavItem href="/admin/groups" label="Добавить группу" icon={PlusCircle} active={false} collapsed={collapsed} />
            <NavItem href="/admin/users" label="Пользователи" icon={Users} active={pathname.startsWith("/admin/users")} collapsed={collapsed} />
          </>
        )}

        {/* ── Для учителей ── */}
        {isTeacher && (
          <>
            <SectionLabel label="Управление" collapsed={collapsed} />
            <NavItem href="/profile" label="Кабинет" icon={UserCircle} active={pathname === "/profile"} collapsed={collapsed} />

            {/* Создать — dropdown или inline */}
            {collapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    title="Создать"
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg p-2 text-sm transition-colors duration-150",
                      isCreateActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <PlusCircle className="h-4 w-4 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-52">
                  <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-1">
                    Создать
                  </DropdownMenuLabel>
                  {teacherCreateItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="cursor-pointer flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <button
                  onClick={() => setCreateOpen((o) => !o)}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors duration-150 gap-3",
                    isCreateActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">Создать</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 ml-auto transition-transform duration-150",
                      createOpen && "rotate-180"
                    )}
                  />
                </button>
                {createOpen && (
                  <div className="flex flex-col gap-0.5 ml-5 pl-3 border-l border-border/60">
                    {teacherCreateItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "rounded-md px-2 py-1.5 text-sm transition-colors duration-150 flex items-center gap-2",
                            isActive
                              ? "text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground"
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

            <NavItem href="/admin/notifications/new" label="Уведомления" icon={Bell} active={pathname.startsWith("/admin/notifications")} collapsed={collapsed} />
            <NavItem href="/admin/assignments-detail" label="Детализация" icon={BarChart3} active={pathname.startsWith("/admin/assignments-detail")} collapsed={collapsed} />
          </>
        )}
      </nav>
    </aside>
  );
}
