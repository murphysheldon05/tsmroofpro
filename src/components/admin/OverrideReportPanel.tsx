import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllOverrideTrackings, useUpdateOverrideCount } from "@/hooks/useOverrideTracking";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Edit, Save, TrendingUp, CheckCircle, DollarSign, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, startOfYear, parseISO } from "date-fns";
import { formatDisplayName } from "@/lib/displayName";
import { formatCurrency } from "@/lib/utils";

export function OverrideReportPanel() {
  const { data: trackings = [] } = useAllOverrideTrackings();
  const updateCount = useUpdateOverrideCount();
  const [editingRepId, setEditingRepId] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);
  const [filterManager, setFilterManager] = useState<string>("all");
  const [filterRep, setFilterRep] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch all commissions with override data
  const { data: overrideCommissions = [] } = useQuery({
    queryKey: ["override-commissions-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_submissions")
        .select("id, job_name, job_address, acculynx_job_id, contract_date, net_commission_owed, override_amount, override_manager_id, override_commission_number, sales_rep_id, sales_rep_name, status, paid_at, created_at")
        .not("override_amount", "is", null)
        .gt("override_amount", 0)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Get all unique IDs for profiles
  const allIds = useMemo(() => {
    const ids = new Set<string>();
    trackings.forEach(t => ids.add(t.sales_rep_id));
    overrideCommissions.forEach(c => {
      if (c.sales_rep_id) ids.add(c.sales_rep_id);
      if (c.override_manager_id) ids.add(c.override_manager_id);
    });
    return Array.from(ids);
  }, [trackings, overrideCommissions]);

  const { data: profiles } = useQuery({
    queryKey: ["override-profiles", allIds.join(",")],
    queryFn: async () => {
      if (allIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", allIds);
      return data || [];
    },
    enabled: allIds.length > 0,
  });

  const getName = (id: string | null) => {
    if (!id) return "Unknown";
    const p = profiles?.find(pr => pr.id === id);
    return formatDisplayName(p?.full_name, p?.email) || "Unknown";
  };
  const getEmail = (id: string | null) => {
    if (!id) return "";
    return profiles?.find(p => p.id === id)?.email || "";
  };

  // Overview stats
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const yearStart = startOfYear(now).toISOString();

  const stats = useMemo(() => {
    const monthOverrides = overrideCommissions.filter(c => c.created_at >= monthStart);
    const yearOverrides = overrideCommissions.filter(c => c.created_at >= yearStart);
    const repsInPhase = trackings.filter(t => !t.override_phase_complete && t.approved_commission_count < 10);
    const repsComplete = trackings.filter(t => t.override_phase_complete || t.approved_commission_count >= 10);

    return {
      monthTotal: monthOverrides.reduce((sum, c) => sum + (c.override_amount || 0), 0),
      ytdTotal: yearOverrides.reduce((sum, c) => sum + (c.override_amount || 0), 0),
      repsInPhase: repsInPhase.length,
      repsComplete: repsComplete.length,
    };
  }, [overrideCommissions, trackings, monthStart, yearStart]);

  // Filtered commissions
  const filteredCommissions = useMemo(() => {
    let filtered = overrideCommissions;
    if (filterManager !== "all") filtered = filtered.filter(c => c.override_manager_id === filterManager);
    if (filterRep !== "all") filtered = filtered.filter(c => c.sales_rep_id === filterRep);
    if (filterStatus !== "all") {
      if (filterStatus === "paid") filtered = filtered.filter(c => c.status === "paid");
      else filtered = filtered.filter(c => c.status !== "paid");
    }
    return filtered;
  }, [overrideCommissions, filterManager, filterRep, filterStatus]);

  const filteredTotal = filteredCommissions.reduce((sum, c) => sum + (c.override_amount || 0), 0);

  // Unique managers and reps for filters
  const uniqueManagers = useMemo(() => {
    const ids = [...new Set(overrideCommissions.map(c => c.override_manager_id).filter(Boolean))];
    return ids.map(id => ({ id: id!, name: getName(id!) }));
  }, [overrideCommissions, profiles]);

  const uniqueReps = useMemo(() => {
    const ids = [...new Set(overrideCommissions.map(c => c.sales_rep_id).filter(Boolean))];
    return ids.map(id => ({ id: id!, name: getName(id!) }));
  }, [overrideCommissions, profiles]);

  const handleSaveCount = async (repId: string) => {
    await updateCount.mutateAsync({ repId, count: editCount });
    setEditingRepId(null);
    toast.success("Commission count updated");
  };

  const exportCsv = () => {
    const rows = [["Sales Manager", "Manager Email", "Sales Rep", "Commission #", "Job Number", "Job Date", "Net Profit", "Override Amount (10%)", "Status", "Date Paid"]];
    filteredCommissions.forEach(c => {
      rows.push([
        getName(c.override_manager_id),
        getEmail(c.override_manager_id),
        formatDisplayName(c.sales_rep_name) || getName(c.sales_rep_id),
        String(c.override_commission_number || ""),
        c.acculynx_job_id || "",
        c.contract_date ? format(parseISO(c.contract_date), "MM/dd/yyyy") : "",
        String(c.net_commission_owed || 0),
        String(c.override_amount || 0),
        c.status === "paid" ? "Paid" : "Pending",
        c.paid_at ? format(parseISO(c.paid_at), "MM/dd/yyyy") : "",
      ]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "override_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase">This Month</span>
            </div>
            <p className="text-xl font-bold text-primary">{formatCurrency(stats.monthTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase">YTD</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats.ytdTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase">In Phase</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{stats.repsInPhase} reps</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Complete</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{stats.repsComplete} reps</p>
          </CardContent>
        </Card>
      </div>

      {/* Rep Override Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Sales Rep Override Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trackings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No override tracking data yet</p>
          ) : (
            <div className="space-y-2">
              {trackings.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    {t.override_phase_complete ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{getName(t.sales_rep_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.override_phase_complete ? "Override phase complete" : `${t.approved_commission_count} of 10 approved`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingRepId === t.sales_rep_id ? (
                      <>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={editCount}
                          onChange={e => setEditCount(Number(e.target.value))}
                          className="w-20 h-8"
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleSaveCount(t.sales_rep_id)}>
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline">{t.approved_commission_count}/10</Badge>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingRepId(t.sales_rep_id); setEditCount(t.approved_commission_count); }}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Override Detail Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Override Detail</CardTitle>
          {filteredCommissions.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterManager} onValueChange={setFilterManager}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Managers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {uniqueManagers.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRep} onValueChange={setFilterRep}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Reps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                {uniqueReps.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredCommissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No override commissions found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Manager</TableHead>
                    <TableHead>Sales Rep</TableHead>
                    <TableHead>Comm #</TableHead>
                    <TableHead>Job #</TableHead>
                    <TableHead>Job Date</TableHead>
                    <TableHead className="text-right">Net Comm</TableHead>
                    <TableHead className="text-right">Override (10%)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{getName(c.override_manager_id)}</TableCell>
                      <TableCell className="text-sm">{formatDisplayName(c.sales_rep_name) || getName(c.sales_rep_id)}</TableCell>
                      <TableCell>
                        {c.override_commission_number ? `#${c.override_commission_number}` : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.acculynx_job_id || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {c.contract_date ? format(parseISO(c.contract_date), "MM/dd/yy") : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(c.net_commission_owed || 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(c.override_amount || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "paid" ? "default" : "secondary"} className="text-xs">
                          {c.status === "paid" ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.paid_at ? format(parseISO(c.paid_at), "MM/dd/yy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end pt-2 border-t">
                <p className="text-sm font-semibold">
                  Total Override: <span className="text-primary">{formatCurrency(filteredTotal)}</span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
