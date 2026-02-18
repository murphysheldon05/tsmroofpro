import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCommissionReps, useEnrichedEntries } from "@/hooks/useCommissionEntries";
import { RepDetailView } from "@/components/commissions/tracker/RepDetailView";
import { DollarSign, BarChart3, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommissionDocumentsEmbed } from "@/components/commissions/CommissionDocumentsEmbed";

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
      <div className="space-y-5 pb-8">
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1 h-auto">
            <TabsTrigger value="history" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <BarChart3 className="h-4 w-4" />
              Commission History
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-0">
            <RepDetailView
              repName={linkedRep.name}
              repColor={linkedRep.color}
              entries={myEntries}
              readOnly
              hideBackButton
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <CommissionDocumentsEmbed />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
