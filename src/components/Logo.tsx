import { cn } from "@/lib/utils";
import tsmLogo from "@/assets/tsm-logo.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = false }: LogoProps) {
  const sizes = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
    xl: "h-20",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={tsmLogo}
        alt="TSM Roofing"
        className={cn("w-auto object-contain", sizes[size])}
      />
      {showText && (
        <span className="text-sm font-bold text-foreground leading-tight">
          Roof Pro <span className="text-primary">Hub</span>
        </span>
      )}
    </div>
  );
}
