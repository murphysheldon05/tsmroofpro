import { Play, CheckCircle2, Diamond, Square } from "lucide-react";
import type { FlowStep, FlowStepType } from "@/lib/sopMasterConstants";
import { cn } from "@/lib/utils";

interface PlaybookFlowStepProps {
  step: FlowStep;
  isLast: boolean;
}

const stepStyles: Record<FlowStepType, { bgClass: string; borderClass: string; Icon: typeof Play; colorClass: string }> = {
  start: { bgClass: "bg-primary/20", borderClass: "border-primary", Icon: Play, colorClass: "text-primary" },
  end: { bgClass: "bg-primary/20", borderClass: "border-primary", Icon: CheckCircle2, colorClass: "text-primary" },
  decision: { bgClass: "bg-amber-500/20", borderClass: "border-amber-500", Icon: Diamond, colorClass: "text-amber-500" },
  process: { bgClass: "bg-muted", borderClass: "border-border", Icon: Square, colorClass: "text-muted-foreground" }
};

export function PlaybookFlowStep({ step, isLast }: PlaybookFlowStepProps) {
  const style = stepStyles[step.type] || stepStyles.process;
  const { Icon, bgClass, borderClass, colorClass } = style;

  return (
    <div className="flex flex-col items-center">
      {/* Step Card */}
      <div
        className={cn(
          "w-full max-w-xs rounded-xl border-2 p-4 transition-all",
          bgClass,
          borderClass
        )}
      >
        {/* Owner badge */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Icon className={cn("h-4 w-4", colorClass)} />
          <span className="text-xs font-medium text-muted-foreground">
            {step.owner}
          </span>
        </div>
        
        {/* Label */}
        <p className="text-center text-sm font-semibold text-foreground">
          {step.label}
        </p>
        
        {/* Note */}
        {step.note && (
          <p className="text-center text-xs text-muted-foreground mt-1">
            {step.note}
          </p>
        )}
      </div>

      {/* Branches (for decision steps) */}
      {step.branches && step.branches.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-3 max-w-sm">
          {step.branches.map((branch, i) => (
            <span
              key={i}
              className="px-3 py-1 text-xs rounded-full bg-muted text-muted-foreground border border-border"
            >
              {branch}
            </span>
          ))}
        </div>
      )}

      {/* Connector Arrow */}
      {!isLast && (
        <div className="h-8 w-px bg-border my-2 relative">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
        </div>
      )}
    </div>
  );
}
