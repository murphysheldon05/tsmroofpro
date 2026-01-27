import type React from "react";
import { Label } from "@/components/ui/label";

export type CommissionFormRowVariant =
  | "default"
  | "negative"
  | "positive"
  | "calculated";

interface CommissionDocumentFormRowProps {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: string;
  variant?: CommissionFormRowVariant;
  highlight?: boolean;
}

export function CommissionDocumentFormRow({
  label,
  children,
  hint,
  variant = "default",
  highlight = false,
}: CommissionDocumentFormRowProps) {
  const variantClasses: Record<CommissionFormRowVariant, string> = {
    default: "hover:bg-muted/20",
    negative: "hover:bg-destructive/5",
    positive: "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
    calculated: "bg-muted/30 rounded-md",
  };

  return (
    <div
      className={`py-3 sm:py-2 border-b transition-colors ${variantClasses[variant]} ${highlight ? "bg-emerald-50 dark:bg-emerald-900/20 rounded-lg" : ""}`}
    >
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[180px_1fr] lg:grid-cols-[200px_180px_1fr] sm:gap-3 sm:items-center">
        <Label
          className={`font-medium text-sm sm:text-base ${variant === "negative" ? "text-destructive" : ""} ${variant === "positive" ? "text-emerald-600" : ""}`}
        >
          {label}
        </Label>
        <div className="w-full sm:w-auto">{children}</div>
        {hint && (
          <span className="text-xs sm:text-sm text-muted-foreground hidden lg:block">
            {hint}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1 lg:hidden">{hint}</p>}
    </div>
  );
}
