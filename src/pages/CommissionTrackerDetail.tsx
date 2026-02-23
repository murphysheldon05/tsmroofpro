import { useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrichedEntries, slugifyRep } from "@/hooks/useCommissionEntries";
import { RepDetailView } from "@/components/commissions/tracker/RepDetailView";

export default function CommissionTrackerDetail() {
  const { repSlug } = useParams();
  const location = useLocation();
  const { isAdmin, role } = useAuth();
  const isManagerView = (role === "manager" || role === "sales_manager") && !isAdmin;
  const { data: allEntries, isLoading } = useEnrichedEntries();
  const isShared = location.hash === "#share";
  const readOnly = isShared || isManagerView;

  const { repName, repColor, repEntries } = useMemo(() => {
    const match = allEntries.find((e) => slugifyRep(e.rep_name) === repSlug);
    if (!match) return { repName: "", repColor: "#6b7280", repEntries: [] };
    return {
      repName: match.rep_name,
      repColor: match.rep_color,
      repEntries: allEntries.filter((e) => e.rep_name === match.rep_name),
    };
  }, [allEntries, repSlug]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4 pb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!repName) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold">Rep not found</h3>
          <p className="text-sm text-muted-foreground">No data found for this sales rep.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-8">
        <RepDetailView repName={repName} repColor={repColor} entries={repEntries} readOnly={readOnly} />
      </div>
    </AppLayout>
  );
}
