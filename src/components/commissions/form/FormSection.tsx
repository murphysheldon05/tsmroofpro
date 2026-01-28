import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  variant?: "default" | "negative" | "positive" | "primary";
  children: React.ReactNode;
  className?: string;
}

const titleVariantClasses = {
  default: "text-muted-foreground",
  negative: "text-destructive",
  positive: "text-emerald-600 dark:text-emerald-500",
  primary: "text-primary",
};

export function FormSection({ 
  title, 
  variant = "default", 
  children, 
  className 
}: FormSectionProps) {
  return (
    <div className={cn("mb-6", className)}>
      <h3 className={cn(
        "text-sm font-semibold uppercase tracking-wider mb-3 border-b pb-2",
        titleVariantClasses[variant]
      )}>
        {title}
      </h3>
      {children}
    </div>
  );
}
