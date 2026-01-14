import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWarranties } from "@/hooks/useWarranties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function OverdueWarrantiesWidget() {
  const navigate = useNavigate();
  const { isManager, isAdmin } = useAuth();
  const { data: warranties, isLoading } = useWarranties();

  // Only show to managers and admins
  if (!isManager && !isAdmin) return null;

  // Filter for overdue warranties (no status change in 7+ days, excluding completed/denied)
  const overdueWarranties = warranties?.filter((warranty) => {
    const excludedStatuses = ["completed", "denied"];
    if (excludedStatuses.includes(warranty.status)) return false;

    const lastChange = new Date(warranty.last_status_change_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return lastChange < sevenDaysAgo;
  }) || [];

  if (isLoading) return null;
  if (overdueWarranties.length === 0) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      default: return "secondary";
    }
  };

  return (
    <section>
      <Card className="border-destructive/40 bg-destructive/5 shadow-[0_0_25px_hsl(var(--destructive)/0.1)] hover:shadow-[0_0_35px_hsl(var(--destructive)/0.15)] transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive drop-shadow-[0_0_8px_hsl(var(--destructive)/0.5)]" />
              <CardTitle className="text-lg text-destructive">
                Overdue Warranties ({overdueWarranties.length})
              </CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/warranties")}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            These warranties have had no status update in 7+ days
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {overdueWarranties.slice(0, 5).map((warranty) => (
            <div 
              key={warranty.id}
              onClick={() => navigate("/warranties")}
              className="flex items-center justify-between p-3 rounded-lg bg-background/80 border border-destructive/20 hover:border-destructive/40 hover:shadow-[0_0_15px_hsl(var(--destructive)/0.1)] cursor-pointer transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {warranty.customer_name}
                  </span>
                  <Badge variant={getPriorityColor(warranty.priority_level)} className="text-xs">
                    {warranty.priority_level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {warranty.job_address}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(new Date(warranty.last_status_change_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
          {overdueWarranties.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{overdueWarranties.length - 5} more overdue warranties
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}