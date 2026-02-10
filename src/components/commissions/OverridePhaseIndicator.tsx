import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp } from "lucide-react";
import { useRepOverrideTracking } from "@/hooks/useOverrideTracking";

interface OverridePhaseIndicatorProps {
  repId?: string;
  compact?: boolean;
}

export function OverridePhaseIndicator({ repId, compact = false }: OverridePhaseIndicatorProps) {
  const { data: tracking } = useRepOverrideTracking(repId);

  if (!tracking) return null;

  const count = tracking.approved_commission_count;
  const complete = tracking.override_phase_complete || count >= 10;

  if (compact) {
    return complete ? (
      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1">
        <CheckCircle className="w-3 h-3" /> Override complete
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs gap-1">
        <TrendingUp className="w-3 h-3" /> #{count}/10 override
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border/50">
      {complete ? (
        <>
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-foreground">Override phase complete</p>
            <p className="text-xs text-muted-foreground">All 10 qualifying commissions approved</p>
          </div>
        </>
      ) : (
        <>
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Commission #{count + 1} of 10 <span className="text-muted-foreground">(override phase)</span>
            </p>
            <p className="text-xs text-muted-foreground">{10 - count} remaining for Sales Manager override</p>
          </div>
        </>
      )}
    </div>
  );
}
