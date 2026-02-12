"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ListChecks,
  PlusCircle,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
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
} from "lucide-react";
import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
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

const teacherCreateItems = [
  { label: "Трек", href: "/admin/tracks/new", icon: PlusCircle },
  { label: "Лекцию", href: "/admin/lectures/new", icon: FileText },
  { label: "Задачу", href: "/admin/tasks/new", icon: ListChecks },
  { label: "Puzzle", href: "/admin/puzzles/new", icon: Puzzle },
  { label: "Вопрос", href: "/admin/questions/new", icon: HelpCircle },
  { label: "Опрос", href: "/admin/surveys/new", icon: MessageCircle },
];

const teacherOtherItems = [
  { label: "Личный кабинет", href: "/profile", icon: UserCircle },
  { label: "Уведомления", href: "/admin/notifications/new", icon: Bell },
  { label: "Детализация заданий", href: "/admin/assignments-detail", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
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
        "hidden shrink-0 border-r border-primary/10 bg-card transition-[width] duration-200 ease-in-out lg:block overflow-hidden",
        collapsed ? "w-[4.25rem]" : "w-56"
      )}
    >
      <div className="flex h-full flex-col gap-4 p-3">
        {/* Раздел «Платформа»: заголовок + раскрывающийся список треков внутри сайдбара */}
        <div className="flex flex-col gap-0.5">
          <div
            className={cn(
              "flex h-8 items-center gap-2 px-2",
              collapsed && "justify-center px-0"
            )}
          >
            <BookOpen className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <span className="font-semibold whitespace-nowrap text-muted-foreground text-xs uppercase tracking-wider">
                Платформа
              </span>
            )}
          </div>

          {collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  title="Треки"
                  className={cn(
                    "flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm transition-colors",
                    isMainActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-1">
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
                onClick={() => setTracksOpen((o) => !o)}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors gap-3",
                  isMainActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Треки</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 ml-auto transition-transform",
                    tracksOpen && "rotate-180"
                  )}
                />
              </button>
              {tracksOpen && (
                <div className="flex flex-col gap-0.5 pl-4 pt-2 pb-1 border-l border-border ml-3 mt-1">
                  <Link
                    href="/main"
                    className={cn(
                      "rounded-md px-2 py-1.5 text-sm transition-colors font-medium",
                      pathname === "/main"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    Все треки
                  </Link>
                  {tracks.length > 0 && (
                    <>
                      <div className="my-1.5 border-t border-border w-full" />
                      <span className="px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        По трекам
                      </span>
                      {tracks.map((track) => (
                        <Link
                          key={track.id}
                          href={`/main/${track.id}`}
                          className={cn(
                            "rounded-md px-2 py-1.5 text-sm transition-colors truncate",
                            pathname === `/main/${track.id}`
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          {track.title}
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Просроченные задания: для всех авторизованных */}
        {isLoggedIn && (
          <div className="flex flex-col gap-0.5 pt-4 border-t border-border">
            <Link
              href="/overdue"
              title={collapsed ? "Просроченные задания" : undefined}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                collapsed ? "justify-center px-2" : "gap-3",
                (pathname === "/overdue" || pathname.startsWith("/overdue/"))
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Clock className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap">Просроченные задания</span>
              )}
            </Link>
          </div>
        )}

        {/* Администрирование: только для superuser */}
        {isSuperuser && (
          <div className="flex flex-col gap-0.5 pt-4 border-t border-border">
            {!collapsed && (
              <div className="px-3 pt-1 pb-0.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Администрирование
                </span>
              </div>
            )}
            <Link
              href="/admin/groups"
              title={collapsed ? "Группы" : undefined}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                collapsed ? "justify-center px-2" : "gap-3",
                pathname === "/admin/groups" || pathname.startsWith("/admin/groups")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <UsersRound className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">Группы</span>}
            </Link>
            <Link
              href="/admin/users"
              title={collapsed ? "Пользователи" : undefined}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                collapsed ? "justify-center px-2" : "gap-3",
                pathname === "/admin/users" || pathname.startsWith("/admin/users")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Users className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">Пользователи</span>}
            </Link>
          </div>
        )}

        {/* Кнопки только для учителей */}
        {isTeacher && (
          <div className="flex flex-col gap-0.5 pt-4 border-t border-border">
            {!collapsed && (
              <div className="px-3 pt-1 pb-0.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Для учителей
                </span>
              </div>
            )}

            {/* Личный кабинет — первым */}
            <Link
              href={teacherOtherItems[0].href}
              title={collapsed ? teacherOtherItems[0].label : undefined}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                collapsed ? "justify-center px-2" : "gap-3",
                (pathname === teacherOtherItems[0].href || pathname.startsWith(teacherOtherItems[0].href + "/"))
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <UserCircle className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap">{teacherOtherItems[0].label}</span>
              )}
            </Link>

            {/* Выпадающий список «Создать» — вторым */}
            {collapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    title="Создать"
                    className={cn(
                      "flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm transition-colors",
                      isCreateActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <PlusCircle className="h-4 w-4 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-56">
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-1">
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
                    "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors gap-3",
                    isCreateActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">Создать</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 ml-auto transition-transform",
                      createOpen && "rotate-180"
                    )}
                  />
                </button>
                {createOpen && (
                  <div className="flex flex-col gap-0.5 pl-4 pt-2 pb-1 border-l border-border ml-3 mt-1">
                    <span className="px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Создать
                    </span>
                    {teacherCreateItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "rounded-md px-2 py-1.5 text-sm transition-colors flex items-center gap-2",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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

            {/* Остальные пункты: уведомления, детализация */}
            {teacherOtherItems.slice(1).map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 mt-auto",
            collapsed ? "w-full justify-center" : "self-start"
          )}
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
