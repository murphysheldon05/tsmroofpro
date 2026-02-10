import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusTimelineProps {
  status: string;
  approvalStage: string | null;
  isManagerSubmission?: boolean;
}

const STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "manager_review", label: "Manager Review" },
  { key: "accounting", label: "Accounting" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
];

function getActiveStep(status: string, approvalStage: string | null): number {
  if (status === "paid") return 5;
  if (status === "approved") return 4;
  if (status === "denied") return -1; // special
  if (status === "revision_required") return 1; // back to start
  if (approvalStage === "pending_accounting" || approvalStage === "pending_admin") return 3;
  if (approvalStage === "pending_manager") return 2;
  return 1; // submitted
}

export function CommissionStatusTimeline({ status, approvalStage, isManagerSubmission }: StatusTimelineProps) {
  const activeStep = getActiveStep(status, approvalStage);
  const isDenied = status === "denied";

  if (isDenied) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
        <p className="text-sm font-semibold text-red-500">Commission Denied</p>
        <p className="text-xs text-muted-foreground mt-1">This commission has been permanently denied.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < activeStep;
          const isCurrent = stepNum === activeStep;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary/20 border-2 border-primary text-primary",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{stepNum}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium mt-1.5 text-center whitespace-nowrap",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 rounded-full mt-[-18px]",
                    stepNum < activeStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="sm:hidden space-y-3">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < activeStep;
          const isCurrent = stepNum === activeStep;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary/20 border-2 border-primary text-primary",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-[10px] font-bold">{stepNum}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
