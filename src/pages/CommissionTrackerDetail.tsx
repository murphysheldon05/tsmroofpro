import { useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrichedEntries, useCommissionReps, slugifyRep } from "@/hooks/useCommissionEntries";
import { RepDetailView } from "@/components/commissions/tracker/RepDetailView";

export default function CommissionTrackerDetail() {
  const { repSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, role } = useAuth();
  const isManagerView = (role === "manager" || role === "sales_manager") && !isAdmin;
  const { data: allEntries, isLoading: entriesLoading } = useEnrichedEntries();
  const { data: reps, isLoading: repsLoading } = useCommissionReps();
  const isShared = location.hash === "#share";
  const readOnly = isShared || isManagerView;
  const isLoading = entriesLoading || repsLoading;

  const { repId, repName, repColor, repEntries } = useMemo(() => {
    // Try matching from enriched entries first
    const match = allEntries.find((e) => slugifyRep(e.rep_name) === repSlug);
    if (match) {
      return {
        repId: match.rep_id,
        repName: match.rep_name,
        repColor: match.rep_color,
        repEntries: allEntries.filter((e) => e.rep_name === match.rep_name),
      };
    }
    // Fallback: match from commission_reps even if no entries exist yet
    const repMatch = (reps || []).find((r) => slugifyRep(r.name) === repSlug);
    if (repMatch) {
      return {
        repId: repMatch.id,
        repName: repMatch.name,
        repColor: repMatch.color,
        repEntries: allEntries.filter((e) => e.rep_name === repMatch.name),
      };
    }
    return { repId: undefined, repName: "", repColor: "#6b7280", repEntries: [] };
  }, [allEntries, reps, repSlug]);

  if (isLoading) {
    return (
        <div className="space-y-4 pb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        </div>
    );
  }

  if (!repName) {
    return (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold">Rep not found</h3>
          <p className="text-sm text-muted-foreground">No data found for this sales rep.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate("/commission-tracker")}>
            <ArrowLeft className="h-4 w-4" /> Back to Tracker
          </Button>
        </div>
    );
  }

  return (
      <div className="pb-8">
        <RepDetailView repId={repId} repName={repName} repColor={repColor} entries={repEntries} readOnly={readOnly} />
      </div>
  );
}
