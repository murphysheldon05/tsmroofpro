import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCommissionReps, useEnrichedEntries } from "@/hooks/useCommissionEntries";
import { RepDetailView } from "@/components/commissions/tracker/RepDetailView";
import { DollarSign } from "lucide-react";

export default function MyCommissionTracker() {
  const { user } = useAuth();
  const { data: reps, isLoading: repsLoading } = useCommissionReps();
  const { data: allEntries, isLoading: entriesLoading } = useEnrichedEntries();

  const isLoading = repsLoading || entriesLoading;

  const linkedRep = useMemo(() => {
    if (!reps || !user?.id) return null;
    return reps.find((r) => r.user_id === user.id) || null;
  }, [reps, user?.id]);

  const myEntries = useMemo(() => {
    if (!linkedRep) return [];
    return allEntries.filter((e) => e.rep_id === linkedRep.id);
  }, [allEntries, linkedRep]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4 pb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!linkedRep) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No commission data found</h3>
          <p className="text-sm text-muted-foreground">
            Contact your manager if you believe this is an error.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-8">
        <RepDetailView
          repName={linkedRep.name}
          repColor={linkedRep.color}
          entries={myEntries}
          readOnly
          hideBackButton
        />
      </div>
    </AppLayout>
  );
}
