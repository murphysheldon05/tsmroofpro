import { useMemo } from "react";
import { formatDisplayName } from "@/lib/displayName";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWarranties, WARRANTY_STATUSES, PRIORITY_LEVELS, WarrantyRequest } from "@/hooks/useWarranties";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, Clock, Users, Factory, FileWarning } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface DashboardProps {
  onSelectWarranty?: (warranty: WarrantyRequest) => void;
}

export function WarrantyDashboard({ onSelectWarranty }: DashboardProps) {
  const { data: warranties = [], isLoading } = useWarranties();

  // Fetch production members for display
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (error) throw error;
      return data;
    },
  });

  const profilesMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => {
      map[p.id] = formatDisplayName(p.full_name, p.email) || "Unknown";
    });
    return map;
  }, [profiles]);

  // Dashboard metrics
  const metrics = useMemo(() => {
    const now = new Date();
    
    // Active warranties by status
    const byStatus: Record<string, number> = {};
    WARRANTY_STATUSES.forEach((s) => {
      byStatus[s.value] = warranties.filter((w) => w.status === s.value).length;
    });

    // By assigned member
    const byMember: Record<string, number> = {};
    warranties.forEach((w) => {
      if (w.assigned_production_member && w.status !== "completed" && w.status !== "denied" && w.status !== "closed") {
        const name = profilesMap[w.assigned_production_member] || "Unknown";
        byMember[name] = (byMember[name] || 0) + 1;
      }
    });

    // Overdue (no status change in 7+ days and not completed/denied)
    const overdue = warranties.filter((w) => {
      if (w.status === "completed" || w.status === "denied" || w.status === "closed") return false;
      const lastChange = parseISO(w.last_status_change_at);
      return differenceInDays(now, lastChange) >= 7;
    });

    // Completed this month
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const completedThisMonth = warranties.filter((w) => {
      if (w.status !== "completed" || !w.date_completed) return false;
      const completed = parseISO(w.date_completed);
      return completed.getMonth() === thisMonth && completed.getFullYear() === thisYear;
    });

    // Manufacturer-related
    const manufacturerRelated = warranties.filter(
      (w) => w.warranty_type === "manufacturer" || w.warranty_type === "combination"
    );

    // Active (non-completed, non-denied)
    const active = warranties.filter(
      (w) => w.status !== "completed" && w.status !== "denied" && w.status !== "closed"
    );

    // By priority (active only)
    const byPriority: Record<string, number> = {};
    PRIORITY_LEVELS.forEach((p) => {
      byPriority[p.value] = active.filter((w) => w.priority_level === p.value).length;
    });

    return {
      byStatus,
      byMember,
      overdue,
      completedThisMonth,
      manufacturerRelated,
      active,
      byPriority,
      total: warranties.length,
    };
  }, [warranties, profilesMap]);

  if (isLoading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warranties</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active.length}</div>
            <p className="text-xs text-muted-foreground">Open requests</p>
          </CardContent>
        </Card>

        <Card className={metrics.overdue.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${metrics.overdue.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.overdue.length > 0 ? "text-destructive" : ""}`}>
              {metrics.overdue.length}
            </div>
            <p className="text-xs text-muted-foreground">No activity in 7+ days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedThisMonth.length}</div>
            <p className="text-xs text-muted-foreground">Resolved successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manufacturer Claims</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.manufacturerRelated.length}</div>
            <p className="text-xs text-muted-foreground">Manufacturer-related</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {WARRANTY_STATUSES.filter((s) => s.value !== "completed" && s.value !== "denied").map((s) => (
                <div key={s.value} className="flex items-center justify-between">
                  <Badge className={s.color}>{s.label}</Badge>
                  <span className="font-medium">{metrics.byStatus[s.value]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {PRIORITY_LEVELS.map((p) => (
                <div key={p.value} className="flex items-center justify-between">
                  <Badge className={p.color}>{p.label}</Badge>
                  <span className="font-medium">{metrics.byPriority[p.value]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Assigned Member */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4" />
            <CardTitle className="text-base">By Production Member</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(metrics.byMember).length === 0 ? (
              <p className="text-sm text-muted-foreground">No active assignments</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(metrics.byMember)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm">{name}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue List */}
        <Card className={metrics.overdue.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center gap-2">
            <FileWarning className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">Overdue Warranties</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue items</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {metrics.overdue.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-2 rounded-md bg-destructive/10 cursor-pointer hover:bg-destructive/20"
                    onClick={() => onSelectWarranty?.(w)}
                  >
                    <div>
                      <p className="text-sm font-medium">{w.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{w.job_address}</p>
                    </div>
                    <Badge variant="destructive">
                      {differenceInDays(new Date(), parseISO(w.last_status_change_at))} days
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
