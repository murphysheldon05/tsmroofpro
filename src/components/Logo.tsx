import { cn } from "@/lib/utils";
import tsmLogo from "@/assets/distressed-logo.jpg";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizeMap = {
  sm: 28,
  md: 40,
  lg: 70,
  xl: 90,
};

export function Logo({ className, size = "md", showText = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={tsmLogo}
        alt="TSM Roofing"
        style={{ height: `${sizeMap[size]}px`, width: "auto" }}
        className="object-contain"
      />
      {showText && (
        <span className="text-sm font-bold text-foreground leading-tight">
          Roof Pro <span className="text-primary">Hub</span>
        </span>
      )}
    </div>
  );
}
