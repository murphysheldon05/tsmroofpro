import { CheckCircle2, Play, Square, Diamond } from "lucide-react";
import { FlowStep } from "@/lib/masterPlaybookSOPs";

interface PlaybookFlowStepProps {
  step: FlowStep;
  isLast: boolean;
}

export function PlaybookFlowStep({ step, isLast }: PlaybookFlowStepProps) {
  const getStepStyle = (type: FlowStep['type']) => {
    switch (type) {
      case 'start':
        return { 
          className: 'bg-primary/20 border-primary', 
          Icon: Play, 
          iconClassName: 'text-primary' 
        };
      case 'end':
        return { 
          className: 'bg-primary/20 border-primary', 
          Icon: CheckCircle2, 
          iconClassName: 'text-primary' 
        };
      case 'decision':
        return { 
          className: 'bg-amber-500/20 border-amber-500', 
          Icon: Diamond, 
          iconClassName: 'text-amber-500' 
        };
      default:
        return { 
          className: 'bg-muted border-border', 
          Icon: Square, 
          iconClassName: 'text-muted-foreground' 
        };
    }
  };

  const style = getStepStyle(step.type);
  const Icon = style.Icon;

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      <div
        className={`w-full rounded-lg p-4 border-2 transition-all ${style.className}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon size={16} className={style.iconClassName} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {step.owner}
          </span>
        </div>
        <p className="text-foreground font-medium">{step.label}</p>
        {step.note && <p className="text-sm text-muted-foreground mt-1">{step.note}</p>}
      </div>

      {step.branches && step.branches.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-3 px-2">
          {step.branches.map((branch, idx) => (
            <span
              key={idx}
              className="text-xs px-3 py-1.5 rounded-full border bg-amber-500/10 border-amber-500/50 text-amber-500"
            >
              {branch}
            </span>
          ))}
        </div>
      )}

      {!isLast && (
        <div className="flex flex-col items-center my-2">
          <div className="w-0.5 h-6 bg-border" />
          <div
            className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-border"
          />
        </div>
      )}
    </div>
  );
}
