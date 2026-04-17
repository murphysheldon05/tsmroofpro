import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Tailwind color family for the icon badge, e.g. "emerald", "amber". Defaults to primary. */
  tone?: "primary" | "emerald" | "amber" | "blue" | "rose" | "slate";
  className?: string;
  size?: "sm" | "md" | "lg";
}

const toneMap: Record<NonNullable<EmptyStateProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  slate: "bg-muted text-muted-foreground",
};

const sizeMap = {
  sm: { wrap: "py-6 gap-2", icon: "w-10 h-10", iconSize: "w-5 h-5", title: "text-sm font-semibold", desc: "text-xs" },
  md: { wrap: "py-10 gap-3", icon: "w-14 h-14", iconSize: "w-7 h-7", title: "text-base font-semibold", desc: "text-sm" },
  lg: { wrap: "py-14 gap-4", icon: "w-16 h-16", iconSize: "w-8 h-8", title: "text-lg font-semibold", desc: "text-sm" },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "primary",
  className,
  size = "md",
}: EmptyStateProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", s.wrap, className)}>
      {Icon && (
        <div className={cn("rounded-2xl flex items-center justify-center", s.icon, toneMap[tone])}>
          <Icon className={s.iconSize} />
        </div>
      )}
      <div className="space-y-1">
        <p className={cn(s.title, "text-foreground")}>{title}</p>
        {description && (
          <p className={cn(s.desc, "text-muted-foreground max-w-sm mx-auto")}>{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
