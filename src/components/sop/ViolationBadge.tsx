import { cn } from "@/lib/utils";

type ViolationSeverity = "MINOR" | "MAJOR" | "SEVERE";

interface ViolationBadgeProps {
  severity: ViolationSeverity;
  className?: string;
}

const severityStyles: Record<ViolationSeverity, { bg: string; text: string }> = {
  MINOR: { bg: "bg-yellow-500/20", text: "text-yellow-500" },
  MAJOR: { bg: "bg-orange-500/20", text: "text-orange-500" },
  SEVERE: { bg: "bg-destructive/20", text: "text-destructive" }
};

export function ViolationBadge({ severity, className }: ViolationBadgeProps) {
  const style = severityStyles[severity] || severityStyles.MINOR;
  
  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-bold rounded-full",
        style.bg,
        style.text,
        className
      )}
    >
      {severity}
    </span>
  );
}
