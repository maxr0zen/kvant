"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BookOpen, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStoredToken, getStoredUser, clearStoredToken, clearStoredRole, clearStoredUser } from "@/lib/api/auth";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ first_name: string; last_name: string; username: string; full_name: string } | null>(null);
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
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
          <BookOpen className="h-6 w-6 shrink-0" />
          <span className="hidden sm:inline-block">Образовательная платформа</span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Separator orientation="vertical" className="h-6" />
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="max-w-[140px] truncate sm:max-w-[200px]">{user.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Личный кабинет
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                Войти
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
