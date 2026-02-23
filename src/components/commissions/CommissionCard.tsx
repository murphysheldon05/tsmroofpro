import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, CheckCircle, AlertCircle, XCircle, DollarSign, Users, MapPin, Calendar, Edit, RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; colorClass: string; bgClass: string }> = {
  pending_review: { 
    label: "Pending Review", 
    icon: <Clock className="h-3.5 w-3.5" />, 
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10 border-amber-500/20"
  },
  rejected: { 
    label: "Rejected", 
    icon: <AlertCircle className="h-3.5 w-3.5" />, 
    colorClass: "text-orange-400",
    bgClass: "bg-orange-500/10 border-orange-500/20"
  },
  approved: { 
    label: "Approved", 
    icon: <CheckCircle className="h-3.5 w-3.5" />, 
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10 border-emerald-500/20"
  },
  denied: { 
    label: "Denied", 
    icon: <XCircle className="h-3.5 w-3.5" />, 
    colorClass: "text-red-400",
    bgClass: "bg-red-500/10 border-red-500/20"
  },
  paid: { 
    label: "Paid", 
    icon: <DollarSign className="h-3.5 w-3.5" />, 
    colorClass: "text-sky-400",
    bgClass: "bg-sky-500/10 border-sky-500/20"
  },
};

interface CommissionCardProps {
  submission: {
    id: string;
    job_name: string;
    job_address: string;
    sales_rep_name?: string | null;
    subcontractor_name?: string | null;
    submission_type: string;
    job_type: string;
    contract_amount: number;
    net_commission_owed: number | null;
    status: string;
    created_at: string;
    was_rejected?: boolean;
  };
}

const formatFullCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
};

export function CommissionCard({ submission }: CommissionCardProps) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[submission.status] || STATUS_CONFIG.pending_review;

  return (
    <button
      onClick={() => navigate(`/commissions/${submission.id}`)}
      className="w-full text-left bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-4 
                 hover:bg-card hover:border-border/60 hover:shadow-md 
                 transition-all duration-200 active:scale-[0.98] min-h-[52px]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground leading-tight truncate">
            {submission.job_name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-sm truncate">{submission.job_address}</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 px-2.5 py-1 rounded-xl font-medium text-xs border",
              config.bgClass, config.colorClass
            )}
          >
            {config.icon}
            {config.label}
          </Badge>
          {submission.was_rejected && (
            <Badge variant="outline" className="gap-1 px-2 py-1 rounded-xl font-medium text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
              Rejected
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {submission.submission_type === "subcontractor" ? (
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {submission.subcontractor_name}
            </span>
          ) : (
            <span>{submission.sales_rep_name}</span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(submission.created_at), "MMM d")}
          </span>
          {submission.status === "rejected" && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/commissions/${submission.id}?edit=true`); }}
              className="flex items-center gap-1 text-amber-500 text-xs font-medium px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </span>
          )}
          {submission.status === "denied" && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/commissions/${submission.id}?edit=true`); }}
              className="flex items-center gap-1 text-red-500 text-xs font-medium px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Resubmit
            </span>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-foreground leading-tight tracking-tight">
            {formatFullCurrency(submission.net_commission_owed || 0)}
          </p>
          <p className="text-xs text-muted-foreground">
            of {formatFullCurrency(submission.contract_amount)}
          </p>
        </div>
      </div>
    </button>
  );
}
