import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, ClipboardList } from "lucide-react";
import { useEnrichedEntries, useCommissionPayRuns, slugifyRep } from "@/hooks/useCommissionEntries";
import { TrackerSummaryCards } from "@/components/commissions/tracker/TrackerSummaryCards";
import { RepCard } from "@/components/commissions/tracker/RepCard";
import { AllTransactionsTable } from "@/components/commissions/tracker/AllTransactionsTable";
import { PayRunsTab } from "@/components/commissions/tracker/PayRunsTab";
import { TrackerSettingsDrawer } from "@/components/commissions/tracker/TrackerSettingsDrawer";

export default function CommissionTracker() {
  const navigate = useNavigate();
  const { data: allEntries, isLoading, reps, payTypes } = useEnrichedEntries();
  const { data: payRuns } = useCommissionPayRuns();

  const repGroups = useMemo(() => {
    const map = new Map<string, { name: string; color: string; items: typeof allEntries }>();
    allEntries.forEach((e) => {
      if (!map.has(e.rep_id)) map.set(e.rep_id, { name: e.rep_name, color: e.rep_color, items: [] });
      map.get(e.rep_id)!.items.push(e);
    });
    return Array.from(map.values())
      .sort((a, b) => b.items.reduce((s, e) => s + e.amount_paid, 0) - a.items.reduce((s, e) => s + e.amount_paid, 0));
  }, [allEntries]);

  const totalPaid = allEntries.reduce((s, e) => s + e.amount_paid, 0);

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

  return (
    <AppLayout>
      <div className="space-y-5 pb-8">
        {/* Dark Header */}
        <div className="bg-[#111827] text-white rounded-2xl p-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Commission Tracker</h1>
            <p className="text-sm text-gray-400 mt-0.5">{new Date().getFullYear()} · TSM Roof Pro Hub</p>
          </div>
          <TrackerSettingsDrawer />
        </div>

        <TrackerSummaryCards entries={allEntries} repCount={reps.length} />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1 h-auto">
            <TabsTrigger value="overview" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <LayoutGrid className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <List className="h-4 w-4" /> All Transactions
            </TabsTrigger>
            <TabsTrigger value="pay-runs" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <ClipboardList className="h-4 w-4" /> Pay Runs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {repGroups.map(({ name, color, items }) => (
                <RepCard
                  key={name}
                  repName={name}
                  repColor={color}
                  entries={items}
                  totalPaidAllReps={totalPaid}
                  onClick={() => navigate(`/commission-tracker/${slugifyRep(name)}`)}
                />
              ))}
              {repGroups.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <h3 className="text-lg font-semibold mb-1">No commission data yet</h3>
                  <p className="text-sm text-muted-foreground">Add reps via the ⚙️ settings, then add entries to see summaries here.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <AllTransactionsTable entries={allEntries} reps={reps} payTypes={payTypes} payRuns={payRuns} />
          </TabsContent>

          <TabsContent value="pay-runs" className="mt-0">
            <PayRunsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
