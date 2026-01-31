import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Eye } from "lucide-react";
import { format } from "date-fns";

interface Escalation {
  id: string;
  created_at: string;
  reason: string | null;
  escalated_by_user_id: string | null;
  compliance_violations: {
    id: string;
    sop_key: string;
    description: string;
    severity: string;
  } | null;
}

interface AwaitingDecisionTableProps {
  escalations: Escalation[] | undefined;
  isLoading: boolean;
  onReview: (escalationId: string) => void;
}

const severityColors: Record<string, string> = {
  minor: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  major: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  severe: "bg-red-500/15 text-red-600 border-red-500/30",
};

export function AwaitingDecisionTable({ 
  escalations, 
  isLoading, 
  onReview 
}: AwaitingDecisionTableProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          Awaiting Your Decision
          {escalations && escalations.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {escalations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : escalations && escalations.length > 0 ? (
          <div className="space-y-3">
            {escalations.map((e) => (
              <div 
                key={e.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.created_at), "MMM d, yyyy")}
                    </span>
                    {e.compliance_violations && (
                      <Badge 
                        variant="outline" 
                        className={severityColors[e.compliance_violations.severity] || ""}
                      >
                        {e.compliance_violations.severity}
                      </Badge>
                    )}
                    {e.compliance_violations && (
                      <span className="font-mono text-xs text-primary">
                        {e.compliance_violations.sop_key}
                      </span>
                    )}
                  </div>
                  <p className="text-sm truncate">
                    {e.compliance_violations?.description || e.reason || "No description"}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => onReview(e.id)}
                  className="shrink-0"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Review
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No pending escalations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
