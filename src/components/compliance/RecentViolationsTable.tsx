import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface Violation {
  id: string;
  created_at: string;
  severity: string;
  sop_key: string;
  job_id: string | null;
  status: string;
}

interface RecentViolationsTableProps {
  violations: Violation[] | undefined;
  isLoading: boolean;
  onViewAll: () => void;
}

const severityColors: Record<string, string> = {
  minor: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  major: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  severe: "bg-red-500/15 text-red-600 border-red-500/30",
};

const statusColors: Record<string, string> = {
  open: "bg-red-500/15 text-red-600 border-red-500/30",
  blocked: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  escalated: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  resolved: "bg-green-500/15 text-green-600 border-green-500/30",
};

export function RecentViolationsTable({ 
  violations, 
  isLoading, 
  onViewAll 
}: RecentViolationsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          Recent Violations
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs sm:text-sm">
          View All <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : violations && violations.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pl-4 sm:pl-0 font-medium text-muted-foreground">Date</th>
                  <th className="pb-2 font-medium text-muted-foreground">Severity</th>
                  <th className="pb-2 font-medium text-muted-foreground hidden sm:table-cell">SOP</th>
                  <th className="pb-2 font-medium text-muted-foreground hidden md:table-cell">Job ID</th>
                  <th className="pb-2 pr-4 sm:pr-0 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((v) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2.5 pl-4 sm:pl-0 text-xs sm:text-sm">
                      {format(new Date(v.created_at), "MMM d")}
                    </td>
                    <td className="py-2.5">
                      <Badge 
                        variant="outline" 
                        className={severityColors[v.severity] || ""}
                      >
                        {v.severity}
                      </Badge>
                    </td>
                    <td className="py-2.5 hidden sm:table-cell font-mono text-xs">
                      {v.sop_key}
                    </td>
                    <td className="py-2.5 hidden md:table-cell text-muted-foreground">
                      {v.job_id || "—"}
                    </td>
                    <td className="py-2.5 pr-4 sm:pr-0">
                      <Badge 
                        variant="outline" 
                        className={statusColors[v.status] || ""}
                      >
                        {v.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No violations recorded</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
