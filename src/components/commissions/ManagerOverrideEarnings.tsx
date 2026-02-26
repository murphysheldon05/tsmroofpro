import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign } from "lucide-react";
import { startOfMonth, startOfYear, format, parseISO } from "date-fns";
import { formatDisplayName } from "@/lib/displayName";
import { formatCurrency } from "@/lib/utils";

export function ManagerOverrideEarningsCard() {
  const { user } = useAuth();

  const { data: overrideCommissions = [] } = useQuery({
    queryKey: ["manager-override-commissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("commission_submissions")
        .select("id, override_amount, override_commission_number, sales_rep_name, sales_rep_id, status, created_at")
        .eq("override_manager_id", user.id)
        .not("override_amount", "is", null)
        .gt("override_amount", 0)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Count reps in override phase assigned to this manager
  const { data: teamTrackings = [] } = useQuery({
    queryKey: ["manager-team-trackings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Get team members
      const { data: team } = await supabase
        .from("team_assignments")
        .select("employee_id")
        .eq("manager_id", user.id);
      if (!team || team.length === 0) return [];
      const ids = team.map(t => t.employee_id);
      const { data } = await supabase
        .from("sales_rep_override_tracking")
        .select("*")
        .in("sales_rep_id", ids);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const yearStart = startOfYear(now).toISOString();

  const monthTotal = useMemo(() =>
    overrideCommissions
      .filter(c => c.created_at >= monthStart)
      .reduce((sum, c) => sum + (c.override_amount || 0), 0),
    [overrideCommissions, monthStart]
  );

  const ytdTotal = useMemo(() =>
    overrideCommissions
      .filter(c => c.created_at >= yearStart)
      .reduce((sum, c) => sum + (c.override_amount || 0), 0),
    [overrideCommissions, yearStart]
  );

  const repsInPhase = teamTrackings.filter(t => !t.override_phase_complete && t.approved_commission_count < 10).length;

  if (overrideCommissions.length === 0 && repsInPhase === 0) return null;

  return (
    <Card className="border-purple-200/50 bg-purple-50/20 dark:bg-purple-950/10 dark:border-purple-800/20">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">Override Earnings</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{formatCurrency(monthTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">YTD</p>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{formatCurrency(ytdTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reps in Phase</p>
            <p className="text-lg font-bold text-blue-600">{repsInPhase}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ManagerOverridesTab() {
  const { user } = useAuth();

  const { data: overrideCommissions = [], isLoading } = useQuery({
    queryKey: ["manager-overrides-tab", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("commission_submissions")
        .select("id, override_amount, override_commission_number, sales_rep_name, acculynx_job_id, net_commission_owed, status, paid_at, created_at")
        .eq("override_manager_id", user.id)
        .not("override_amount", "is", null)
        .gt("override_amount", 0)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const totalOverride = overrideCommissions.reduce((sum, c) => sum + (c.override_amount || 0), 0);

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-card/40 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Running total */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/30 dark:bg-purple-950/10 border border-purple-200/40">
        <DollarSign className="w-5 h-5 text-purple-600" />
        <div>
          <p className="text-sm font-medium">Total Override Earnings</p>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{formatCurrency(totalOverride)}</p>
        </div>
      </div>

      {overrideCommissions.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No override earnings yet</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rep Name</TableHead>
              <TableHead>Job #</TableHead>
              <TableHead>Comm #</TableHead>
              <TableHead className="text-right">Net Comm</TableHead>
              <TableHead className="text-right">Override (10%)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overrideCommissions.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-sm">{formatDisplayName(c.sales_rep_name) || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{c.acculynx_job_id || "—"}</TableCell>
                <TableCell>
                  {c.override_commission_number ? `#${c.override_commission_number}` : "—"}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(c.net_commission_owed || 0)}</TableCell>
                <TableCell className="text-right font-bold text-purple-700 dark:text-purple-400">
                  {formatCurrency(c.override_amount || 0)}
                </TableCell>
                <TableCell>
                  <Badge variant={c.status === "paid" ? "default" : "secondary"} className="text-xs">
                    {c.status === "paid" ? "Paid" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {format(parseISO(c.created_at), "MM/dd/yy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
