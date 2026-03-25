import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kpiScorecardPublicUrl, canSeeScorecard, type KpiScorecardRow } from "@/lib/kpiScorecardVisibility";
import { EditScorecardModal } from "@/components/kpi-scorecards/EditScorecardModal";

export default function KpiScorecardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAdmin, role } = useAuth();
  const userId = user?.id ?? "";
  const isManagerOrSalesManager = role === "manager" || role === "sales_manager";

  const [editOpen, setEditOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: row, isLoading, error, refetch } = useQuery({
    queryKey: ["kpi-scorecard", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error: qErr } = await supabase.from("kpi_scorecards").select("*").eq("id", id).maybeSingle();
      if (qErr) throw qErr;
      return data as KpiScorecardRow | null;
    },
    enabled: !!id,
  });

  const visible =
    row &&
    canSeeScorecard(row, {
      userId,
      isAdmin: !!isAdmin,
      isManagerOrSalesManager,
    });

  const publicUrl = row ? kpiScorecardPublicUrl(row.storage_path) : "";

  useEffect(() => {
    setIframeLoaded(false);
    setTimedOut(false);
    if (!publicUrl) return;
    const t = window.setTimeout(() => {
      setTimedOut(true);
    }, 25000);
    return () => clearTimeout(t);
  }, [publicUrl]);

  const showError = timedOut && !iframeLoaded;

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !row || !visible) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <p className="text-muted-foreground">Scorecard not found or you don&apos;t have access.</p>
        <Button variant="outline" onClick={() => navigate("/kpi-scorecards")}>
          Back to KPI Scorecards
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto px-4 sm:px-0 min-h-0">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div className="flex flex-col gap-2 min-w-0">
          <Link
            to="/kpi-scorecards"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to KPI Scorecards
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{row.name}</h1>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </header>

      <div className="relative flex-1 min-h-[calc(100vh-12rem)] rounded-lg bg-white overflow-hidden border border-border/40 shadow-sm">
        {!iframeLoaded && !showError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}
        {showError ? (
          <div className="flex items-center justify-center min-h-[320px] px-4 text-center text-muted-foreground">
            Unable to load scorecard. The file may have been moved or deleted.
          </div>
        ) : (
          <iframe
            title={row.name}
            src={publicUrl}
            className="w-full h-[calc(100vh-12rem)] min-h-[400px] border-0 rounded-lg bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => {
              if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = null;
              }
              setIframeLoaded(true);
              setTimedOut(false);
            }}
            onError={() => setTimedOut(true)}
          />
        )}
      </div>

      {isAdmin && (
        <EditScorecardModal
          open={editOpen}
          onOpenChange={(o) => setEditOpen(o)}
          scorecard={row}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["kpi-scorecard", id] });
            queryClient.invalidateQueries({ queryKey: ["kpi-scorecards"] });
            refetch();
          }}
        />
      )}
    </div>
  );
}
