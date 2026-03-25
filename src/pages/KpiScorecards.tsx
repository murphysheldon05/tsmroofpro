import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScorecardCard } from "@/components/kpi-scorecards/ScorecardCard";
import { AddScorecardModal } from "@/components/kpi-scorecards/AddScorecardModal";
import { EditScorecardModal } from "@/components/kpi-scorecards/EditScorecardModal";
import { canSeeScorecard, type KpiScorecardRow } from "@/lib/kpiScorecardVisibility";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function KpiScorecards() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin, role } = useAuth();
  const userId = user?.id ?? "";

  const isManagerOrSalesManager = role === "manager" || role === "sales_manager";

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<KpiScorecardRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<KpiScorecardRow | null>(null);

  const { data: rawRows = [], isLoading } = useQuery({
    queryKey: ["kpi-scorecards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_scorecards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KpiScorecardRow[];
    },
  });

  const rows = useMemo(() => {
    return rawRows.filter((r) =>
      canSeeScorecard(r, {
        userId,
        isAdmin: !!isAdmin,
        isManagerOrSalesManager,
      })
    );
  }, [rawRows, userId, isAdmin, isManagerOrSalesManager]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["kpi-scorecards"] });

  const confirmRemove = async () => {
    if (!removeTarget) return;
    const { error } = await supabase
      .from("kpi_scorecards")
      .update({ status: "removed" })
      .eq("id", removeTarget.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from("kpi-scorecards").remove([removeTarget.storage_path]).catch(() => {});
    toast.success("Scorecard removed");
    setRemoveTarget(null);
    invalidate();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-0">
      <header className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">KPI Scorecards</h1>
            {isAdmin && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage and review team KPI scorecards
              </p>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Add Scorecard
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/30 px-6 py-16 text-center text-muted-foreground">
          {isAdmin ? (
            <p>No scorecards created yet. Click &quot;+ Add Scorecard&quot; to get started.</p>
          ) : (
            <p>No scorecards assigned to you yet. Contact your admin.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((row) => (
            <ScorecardCard
              key={row.id}
              row={row}
              isAdmin={!!isAdmin}
              onOpen={() => navigate(`/kpi-scorecards/${row.id}`)}
              onEdit={() => {
                setEditRow(row);
                setEditOpen(true);
              }}
              onRemove={() => setRemoveTarget(row)}
            />
          ))}
        </div>
      )}

      {isAdmin && user && (
        <AddScorecardModal
          open={addOpen}
          onOpenChange={setAddOpen}
          userId={user.id}
          onSaved={invalidate}
        />
      )}

      {isAdmin && (
        <EditScorecardModal
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) setEditRow(null);
          }}
          scorecard={editRow}
          onSaved={invalidate}
        />
      )}

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove scorecard?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeTarget?.name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
