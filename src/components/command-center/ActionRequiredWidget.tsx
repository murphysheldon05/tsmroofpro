import { useActionRequired } from "@/hooks/useCommandCenter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText, DollarSign, Shield, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

export function ActionRequiredWidget() {
  const { data, isLoading } = useActionRequired();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card variant="neon">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Action Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasItems =
    (data?.pendingWarranties?.length || 0) +
    (data?.pendingCommissions?.length || 0) +
    (data?.pendingRequests?.length || 0) > 0;

  const staleCount = data?.staleWarranties?.length || 0;

  return (
    <Card variant="neon">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Action Required
          {hasItems && (
            <Badge variant="destructive" className="ml-2">
              {(data?.pendingWarranties?.length || 0) +
                (data?.pendingCommissions?.length || 0) +
                (data?.pendingRequests?.length || 0)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-muted-foreground text-sm">All caught up!</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px] pr-2">
            <div className="space-y-2">
              {/* Stale Warranties Alert */}
              {staleCount > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {staleCount} warranty{staleCount !== 1 ? "ies" : "y"} with no update in 3+ days
                    </span>
                  </div>
                </div>
              )}

              {/* Pending Warranties */}
              {data?.pendingWarranties?.slice(0, 3).map((warranty) => (
                <button
                  key={warranty.id}
                  onClick={() => navigate(`/warranties?id=${warranty.id}`)}
                  className="w-full text-left p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{warranty.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Warranty • {formatDistanceToNow(new Date(warranty.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {warranty.priority_level}
                    </Badge>
                  </div>
                </button>
              ))}

              {/* Pending Commissions */}
              {data?.pendingCommissions?.slice(0, 3).map((commission) => (
                <button
                  key={commission.id}
                  onClick={() => navigate(`/commissions/${commission.id}`)}
                  className="w-full text-left p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{commission.job_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Commission • {formatDistanceToNow(new Date(commission.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {commission.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </button>
              ))}

              {/* Pending Requests */}
              {data?.pendingRequests?.slice(0, 3).map((request) => (
                <button
                  key={request.id}
                  onClick={() => navigate(`/requests?id=${request.id}`)}
                  className="w-full text-left p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{request.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.type} • {formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
