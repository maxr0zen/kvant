"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { login, setStoredToken, setStoredRole, setStoredUser } from "@/lib/api/auth";
import { useToast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ username, password });
      setStoredToken(res.token);
      if (res.user.role) setStoredRole(res.user.role);
      setStoredUser({ 
        first_name: res.user.first_name, 
        last_name: res.user.last_name, 
        username: res.user.username,
        full_name: res.user.full_name
      });
      toast({ title: "Вход выполнен", description: "Добро пожаловать." });
      router.push("/tracks");
      router.refresh();
    } catch (err) {
      toast({
        title: "Ошибка входа",
        description: err instanceof Error ? err.message : "Проверьте данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-primary/15">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Вход</CardTitle>
        <CardDescription>Введите логин и пароль для входа в платформу</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Логин</Label>
            <Input
              id="username"
              type="text"
              placeholder="логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link href="/tracks" className="underline hover:text-foreground">
            Перейти к трекам
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
