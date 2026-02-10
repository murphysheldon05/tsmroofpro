import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, DollarSign, Search, FileSpreadsheet, BarChart3 } from "lucide-react";
import { useCommissionSubmissions, useIsCommissionReviewer } from "@/hooks/useCommissions";
import { CommissionTracker } from "@/components/commissions/CommissionTracker";
import { CommissionStatusPipeline } from "@/components/commissions/CommissionStatusPipeline";
import { CommissionSummaryCards } from "@/components/commissions/CommissionSummaryCards";
import { CommissionCard } from "@/components/commissions/CommissionCard";
import { DrawBalanceCard } from "@/components/commissions/DrawBalanceCard";
import { OverridePhaseIndicator } from "@/components/commissions/OverridePhaseIndicator";
import { useAuth } from "@/contexts/AuthContext";
import { useUserHoldsCheck } from "@/hooks/useComplianceHoldCheck";
import { HoldWarningBanner } from "@/components/compliance/HoldWarningBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_ORDER = ["pending_review", "revision_required", "approved", "denied", "paid"];
const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  revision_required: "Revision Required",
  approved: "Approved",
  denied: "Denied",
  paid: "Paid",
};

export default function Commissions() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: submissions, isLoading } = useCommissionSubmissions();
  const { data: isReviewer } = useIsCommissionReviewer();
  const { data: userHolds } = useUserHoldsCheck();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [showDrawModal, setShowDrawModal] = useState(false);

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  // Any active user can submit commissions per governance rules
  const canSubmit = true;
  const commissionHolds = userHolds?.filter(h => h.hold_type === "commission_hold") || [];

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions?.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [submissions]);

  // Summary stats
  const summaryStats = useMemo(() => ({
    total: submissions?.length || 0,
    pending: submissions?.filter((s) => s.status === "pending_review").length || 0,
    approved: submissions?.filter((s) => s.status === "approved").length || 0,
    paid: submissions?.filter((s) => s.status === "paid").length || 0,
    totalOwed: submissions?.reduce((sum, s) => {
      if (s.status !== "paid" && s.status !== "denied") {
        return sum + (s.net_commission_owed || 0);
      }
      return sum;
    }, 0) || 0,
  }), [submissions]);

  // Filtered & grouped submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions || [];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        s.job_name.toLowerCase().includes(q) ||
        s.job_address.toLowerCase().includes(q) ||
        s.sales_rep_name?.toLowerCase().includes(q) ||
        s.subcontractor_name?.toLowerCase().includes(q)
      );
    }

    if (activeStatus !== "all") {
      filtered = filtered.filter((s) => s.status === activeStatus);
    }

    return filtered;
  }, [submissions, searchQuery, activeStatus]);

  // Group by status
  const groupedSubmissions = useMemo(() => {
    const groups: Record<string, typeof filteredSubmissions> = {};
    
    if (activeStatus !== "all") {
      // Single status - just show as flat list
      return { [activeStatus]: filteredSubmissions };
    }
    
    STATUS_ORDER.forEach((status) => {
      const items = filteredSubmissions.filter((s) => s.status === status);
      if (items.length > 0) {
        groups[status] = items;
      }
    });
    return groups;
  }, [filteredSubmissions, activeStatus]);

  return (
    <AppLayout>
      <div className="space-y-5 pb-8">
        {/* Hold Warning */}
        <HoldWarningBanner holds={commissionHolds} context="commission" />

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Commissions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track and manage your earnings
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => navigate("/commissions/new")} 
              className="gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={commissionHolds.length > 0}
              title={commissionHolds.length > 0 ? "Blocked by active hold" : ""}
            >
              <Plus className="h-4 w-4" />
              Submit Commission
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDrawModal(true)}
              className="gap-2 rounded-xl border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
              disabled={commissionHolds.length > 0}
            >
              <DollarSign className="h-4 w-4" />
              Request Draw
            </Button>
          </div>
        </div>

        {/* Override Phase Indicator */}
        <OverridePhaseIndicator />

        {/* Summary Cards + Draw Balance */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_300px]">
          <CommissionSummaryCards {...summaryStats} />
          <DrawBalanceCard showDrawModal={showDrawModal} onDrawModalChange={setShowDrawModal} />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="pipeline" className="space-y-4">
          <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1 h-auto">
            <TabsTrigger value="pipeline" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <FileSpreadsheet className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            {isReviewer && (
              <TabsTrigger value="tracker" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pipeline" className="space-y-4 mt-0">
            {/* Status Pipeline */}
            <CommissionStatusPipeline
              statusCounts={statusCounts}
              activeStatus={activeStatus}
              onStatusClick={setActiveStatus}
            />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, reps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl bg-card/60 border-border/40 h-12 text-base"
              />
            </div>

            {/* Commission Cards grouped by status */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-2xl bg-card/40 animate-pulse" />
                ))}
              </div>
            ) : Object.keys(groupedSubmissions).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedSubmissions).map(([status, items]) => (
                  <div key={status}>
                    {activeStatus === "all" && (
                      <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          {STATUS_LABELS[status] || status}
                        </h2>
                        <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {items.length}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2.5">
                      {items.map((submission) => (
                        <CommissionCard key={submission.id} submission={submission} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No commissions found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || activeStatus !== "all" 
                    ? "Try adjusting your filters"
                    : "Get started by submitting your first commission"
                  }
                </p>
                {canSubmit && !searchQuery && activeStatus === "all" && (
                  <Button onClick={() => navigate("/commissions/new")} className="rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Commission
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {isReviewer && (
            <TabsContent value="tracker">
              <CommissionTracker submissions={submissions || []} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
