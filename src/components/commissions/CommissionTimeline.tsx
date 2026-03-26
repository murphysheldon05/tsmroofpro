import {
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  ArrowRight,
  Zap,
  FileText,
  Edit,
} from "lucide-react";
import { useCommissionAuditLog, type AuditLogEntry } from "@/hooks/useCommissionAuditLog";
import { formatTimestampMST } from "@/lib/commissionPayDateCalculations";
import { Loader2 } from "lucide-react";

const ACTION_CONFIG: Record<string, { icon: typeof Send; color: string; bgColor: string; label: string }> = {
  submitted: {
    icon: Send,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
    label: "Commission Submitted",
  },
  approved: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/40",
    label: "Approved",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/40",
    label: "Rejected",
  },
  revision_requested: {
    icon: AlertTriangle,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/40",
    label: "Revision Requested",
  },
  revision_submitted: {
    icon: RefreshCw,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
    label: "Revision Resubmitted",
  },
  paid: {
    icon: DollarSign,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/40",
    label: "Paid",
  },
  rolled_to_next_pay_run: {
    icon: ArrowRight,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/40",
    label: "Rolled to Next Pay Run",
  },
  admin_override_pulled_in: {
    icon: Zap,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/40",
    label: "Admin Override — Pulled into Current Pay Run",
  },
  notes_added: {
    icon: FileText,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800/40",
    label: "Notes Added",
  },
  edited: {
    icon: Edit,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800/40",
    label: "Edited",
  },
};

function getActionLabel(entry: AuditLogEntry): string {
  const config = ACTION_CONFIG[entry.action];
  let label = config?.label || entry.action;

  if (entry.action === "approved" && entry.details?.stage) {
    const stage = entry.details.stage === "compliance" ? "Compliance" : "Accounting";
    label = `${stage} Approved`;
  }

  if (entry.performer_name && entry.performer_name !== "System") {
    label += ` by ${entry.performer_name}`;
  }

  return label;
}

function getDetailText(entry: AuditLogEntry): string | null {
  if (!entry.details) return null;
  if (entry.details.reason) return entry.details.reason;
  if (entry.details.message) return entry.details.message;
  if (entry.details.changes) return entry.details.changes;
  if (entry.details.comment) return entry.details.comment;
  return null;
}

interface CommissionTimelineProps {
  commissionId: string;
}

export function CommissionTimeline({ commissionId }: CommissionTimelineProps) {
  const { data: entries, isLoading } = useCommissionAuditLog(commissionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[17px] top-3 bottom-3 w-px bg-border" />

      {entries.map((entry, idx) => {
        const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.notes_added;
        const Icon = config.icon;
        const detail = getDetailText(entry);

        return (
          <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Icon dot */}
            <div className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium leading-tight">
                {getActionLabel(entry)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTimestampMST(entry.performed_at)}
              </p>
              {detail && (
                <p className="text-sm text-muted-foreground mt-1 bg-muted/50 rounded-md px-3 py-2">
                  {detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
