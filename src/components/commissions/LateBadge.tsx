import { Badge } from "@/components/ui/badge";

interface LateBadgeProps {
  isLateSubmission?: boolean;
  isLateRevision?: boolean;
}

export function LateBadge({ isLateSubmission, isLateRevision }: LateBadgeProps) {
  if (!isLateSubmission && !isLateRevision) return null;

  return (
    <Badge
      variant="outline"
      className="bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700 text-[10px] px-1.5 py-0"
    >
      Late
    </Badge>
  );
}
