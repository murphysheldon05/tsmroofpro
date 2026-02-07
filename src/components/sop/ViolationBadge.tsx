import { cn } from "@/lib/utils";

interface ViolationBadgeProps {
  severity: 'MINOR' | 'MAJOR' | 'SEVERE';
}

export function ViolationBadge({ severity }: ViolationBadgeProps) {
  const config = {
    MINOR: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-500/30',
    },
    MAJOR: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500/30',
    },
    SEVERE: {
      bg: 'bg-destructive/10',
      text: 'text-destructive',
      border: 'border-destructive/30',
    },
  };

  const style = config[severity] || config.MINOR;

  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-bold rounded border",
        style.bg,
        style.text,
        style.border
      )}
    >
      {severity}
    </span>
  );
}
