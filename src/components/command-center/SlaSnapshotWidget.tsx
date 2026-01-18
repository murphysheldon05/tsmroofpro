import { usePendingReview } from "@/hooks/usePendingReview";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, ClipboardCheck, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Compact SLA Snapshot widget for managers/admins on Command Center.
 * Shows total pending, overdue, and due today counts at a glance.
 */
export function SlaSnapshotWidget() {
  const { data, isLoading } = usePendingReview();
  const { isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  
  // Only show for managers/admins
  if (!isAdmin && !isManager) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Manager SLA Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Skeleton className="h-16 flex-1 rounded-lg" />
            <Skeleton className="h-16 flex-1 rounded-lg" />
            <Skeleton className="h-16 flex-1 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const overdueCount = data?.items?.filter(i => i.sla_status === "overdue").length || 0;
  const dueTodayCount = data?.items?.filter(i => i.sla_status === "due_today").length || 0;
  const totalPending = data?.counts?.total || 0;

  const handleNavigate = (filter?: string) => {
    if (filter) {
      navigate(`/pending-review?sla=${filter}`);
    } else {
      navigate("/pending-review");
    }
  };

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          Manager SLA Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats Grid - Mobile First */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Total Pending */}
          <button
            onClick={() => handleNavigate()}
            className="p-2 sm:p-3 rounded-lg bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-center group"
          >
            <div className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
              {totalPending}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
          </button>

          {/* Overdue */}
          <button
            onClick={() => handleNavigate("overdue")}
            className={`p-2 sm:p-3 rounded-lg border transition-all text-center group ${
              overdueCount > 0
                ? "bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                : "bg-card border-border/50 hover:border-primary/30 hover:bg-primary/5"
            }`}
          >
            <div className={`text-xl sm:text-2xl font-bold flex items-center justify-center gap-1 ${
              overdueCount > 0 ? "text-destructive" : "text-foreground group-hover:text-primary"
            }`}>
              {overdueCount > 0 && <AlertCircle className="w-4 h-4" />}
              {overdueCount}
            </div>
            <p className={`text-[10px] sm:text-xs ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              Overdue
            </p>
          </button>

          {/* Due Today */}
          <button
            onClick={() => handleNavigate("due_today")}
            className={`p-2 sm:p-3 rounded-lg border transition-all text-center group ${
              dueTodayCount > 0
                ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-card border-border/50 hover:border-primary/30 hover:bg-primary/5"
            }`}
          >
            <div className={`text-xl sm:text-2xl font-bold flex items-center justify-center gap-1 ${
              dueTodayCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground group-hover:text-primary"
            }`}>
              {dueTodayCount > 0 && <Clock className="w-4 h-4" />}
              {dueTodayCount}
            </div>
            <p className={`text-[10px] sm:text-xs ${dueTodayCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
              Due Today
            </p>
          </button>
        </div>

        {/* Category Breakdown - Compact */}
        {totalPending > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data?.counts?.commissions ? (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {data.counts.commissions} Commission{data.counts.commissions !== 1 ? "s" : ""}
              </Badge>
            ) : null}
            {data?.counts?.requests ? (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {data.counts.requests} Request{data.counts.requests !== 1 ? "s" : ""}
              </Badge>
            ) : null}
            {data?.counts?.warranties ? (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {data.counts.warranties} Warrant{data.counts.warranties !== 1 ? "ies" : "y"}
              </Badge>
            ) : null}
          </div>
        )}

        {/* View All Link */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs h-8"
          onClick={() => handleNavigate()}
        >
          <span>View Full Review Queue</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
