import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

const variantClasses: Record<CommissionFormRowVariant, string> = {
  default: "hover:bg-muted/20",
  negative: "hover:bg-destructive/5",
  positive: "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
  calculated: "bg-muted/30 rounded-md",
};

const labelVariantClasses: Record<CommissionFormRowVariant, string> = {
  default: "",
  negative: "text-destructive",
  positive: "text-emerald-600 dark:text-emerald-500",
  calculated: "",
};

export const CommissionDocumentFormRow = React.forwardRef<
  HTMLDivElement,
  CommissionDocumentFormRowProps
>(({ label, children, hint, variant = "default", highlight = false }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "py-3 sm:py-2 border-b transition-colors",
        variantClasses[variant],
        highlight && "bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"
      )}
    >
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[180px_1fr] lg:grid-cols-[200px_180px_1fr] sm:gap-3 sm:items-center">
        <Label className={cn("font-medium text-sm sm:text-base", labelVariantClasses[variant])}>
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
});

CommissionDocumentFormRow.displayName = "CommissionDocumentFormRow";
