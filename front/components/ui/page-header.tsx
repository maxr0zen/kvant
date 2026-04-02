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

export function PageHeader({ title, description, breadcrumbs, actions, className, compact = false }: PageHeaderProps) {
  return (
    <div className={cn(compact ? "mb-4 space-y-1" : "mb-6 space-y-1", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Навигация" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-2">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between", compact ? "gap-2" : "gap-4")}>
        <div className="space-y-1 min-w-0 flex-1">
          <h1 className={cn("font-semibold tracking-tight break-words", compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl")}>{title}</h1>
          {description && <p className="text-sm text-muted-foreground break-words">{description}</p>}
        </div>
        {actions && (
          <div className={cn("flex flex-wrap items-center shrink-0", compact ? "gap-1.5" : "gap-2")} role="group" aria-label="Действия страницы">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
