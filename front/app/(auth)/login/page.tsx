"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login, setStoredRole, setStoredToken, setStoredUser } from "@/lib/api/auth";
import { useToast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login({ username, password });
      setStoredToken(res.token);
      if (res.user.role) setStoredRole(res.user.role);
      setStoredUser({
        first_name: res.user.first_name,
        last_name: res.user.last_name,
        username: res.user.username,
        full_name: res.user.full_name,
      });

      toast({
        title: "Вход выполнен",
        description: `Добро пожаловать, ${res.user.full_name}.`,
      });

      router.push("/main");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Проверьте логин и пароль";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-[30rem] overflow-hidden rounded-[var(--radius-xl)] border-border/70 bg-card/95 shadow-[var(--shadow-soft)]">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <span className="kavnt-badge">Secure access</span>
            <div className="space-y-3">
              <CardTitle className="text-[1.85rem] leading-none tracking-[-0.03em]">Вход в KAVNT</CardTitle>
              <CardDescription className="max-w-md text-sm leading-6">
                Войдите в платформу, чтобы продолжить обучение, проверить рабочие очереди или открыть мониторинг системы.
              </CardDescription>
            </div>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
            <LockKeyhole className="h-6 w-6" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-[var(--radius-md)] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username">Логин</Label>
            <Input
              id="username"
              type="text"
              placeholder="Введите логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-9 w-9 rounded-[var(--radius-sm)]"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full justify-between" disabled={loading}>
            <span>{loading ? "Выполняем вход..." : "Войти в платформу"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="rounded-[var(--radius-md)] border border-border/70 bg-secondary/45 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Нужен быстрый доступ к содержимому платформы?
            <Link href="/main" className="ml-1 font-medium text-primary hover:underline">
              Перейти к трекам
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
