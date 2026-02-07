import { Play, Square, Diamond, CheckCircle2, ArrowDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SOPFlowStep } from "@/lib/sopMasterConstants";

interface FlowStepProps {
  step: SOPFlowStep;
  isLast: boolean;
}

function FlowStep({ step, isLast }: FlowStepProps) {
  const getStepStyle = (type: SOPFlowStep['type']) => {
    switch (type) {
      case 'start':
        return {
          bg: 'bg-primary/20',
          border: 'border-primary',
          Icon: Play,
          iconColor: 'text-primary',
        };
      case 'end':
        return {
          bg: 'bg-primary/20',
          border: 'border-primary',
          Icon: CheckCircle2,
          iconColor: 'text-primary',
        };
      case 'decision':
        return {
          bg: 'bg-amber-500/20',
          border: 'border-amber-500',
          Icon: Diamond,
          iconColor: 'text-amber-500',
        };
      default:
        return {
          bg: 'bg-muted',
          border: 'border-border',
          Icon: Square,
          iconColor: 'text-muted-foreground',
        };
    }
  };

  const style = getStepStyle(step.type);
  const IconComponent = style.Icon;

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      {/* Step Box */}
      <div
        className={cn(
          "w-full p-4 rounded-xl border-2 text-center transition-all",
          style.bg,
          style.border
        )}
      >
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-1">
          <IconComponent className={cn("h-3 w-3", style.iconColor)} />
          <span>{step.owner}</span>
        </div>
        <p className="font-medium text-sm">{step.label}</p>
        {step.note && (
          <p className="text-xs text-muted-foreground mt-1 italic">{step.note}</p>
        )}
      </div>

      {/* Branches for decision nodes */}
      {step.branches && step.branches.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-3 px-2">
          {step.branches.map((branch, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
            >
              <ChevronRight className="h-3 w-3" />
              <span>{branch}</span>
            </div>
          ))}
        </div>
      )}

      {/* Arrow to next step */}
      {!isLast && (
        <div className="flex flex-col items-center py-2">
          <div className="w-0.5 h-4 bg-border" />
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

interface SOPFlowDiagramProps {
  steps: SOPFlowStep[];
}

export function SOPFlowDiagram({ steps }: SOPFlowDiagramProps) {
  return (
    <div className="flex flex-col items-center py-6 bg-muted/30 rounded-xl border border-border">
      {steps.map((step, idx) => (
        <FlowStep key={idx} step={step} isLast={idx === steps.length - 1} />
      ))}
    </div>
  );
}
