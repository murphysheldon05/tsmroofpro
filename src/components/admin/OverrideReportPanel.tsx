import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useManagerOverrides, useAllOverrideTrackings, useUpdateOverrideCount } from "@/hooks/useOverrideTracking";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Edit, Save, TrendingUp, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function OverrideReportPanel() {
  const { data: overrides = [] } = useManagerOverrides();
  const { data: trackings = [] } = useAllOverrideTrackings();
  const updateCount = useUpdateOverrideCount();
  const [editingRepId, setEditingRepId] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);

  // Fetch profiles for display
  const repIds = [...new Set([...trackings.map(t => t.sales_rep_id), ...overrides.map(o => o.sales_rep_id)])];
  const managerIds = [...new Set(overrides.map(o => o.sales_manager_id))];
  const allIds = [...new Set([...repIds, ...managerIds])];

  const { data: profiles } = useQuery({
    queryKey: ["override-profiles", allIds.join(",")],
    queryFn: async () => {
      if (allIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", allIds);
      return data || [];
    },
    enabled: allIds.length > 0,
  });

  const getName = (id: string) => profiles?.find(p => p.id === id)?.full_name || "Unknown";

  const handleSaveCount = async (repId: string) => {
    await updateCount.mutateAsync({ repId, count: editCount });
    setEditingRepId(null);
    toast.success("Commission count updated");
  };

  const exportCsv = () => {
    const rows = [["Sales Manager", "Sales Rep", "Commission #", "Override Amount", "Date"]];
    overrides.forEach(o => {
      rows.push([getName(o.sales_manager_id), getName(o.sales_rep_id), String(o.commission_number), `$${o.override_amount.toFixed(2)}`, new Date(o.created_at).toLocaleDateString()]);
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
      {/* Rep Override Counts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Sales Rep Override Progress</CardTitle>
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

      {/* Override Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Override History</CardTitle>
          {overrides.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No overrides recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Manager</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Commission #</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map(o => (
                  <TableRow key={o.id}>
                    <TableCell>{getName(o.sales_manager_id)}</TableCell>
                    <TableCell>{getName(o.sales_rep_id)}</TableCell>
                    <TableCell>#{o.commission_number}</TableCell>
                    <TableCell className="font-medium">${o.override_amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
