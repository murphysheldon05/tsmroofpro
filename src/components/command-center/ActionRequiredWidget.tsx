import { usePendingReview, PendingItem } from "@/hooks/usePendingReview";
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
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
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

const priorityColors = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

const actionLabels = {
  review: "Needs Review",
  revision: "Needs Revision",
  info_needed: "Info Requested",
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
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${priorityColors[item.priority]}`}
            >
              {item.priority}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
          
          {/* Show rejection reason for revision items */}
          {item.rejection_reason && (
            <div className="mt-2 p-2 rounded bg-destructive/5 border border-destructive/10">
              <p className="text-xs text-destructive font-medium mb-0.5">Reason:</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{item.rejection_reason}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {actionLabels[item.requires_action]}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
              </span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

  if (isLoading) {
    return (
      <Card variant="neon">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Pending Review / Needs Action
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasItems = (data?.counts?.total || 0) > 0;
  const displayItems = data?.items?.slice(0, 5) || [];

  return (
    <Card variant="neon">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          {isReviewer ? "Pending Review" : "Needs Your Action"}
          {hasItems && (
            <Badge variant="destructive" className="ml-2">
              {data?.counts?.total}
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

            <ScrollArea className="h-[280px] pr-2">
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
            {(data?.counts?.total || 0) > 5 && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  className="w-full justify-between text-sm"
                  onClick={() => {
                    if (isReviewer) {
                      navigate("/requests?tab=review");
                    } else {
                      navigate("/requests?tab=my-requests");
                    }
                  }}
                >
                  <span>View All ({data?.counts?.total} items)</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
