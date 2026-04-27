export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--surface-glow)/0.45),transparent_36%)]" />
      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hero-surface hidden overflow-hidden p-8 lg:flex lg:min-h-[720px] lg:flex-col lg:justify-between">
          <div className="relative z-10 max-w-xl space-y-6">
            <span className="kavnt-badge">KAVNT Platform</span>
            <div className="space-y-4">
              <h1 className="text-5xl font-semibold tracking-[-0.05em] text-foreground">
                Платформа, в которой следующий шаг читается мгновенно.
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                Светлая премиальная система для обучения, преподавания и платформенного мониторинга. Спокойная
                типографика, много воздуха и ясная иерархия действий.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[var(--radius-lg)] border border-border/70 bg-background/95 p-5 shadow-[var(--shadow-soft)]">
                <p className="text-sm text-muted-foreground">Student flow</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Continue track</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Прогресс, дедлайны и награды собраны в один спокойный dashboard.</p>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-border/70 bg-background/95 p-5 shadow-[var(--shadow-soft)]">
                <p className="text-sm text-muted-foreground">Teacher workspace</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Review queue</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Аналитика группы, контекст ученика и управленческие действия без визуального шума.</p>
              </div>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-border/70 bg-background/95 p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Admin monitor</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">System health and learning velocity</p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-border/70 bg-secondary/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Stable UI
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="relative flex items-center justify-center">{children}</div>
      </div>
    </div>
  );
}
