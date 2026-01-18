import { usePendingReview, PendingItem, SlaStatus } from "@/hooks/usePendingReview";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// SLA Badge styling
const slaStyles: Record<SlaStatus, { label: string; className: string; icon: React.ElementType }> = {
  overdue: {
    label: "Overdue",
    className: "bg-destructive text-destructive-foreground",
    icon: AlertCircle,
  },
  due_today: {
    label: "Due Today",
    className: "bg-amber-500 text-white",
    icon: Clock,
  },
  due_tomorrow: {
    label: "Due Tomorrow",
    className: "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200",
    icon: Clock,
  },
  on_track: {
    label: "On Track",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    icon: CheckCircle,
  },
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
          <Button
            size="icon"
            variant={variant}
            className="h-7 w-7"
            onClick={onClick}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SlaBadge({ status }: { status: SlaStatus }) {
  const style = slaStyles[status];
  const Icon = style.icon;
  
  return (
    <Badge className={`text-[10px] px-1.5 py-0 gap-0.5 ${style.className}`}>
      <Icon className="w-2.5 h-2.5" />
      {style.label}
    </Badge>
  );
}

interface PendingItemRowProps {
  item: PendingItem;
  isReviewer: boolean;
  onNavigate: (item: PendingItem) => void;
}

function PendingItemRow({ item, isReviewer, onNavigate }: PendingItemRowProps) {
  const navigate = useNavigate();
  const Icon = typeIcons[item.type];

  const handleReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(item);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === "commission") {
      navigate(`/commissions/${item.id}?edit=true`);
    } else {
      onNavigate(item);
    }
  };

  return (
    <div
      onClick={() => onNavigate(item)}
      className="w-full text-left p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${typeColors[item.type]}`} />
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {typeLabels[item.type]}
            </Badge>
            <p className="text-sm font-medium truncate flex-1">{item.title}</p>
          </div>
          
          {/* Subtitle */}
          <p className="text-xs text-muted-foreground truncate mb-2">{item.subtitle}</p>
          
          {/* Status + SLA Row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {actionLabels[item.requires_action]}
            </Badge>
            <SlaBadge status={item.sla_status} />
            <span className="text-[10px] text-muted-foreground">
              {item.age_days} day{item.age_days !== 1 ? "s" : ""} old
            </span>
          </div>
          
          {/* Show rejection reason for revision items */}
          {item.rejection_reason && (
            <div className="p-2 rounded bg-destructive/5 border border-destructive/10 mb-2">
              <p className="text-xs text-destructive font-medium mb-0.5">Reason:</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{item.rejection_reason}</p>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isReviewer ? (
              // Manager/Admin Actions
              <>
                <ActionButton
                  icon={Eye}
                  label="Review"
                  onClick={handleReview}
                />
                {item.type === "commission" && (
                  <>
                    <ActionButton
                      icon={CheckCircle}
                      label="Approve"
                      onClick={handleReview}
                    />
                    <ActionButton
                      icon={XCircle}
                      label="Request Revision"
                      onClick={handleReview}
                      variant="destructive"
                    />
                  </>
                )}
              </>
            ) : (
              // User Actions for items needing their action
              <>
                {item.requires_action === "revision" && (
                  <ActionButton
                    icon={Edit}
                    label="Edit & Resubmit"
                    onClick={handleEdit}
                  />
                )}
                {item.requires_action === "info_needed" && (
                  <ActionButton
                    icon={MessageSquare}
                    label="Provide Info"
                    onClick={handleReview}
                  />
                )}
                <ActionButton
                  icon={Eye}
                  label="View Details"
                  onClick={handleReview}
                />
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
      case "commission":
        navigate(`/commissions/${item.id}`);
        break;
      case "request":
        navigate(`/requests?id=${item.id}`);
        break;
      case "warranty":
        navigate(`/warranties?id=${item.id}`);
        break;
    }
  };

  const hasItems = (data?.counts?.total || 0) > 0;

  // For standard users (non-reviewers), hide the widget entirely if no action items exist
  if (!isReviewer && !hasItems && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {isReviewer ? "Pending Review" : "Needs Your Action"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  const displayItems = data?.items?.slice(0, 5) || [];
  
  // Count overdue items for alert
  const overdueCount = data?.items?.filter(i => i.sla_status === "overdue").length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-wrap">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="min-w-0">{isReviewer ? "Pending Review" : "Needs Your Action"}</span>
          {hasItems && (
            <Badge variant="destructive" className="ml-auto sm:ml-2">
              {data?.counts?.total}
            </Badge>
          )}
          {overdueCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground">
              {overdueCount} Overdue
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-muted-foreground text-sm">
              {isReviewer ? "No items awaiting review" : "All caught up!"}
            </p>
          </div>
        ) : (
          <>
            {/* Category Count Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {data?.counts?.commissions ? (
                <Badge variant="outline" className="gap-1">
                  <DollarSign className="w-3 h-3" />
                  {data.counts.commissions} Commission{data.counts.commissions !== 1 ? "s" : ""}
                </Badge>
              ) : null}
              {data?.counts?.requests ? (
                <Badge variant="outline" className="gap-1">
                  <FileText className="w-3 h-3" />
                  {data.counts.requests} Request{data.counts.requests !== 1 ? "s" : ""}
                </Badge>
              ) : null}
              {data?.counts?.warranties ? (
                <Badge variant="outline" className="gap-1">
                  <Shield className="w-3 h-3" />
                  {data.counts.warranties} Warrant{data.counts.warranties !== 1 ? "ies" : "y"}
                </Badge>
              ) : null}
            </div>

            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-2">
                {displayItems.map((item) => (
                  <PendingItemRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    isReviewer={isReviewer}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* View All Link */}
            <div className="mt-4 pt-3 border-t border-border/50">
              <Button
                variant="ghost"
                className="w-full justify-between text-sm"
                onClick={() => navigate("/pending-review")}
              >
                <span>View All {(data?.counts?.total || 0) > 5 ? `(${data?.counts?.total} items)` : ""}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
