import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";
import { useCommissionEntries, slugifyRep } from "@/hooks/useCommissionEntries";
import { TrackerSummaryCards } from "@/components/commissions/tracker/TrackerSummaryCards";
import { RepCard } from "@/components/commissions/tracker/RepCard";
import { AllTransactionsTable } from "@/components/commissions/tracker/AllTransactionsTable";

export default function CommissionTracker() {
  const navigate = useNavigate();
  const { data: entries, isLoading } = useCommissionEntries();

  const allEntries = entries || [];

  // Group by rep
  const repGroups = useMemo(() => {
    const map = new Map<string, typeof allEntries>();
    allEntries.forEach(e => {
      if (!map.has(e.rep_name)) map.set(e.rep_name, []);
      map.get(e.rep_name)!.push(e);
    });
    return Array.from(map.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.reduce((s, e) => s + e.amount_paid, 0) - a.items.reduce((s, e) => s + e.amount_paid, 0));
  }, [allEntries]);

  const reps = repGroups.map(g => g.name);
  const totalPaid = allEntries.reduce((s, e) => s + e.amount_paid, 0);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4 pb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 pb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Commission Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track rep payments, draws, and advances</p>
        </div>

        <TrackerSummaryCards entries={allEntries} />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1 h-auto">
            <TabsTrigger value="overview" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <LayoutGrid className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <List className="h-4 w-4" /> All Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ minWidth: 0 }}>
              {repGroups.map(({ name, items }) => (
                <RepCard
                  key={name}
                  repName={name}
                  entries={items}
                  totalPaidAllReps={totalPaid}
                  onClick={() => navigate(`/commission-tracker/${slugifyRep(name)}`)}
                />
              ))}
              {repGroups.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <h3 className="text-lg font-semibold mb-1">No commission data yet</h3>
                  <p className="text-sm text-muted-foreground">Add entries to see rep summaries here.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <AllTransactionsTable entries={allEntries} reps={reps} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
