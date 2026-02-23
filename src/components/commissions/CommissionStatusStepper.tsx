import { CheckCircle2, Clock, Circle, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface StepInfo {
  label: string;
  status: "completed" | "active" | "upcoming" | "rejected";
  actor?: string | null;
  date?: string | null;
  notes?: string | null;
}

interface CommissionStatusStepperProps {
  documentStatus: string;
  submittedAt?: string | null;
  managerApprovedBy?: string | null;
  managerApprovedAt?: string | null;
  accountingApprovedBy?: string | null;
  accountingApprovedAt?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
  revisionReason?: string | null;
  approvalComment?: string | null;
  salesRep?: string;
}

export function CommissionStatusStepper({
  documentStatus,
  submittedAt,
  managerApprovedBy,
  managerApprovedAt,
  accountingApprovedBy,
  accountingApprovedAt,
  paidAt,
  paidBy,
  revisionReason,
  approvalComment,
  salesRep,
}: CommissionStatusStepperProps) {
  const steps: StepInfo[] = [];

  const formatDate = (d: string | null | undefined) =>
    d ? format(parseISO(d), "MMM d, yyyy h:mm a") : null;

  // Step 1: Submitted
  const isSubmitted = documentStatus !== "draft";
  steps.push({
    label: "Submitted",
    status: isSubmitted ? "completed" : documentStatus === "draft" ? "active" : "upcoming",
    actor: salesRep,
    date: formatDate(submittedAt),
  });

  // Step 2: Compliance Review (completed by Compliance Officer / Manny Madrid; Admin/Sheldon can action as backup)
  const isManagerApproved = ["manager_approved", "accounting_approved", "approved", "paid"].includes(documentStatus);
  const isRejected = documentStatus === "revision_required" || documentStatus === "rejected"; // rejected = sent back to rep
  const isDenied = documentStatus === "denied";
  steps.push({
    label: "Compliance Review",
    status: isManagerApproved
      ? "completed"
      : isRejected || isDenied
        ? "rejected"
        : documentStatus === "submitted"
          ? "active"
          : "upcoming",
    actor: managerApprovedBy,
    date: formatDate(managerApprovedAt),
    notes: isRejected ? revisionReason : isDenied ? approvalComment : null,
  });

  // Step 3: Accounting Approved (actioned by Courtney Murphy)
  const isAccountingApproved = ["accounting_approved", "approved", "paid"].includes(documentStatus);
  steps.push({
    label: "Accounting Approved",
    status: isAccountingApproved
      ? "completed"
      : documentStatus === "manager_approved"
        ? "active"
        : "upcoming",
    actor: accountingApprovedBy,
    date: formatDate(accountingApprovedAt),
  });

  // Step 4: Mark Paid
  steps.push({
    label: "Mark Paid",
    status: documentStatus === "paid"
      ? "completed"
      : documentStatus === "accounting_approved"
        ? "active"
        : "upcoming",
    actor: paidBy,
    date: formatDate(paidAt),
  });

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center min-w-[100px]">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2",
                step.status === "completed" && "bg-green-100 border-green-500 text-green-600",
                step.status === "active" && "bg-blue-100 border-blue-500 text-blue-600 animate-pulse",
                step.status === "upcoming" && "bg-muted border-muted-foreground/30 text-muted-foreground",
                step.status === "rejected" && "bg-red-100 border-red-500 text-red-600"
              )}
            >
              {step.status === "completed" && <CheckCircle2 className="h-5 w-5" />}
              {step.status === "active" && <Clock className="h-5 w-5" />}
              {step.status === "upcoming" && <Circle className="h-4 w-4" />}
              {step.status === "rejected" && <AlertCircle className="h-5 w-5" />}
            </div>
            <span
              className={cn(
                "text-xs font-medium mt-1 text-center",
                step.status === "completed" && "text-green-700",
                step.status === "active" && "text-blue-700",
                step.status === "upcoming" && "text-muted-foreground",
                step.status === "rejected" && "text-red-700"
              )}
            >
              {step.label}
            </span>
            {step.date && (
              <span className="text-[10px] text-muted-foreground text-center">{step.date}</span>
            )}
            {step.notes && (
              <span className="text-[10px] text-red-600 text-center max-w-[120px] truncate" title={step.notes}>
                {step.notes}
              </span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 w-8 mx-1",
                steps[i + 1].status !== "upcoming" ? "bg-green-400" : "bg-muted-foreground/20"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
