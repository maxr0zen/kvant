"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/shell/mobile-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  clearStoredRole,
  clearStoredToken,
  clearStoredUser,
  getStoredToken,
  getStoredUser,
} from "@/lib/api/auth";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{
    first_name: string;
    last_name: string;
    username: string;
    full_name: string;
  } | null>(null);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
    setHasToken(Boolean(getStoredToken()));
  }, [pathname]);

  function handleLogout() {
    clearStoredToken();
    clearStoredRole();
    clearStoredUser();
    setUser(null);
    setHasToken(false);
    router.push("/login");
    router.refresh();
  }

  const isLoggedIn = mounted && hasToken && user;

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4 lg:px-5 lg:pt-5">
      <div className="mx-auto flex h-[72px] items-center gap-3 rounded-[var(--radius-xl)] border border-border/70 bg-background/95 px-4 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:px-5 lg:px-6">
        <MobileNav />

        <Link href="/" className="flex min-w-0 items-center gap-3 text-foreground hover:no-underline">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5 shrink-0" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-[0.14em] text-muted-foreground">KAVNT</span>
              <span className="hidden rounded-[var(--radius-sm)] bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
                Platform
              </span>
            </div>
            <p className="hidden truncate text-sm text-foreground/88 sm:block">Unified learning and administration workspace</p>
          </div>
        </Link>

        <div className="hidden flex-1 items-center justify-center xl:flex">
          <div className="kavnt-badge">Official workspace</div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Bell className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="max-w-[220px] gap-2 rounded-[var(--radius-md)] border-border/80 bg-background px-3.5 shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="truncate text-sm">{user.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-[var(--radius-md)]">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex cursor-pointer items-center gap-2">
                    <User className="h-4 w-4" />
                    Профиль
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="outline">Войти</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
