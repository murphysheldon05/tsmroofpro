import { useMemo } from "react";
import { CheckCircle, Clock, AlertCircle, XCircle, DollarSign, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStage {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

interface CommissionStatusPipelineProps {
  statusCounts: Record<string, number>;
  activeStatus: string;
  onStatusClick: (status: string) => void;
}

export function CommissionStatusPipeline({ statusCounts, activeStatus, onStatusClick }: CommissionStatusPipelineProps) {
  const stages: PipelineStage[] = useMemo(() => [
    {
      key: "pending_review",
      label: "Pending",
      count: statusCounts["pending_review"] || 0,
      icon: <Clock className="h-5 w-5" />,
      colorClass: "text-amber-400",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/30",
    },
    {
      key: "revision_required",
      label: "Revision",
      count: statusCounts["revision_required"] || 0,
      icon: <AlertCircle className="h-5 w-5" />,
      colorClass: "text-orange-400",
      bgClass: "bg-orange-500/10",
      borderClass: "border-orange-500/30",
    },
    {
      key: "approved",
      label: "Approved",
      count: statusCounts["approved"] || 0,
      icon: <CheckCircle className="h-5 w-5" />,
      colorClass: "text-emerald-400",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/30",
    },
    {
      key: "denied",
      label: "Denied",
      count: statusCounts["denied"] || 0,
      icon: <XCircle className="h-5 w-5" />,
      colorClass: "text-red-400",
      bgClass: "bg-red-500/10",
      borderClass: "border-red-500/30",
    },
    {
      key: "paid",
      label: "Paid",
      count: statusCounts["paid"] || 0,
      icon: <DollarSign className="h-5 w-5" />,
      colorClass: "text-sky-400",
      bgClass: "bg-sky-500/10",
      borderClass: "border-sky-500/30",
    },
  ], [statusCounts]);

  return (
    <div className="w-full">
      {/* Mobile: horizontal scroll pipeline */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none" style={{ touchAction: 'pan-x pan-y' }}>
        {/* "All" chip */}
        <button
          onClick={() => onStatusClick("all")}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-200 min-h-[52px]",
            activeStatus === "all"
              ? "bg-primary/15 border-primary/40 text-primary shadow-sm"
              : "bg-card/60 border-border/50 text-muted-foreground hover:bg-card"
          )}
        >
          <span className="text-sm font-semibold">All</span>
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            activeStatus === "all" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {Object.values(statusCounts).reduce((a, b) => a + b, 0)}
          </span>
        </button>

        {stages.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onStatusClick(stage.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-200 min-h-[52px]",
                activeStatus === stage.key
                  ? `${stage.bgClass} ${stage.borderClass} ${stage.colorClass} shadow-sm`
                  : "bg-card/60 border-border/50 text-muted-foreground hover:bg-card"
              )}
            >
              <span className={cn(activeStatus === stage.key ? stage.colorClass : "text-muted-foreground")}>
                {stage.icon}
              </span>
              <span className="text-sm font-semibold whitespace-nowrap">{stage.label}</span>
              {stage.count > 0 && (
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  activeStatus === stage.key
                    ? `${stage.bgClass} ${stage.colorClass}`
                    : "bg-muted text-muted-foreground"
                )}>
                  {stage.count}
                </span>
              )}
            </button>
            {i < stages.length - 1 && (
              <ChevronRight className="h-4 w-4 text-border flex-shrink-0 hidden sm:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
