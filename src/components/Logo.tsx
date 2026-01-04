import { cn } from "@/lib/utils";
import tsmLogo from "@/assets/tsm-logo.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={tsmLogo}
        alt="TSM Roofing"
        className={cn("w-auto object-contain", sizes[size])}
      />
    </div>
  );
}
