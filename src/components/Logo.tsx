import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-glow-sm">
          <span className="text-primary-foreground font-bold text-sm">TSM</span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className={cn("font-bold tracking-tight text-foreground", sizes[size])}>
          TSM Roofing
        </span>
        {size !== "sm" && (
          <span className="text-xs text-muted-foreground tracking-wide uppercase">
            Employee Portal
          </span>
        )}
      </div>
    </div>
  );
}
