import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Ban, TrendingUp, UserX, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  count: number | undefined;
  isLoading: boolean;
  icon: React.ElementType;
  colorWhenPositive: "red" | "orange" | "yellow" | "green";
  onClick: () => void;
  helperText?: string;
  invertPositive?: boolean; // When true, positive count = good (green)
}

function SummaryCard({ 
  title, count, isLoading, icon: Icon, colorWhenPositive, onClick, helperText, invertPositive
}: SummaryCardProps) {
  const hasIssues = invertPositive ? false : (count ?? 0) > 0;
  const hasGood = invertPositive && (count ?? 0) > 0;
  
  const colorClasses = {
    red: hasIssues 
      ? "border-red-500/50 bg-red-500/5" 
      : "border-green-500/50 bg-green-500/5",
    orange: hasIssues 
      ? "border-orange-500/50 bg-orange-500/5" 
      : "border-muted",
    yellow: hasIssues 
      ? "border-yellow-500/50 bg-yellow-500/5" 
      : "border-muted",
    green: "border-green-500/50 bg-green-500/5",
  };

  const iconClasses = {
    red: hasIssues ? "text-red-500" : "text-green-500",
    orange: hasIssues ? "text-orange-500" : "text-muted-foreground",
    yellow: hasIssues ? "text-yellow-500" : "text-muted-foreground",
    green: "text-green-500",
  };

  const countClasses = {
    red: hasIssues ? "text-red-600" : "text-green-600",
    orange: hasIssues ? "text-orange-600" : "text-foreground",
    yellow: hasIssues ? "text-yellow-600" : "text-foreground",
    green: "text-green-600",
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
        colorClasses[colorWhenPositive]
      )}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className={cn("text-2xl sm:text-3xl font-bold", countClasses[colorWhenPositive])}>
                {count ?? 0}
              </p>
            )}
            {helperText && (
              <p className="text-[10px] text-muted-foreground leading-tight">{helperText}</p>
            )}
          </div>
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center",
            hasIssues ? "bg-background/50" : "bg-muted/50"
          )}>
            <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", iconClasses[colorWhenPositive])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ComplianceSummaryCardsProps {
  openViolations: number | undefined;
  activeHolds: number | undefined;
  pendingEscalations: number | undefined;
  unacknowledgedUsers: number | undefined;
  resolvedThisMonth?: number | undefined;
  isLoading: boolean;
  onNavigate: (tab: string, params?: string) => void;
}

export function ComplianceSummaryCards({
  openViolations, activeHolds, pendingEscalations,
  unacknowledgedUsers, resolvedThisMonth, isLoading, onNavigate,
}: ComplianceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <SummaryCard
        title="Open Violations"
        count={openViolations}
        isLoading={isLoading}
        icon={AlertTriangle}
        colorWhenPositive="red"
        onClick={() => onNavigate("violations", "status=open")}
        helperText="Policy breaches needing resolution"
      />
      <SummaryCard
        title="Active Holds"
        count={activeHolds}
        isLoading={isLoading}
        icon={Ban}
        colorWhenPositive="orange"
        onClick={() => onNavigate("holds", "status=active")}
        helperText="Users blocked from actions until resolved"
      />
      <SummaryCard
        title="Pending Escalations"
        count={pendingEscalations}
        isLoading={isLoading}
        icon={TrendingUp}
        colorWhenPositive="red"
        onClick={() => onNavigate("escalations", "status=pending")}
        helperText="Awaiting decision from leadership"
      />
      <SummaryCard
        title="Unacknowledged"
        count={unacknowledgedUsers}
        isLoading={isLoading}
        icon={UserX}
        colorWhenPositive="yellow"
        onClick={() => onNavigate("acknowledgments")}
        helperText="Users who haven't signed SOPs"
      />
      <SummaryCard
        title="Resolved (Month)"
        count={resolvedThisMonth}
        isLoading={isLoading}
        icon={CheckCircle}
        colorWhenPositive="green"
        invertPositive
        onClick={() => onNavigate("violations", "status=resolved")}
        helperText="Violations & holds closed this month"
      />
    </div>
  );
}
