import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/components/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <div className={cn(compact ? "mb-5 space-y-3" : "mb-7 space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Навигация" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              {item.href ? (
                <Link href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between", compact ? "gap-3" : "gap-5")}>
        <div className="min-w-0 flex-1 space-y-2">
          <h1
            className={cn(
              "break-words font-semibold tracking-[-0.03em] text-foreground",
              compact ? "text-[1.5rem] sm:text-[1.75rem]" : "text-[1.9rem] sm:text-[2.4rem]"
            )}
          >
            {title}
          </h1>
          {description && <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>

        {actions && (
          <div
            className={cn("flex shrink-0 flex-wrap items-center", compact ? "gap-2" : "gap-2.5")}
            role="group"
            aria-label="Действия страницы"
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
