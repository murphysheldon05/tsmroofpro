import { usePendingReview, PendingItem, SlaStatus } from "@/hooks/usePendingReview";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  FileText,
  DollarSign,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  Edit,
  MessageSquare,
  ChevronRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const typeIcons = {
  commission: DollarSign,
  request: FileText,
  warranty: Shield,
};

const typeColors = {
  commission: "text-emerald-500",
  request: "text-blue-500",
  warranty: "text-primary",
};

const typeLabels = {
  commission: "Commission",
  request: "Request",
  warranty: "Warranty",
};

const actionLabels = {
  review: "Needs Review",
  revision: "Needs Revision",
  info_needed: "Info Requested",
};

const slaStyles: Record<SlaStatus, { label: string; className: string; icon: React.ElementType }> = {
  overdue: { label: "Overdue", className: "bg-destructive text-destructive-foreground", icon: AlertCircle },
  due_today: { label: "Due Today", className: "bg-amber-500 text-white", icon: Clock },
  due_tomorrow: { label: "Due Tomorrow", className: "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200", icon: Clock },
  on_track: { label: "On Track", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", icon: CheckCircle },
};

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "destructive" | "outline";
}

function ActionButton({ icon: Icon, label, onClick, variant = "outline" }: ActionButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant={variant} className="h-7 w-7" onClick={onClick}>
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>{label}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SlaBadge({ status }: { status: SlaStatus }) {
  const style = slaStyles[status];
  const Icon = style.icon;
  return (
    <Badge className={`text-[10px] px-1.5 py-0 gap-0.5 ${style.className}`}>
      <Icon className="w-2.5 h-2.5" />{style.label}
    </Badge>
  );
}

function PendingItemRow({ item, isReviewer, onNavigate }: { item: PendingItem; isReviewer: boolean; onNavigate: (item: PendingItem) => void }) {
  const navigate = useNavigate();
  const Icon = typeIcons[item.type];
  const handleReview = (e: React.MouseEvent) => { e.stopPropagation(); onNavigate(item); };
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === "commission") navigate(`/commissions/${item.id}?edit=true`);
    else onNavigate(item);
  };

  return (
    <div onClick={() => onNavigate(item)} className="w-full text-left p-2.5 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${typeColors[item.type]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1 py-0">{typeLabels[item.type]}</Badge>
            <p className="text-xs font-medium truncate flex-1">{item.title}</p>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-1 py-0">{actionLabels[item.requires_action]}</Badge>
            <SlaBadge status={item.sla_status} />
            <span className="text-[10px] text-muted-foreground">{item.age_days}d</span>
          </div>
          {item.rejection_reason && (
            <div className="p-1.5 rounded bg-destructive/5 border border-destructive/10 mt-1">
              <p className="text-[10px] text-muted-foreground line-clamp-1">{item.rejection_reason}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
            {isReviewer ? (
              <>
                <ActionButton icon={Eye} label="Review" onClick={handleReview} />
                {item.type === "commission" && (
                  <>
                    <ActionButton icon={CheckCircle} label="Approve" onClick={handleReview} />
                    <ActionButton icon={XCircle} label="Request Revision" onClick={handleReview} variant="destructive" />
                  </>
                )}
              </>
            ) : (
              <>
                {item.requires_action === "revision" && <ActionButton icon={Edit} label="Edit & Resubmit" onClick={handleEdit} />}
                {item.requires_action === "info_needed" && <ActionButton icon={MessageSquare} label="Provide Info" onClick={handleReview} />}
                <ActionButton icon={Eye} label="View Details" onClick={handleReview} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActionRequiredWidget() {
  const { data, isLoading } = usePendingReview();
  const { isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const isReviewer = isAdmin || isManager;

  const handleNavigate = (item: PendingItem) => {
    switch (item.type) {
      case "commission": navigate(`/commissions/${item.id}`); break;
      case "request": navigate(`/requests?id=${item.id}`); break;
      case "warranty": navigate(`/warranties?id=${item.id}`); break;
    }
  };

  const hasItems = (data?.counts?.total || 0) > 0;

  if (!isReviewer && !hasItems && !isLoading) return null;

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold">{isReviewer ? "Pending Review" : "Needs Your Action"}</span>
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  const displayItems = data?.items?.slice(0, 5) || [];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold">{isReviewer ? "Pending Review" : "Needs Your Action"}</span>
        {hasItems && <Badge variant="destructive" className="text-[10px] ml-auto">{data?.counts?.total}</Badge>}
      </div>

      {!hasItems ? (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          No items awaiting review ✓
        </p>
      ) : (
        <>
          <ScrollArea className="max-h-[200px] pr-1">
            <div className="space-y-1.5">
              {displayItems.map((item) => (
                <PendingItemRow key={`${item.type}-${item.id}`} item={item} isReviewer={isReviewer} onNavigate={handleNavigate} />
              ))}
            </div>
          </ScrollArea>
          {(data?.counts?.total || 0) > 5 && (
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-7 mt-2" onClick={() => navigate("/pending-review")}>
              <span>View All ({data?.counts?.total} items)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
