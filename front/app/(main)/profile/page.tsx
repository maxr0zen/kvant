"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStoredToken, getStoredUser, getStoredRole, clearStoredToken, clearStoredRole, clearStoredUser } from "@/lib/api/auth";

const ROLE_LABELS: Record<string, string> = {
  superuser: "Суперпользователь",
  teacher: "Учитель",
  student: "Ученик",
};

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ name: string; username: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
    setRole(getStoredRole());
  }, []);

  function handleLogout() {
    clearStoredToken();
    clearStoredRole();
    clearStoredUser();
    router.push("/login");
    router.refresh();
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-2xl">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (!getStoredToken() || !user) {
    return (
      <div className="space-y-6 max-w-2xl">
        <p className="text-muted-foreground">Войдите в систему, чтобы открыть личный кабинет.</p>
        <Link href="/login">
          <Button>Войти</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Личный кабинет</h1>
        <p className="text-muted-foreground mt-1">
          Данные вашего аккаунта
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Профиль
          </CardTitle>
          <CardDescription>Логин и роль в системе</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Имя</p>
            <p className="text-base">{user.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Логин</p>
            <p className="text-base font-mono">{user.username}</p>
          </div>
          {role && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Роль</p>
              <p className="text-base">{ROLE_LABELS[role] ?? role}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
        <Link href="/tracks">
          <Button variant="ghost">К трекам</Button>
        </Link>
      </div>
    </div>
  );
}
