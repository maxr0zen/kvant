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
  Users,
  UsersRound,
  UserCircle,
  Puzzle,
  Bell,
  BarChart3,
  MessageCircle,
  HelpCircle,
  Clock,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
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

function MobileNavItem({ href, label, icon: Icon, active, onClose }: { href: string; label: string; icon: typeof BookOpen; active: boolean; onClose: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function MobileNavSection({ label }: { label: string }) {
  return (
    <span className="px-3 pt-4 pb-1 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider select-none">
      {label}
    </span>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button — visible only on mobile (lg:hidden) */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-9 w-9 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Overlay + Drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl lg:hidden flex flex-col animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-4 border-b">
              <span className="font-semibold text-sm flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Меню
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(false)}
                aria-label="Закрыть меню"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
              <MobileNavSection label="Платформа" />
              <MobileNavItem
                href="/main"
                label="Все треки"
                icon={LayoutDashboard}
                active={pathname === "/main"}
                onClose={() => setOpen(false)}
              />
              {tracks.map((track) => (
                <Link
                  key={track.id}
                  href={`/main/${track.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ml-4",
                    pathname === `/main/${track.id}`
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {track.title}
                </Link>
              ))}

              {isLoggedIn && (
                <MobileNavItem
                  href="/overdue"
                  label="Просроченные"
                  icon={Clock}
                  active={pathname === "/overdue" || pathname.startsWith("/overdue/")}
                  onClose={() => setOpen(false)}
                />
              )}

              {isSuperuser && (
                <>
                  <MobileNavSection label="Администрирование" />
                  <MobileNavItem href="/admin/groups" label="Группы" icon={UsersRound} active={pathname.startsWith("/admin/groups")} onClose={() => setOpen(false)} />
                  <MobileNavItem href="/admin/users" label="Пользователи" icon={Users} active={pathname.startsWith("/admin/users")} onClose={() => setOpen(false)} />
                </>
              )}

              {isTeacher && (
                <>
                  <MobileNavSection label="Управление" />
                  <MobileNavItem href="/profile" label="Кабинет" icon={UserCircle} active={pathname === "/profile"} onClose={() => setOpen(false)} />
                  <MobileNavSection label="Создать" />
                  {teacherCreateItems.map((item) => (
                    <MobileNavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={pathname === item.href || pathname.startsWith(item.href + "/")}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                  <MobileNavItem href="/admin/notifications/new" label="Уведомления" icon={Bell} active={pathname.startsWith("/admin/notifications")} onClose={() => setOpen(false)} />
                  <MobileNavItem href="/admin/assignments-detail" label="Детализация" icon={BarChart3} active={pathname.startsWith("/admin/assignments-detail")} onClose={() => setOpen(false)} />
                </>
              )}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
