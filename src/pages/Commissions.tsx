import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, DollarSign, Search, FileSpreadsheet, BarChart3, TrendingUp, Wallet, ClipboardList, CalendarCheck } from "lucide-react";
import { useCommissionSubmissions, useIsCommissionReviewer } from "@/hooks/useCommissions";
import { CommissionTracker } from "@/components/commissions/CommissionTracker";
import { CommissionStatusPipeline } from "@/components/commissions/CommissionStatusPipeline";
import { CommissionSummaryCards } from "@/components/commissions/CommissionSummaryCards";
import { CommissionCard } from "@/components/commissions/CommissionCard";
import { DrawBalanceWidget } from "@/components/commissions/DrawBalanceWidget";
import { DrawApprovalQueue } from "@/components/commissions/DrawApprovalQueue";
import { DrawHistoryTab } from "@/components/commissions/DrawHistoryTab";
import { OverridePhaseIndicator } from "@/components/commissions/OverridePhaseIndicator";
import { ManagerOverrideEarningsCard, ManagerOverridesTab } from "@/components/commissions/ManagerOverrideEarnings";
import { useAuth } from "@/contexts/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserHoldsCheck } from "@/hooks/useComplianceHoldCheck";
import { HoldWarningBanner } from "@/components/compliance/HoldWarningBanner";
import { PayrollCutoffBanner } from "@/components/accounting/PayrollCutoffBanner";
import { formatPayDateShort } from "@/lib/commissionPayDateCalculations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { commissionsSteps } from "@/components/tutorial/tutorialSteps";

const STATUS_ORDER = ["pending_review", "rejected", "denied", "approved", "paid"];
const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  rejected: "Rejected",
  denied: "Denied",
  approved: "Approved",
  paid: "Paid",
  needs_action: "Needs Action",
};

const normalizeApprovalStage = (stage: string | null | undefined) => {
  // Legacy values (older DB constraint) -> current app values
  if (stage === "manager_approved") return "pending_accounting";
  if (stage === "accounting_approved" || stage === "approved") return "completed";
  if (stage === "pending") return "pending_manager";
  return stage ?? null;
};

export default function Commissions() {
  const navigate = useNavigate();
  const { role, isAdmin, userDepartment } = useAuth();
  const isManager = role === "manager";
  const isAdminView = isAdmin || isManager || userDepartment === "Accounting";
  const { canRequestDraws, canApproveDraws } = useRolePermissions();
  const { data: submissions, isLoading } = useCommissionSubmissions();
  const { data: isReviewer } = useIsCommissionReviewer();
  const { data: userHolds } = useUserHoldsCheck();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const isSalesManager = role === "sales_manager";
  // Only sales roles can submit commissions
  const canSubmit = role === 'sales_rep' || role === 'sales_manager' || role === 'admin';
  const showDrawRequests = canApproveDraws || isAdmin;
  const showMyDraws = canRequestDraws || role === "sales_rep" || role === "sales_manager";
  const commissionHolds = userHolds?.filter(h => h.hold_type === "commission_hold") || [];

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions?.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [submissions]);

  // Summary stats — USER VIEW vs ADMIN VIEW (useCommissionSubmissions scopes by role)
  // USER: Total Submitted = all $ this rep submitted; Paid = cumulative
  // ADMIN: Total Submitted = all $ across reps; Paid = total paid this month (pay run)
  const summaryStats = useMemo(() => {
    const list = (submissions || []).filter((s) => !s.is_draw);
    const amt = (s: (typeof list)[0]) => s.commission_approved ?? s.net_commission_owed ?? 0;

    // Total Submitted = all $ this rep has submitted (includes all statuses)
    const totalSubmittedAmount = list.reduce(
      (sum, s) => sum + (s.net_commission_owed || 0),
      0
    );

    // Compliance Approved = $ approved by Manny/Sheldon (approval_stage past pending_manager)
    const complianceApprovedAmount = list
      .filter(
        (s) =>
          normalizeApprovalStage(s.approval_stage) === "pending_accounting" ||
          normalizeApprovalStage(s.approval_stage) === "completed" ||
          s.status === "approved" ||
          s.status === "paid"
      )
      .reduce((sum, s) => sum + amt(s), 0);

    // Accounting Approved = $ approved by Courtney (status approved or paid)
    const accountingApprovedAmount = list
      .filter((s) => s.status === "approved" || s.status === "paid")
      .reduce((sum, s) => sum + amt(s), 0);

    // Paid: USER = cumulative; ADMIN = this month (pay run proxy)
    const paidRows = list.filter((s) => s.status === "paid");
    const paidAmount = isAdminView
      ? paidRows
          .filter((s) => s.paid_at && new Date(s.paid_at).getMonth() === new Date().getMonth() && new Date(s.paid_at).getFullYear() === new Date().getFullYear())
          .reduce((sum, s) => sum + amt(s), 0)
      : paidRows.reduce((sum, s) => sum + amt(s), 0);

    return {
      total: list.length,
      pending: list.filter((s) => s.status === "pending_review").length,
      approved: list.filter((s) => s.status === "approved").length,
      paid: list.filter((s) => s.status === "paid").length,
      totalSubmittedAmount,
      complianceApprovedAmount,
      accountingApprovedAmount,
      paidAmount,
    };
  }, [submissions, isAdminView]);

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

    if (activeStatus === "needs_action") {
      filtered = filtered.filter((s) => s.status === "rejected" || s.status === "denied");
    } else if (activeStatus !== "all") {
      filtered = filtered.filter((s) => s.status === activeStatus);
    }

    return filtered;
  }, [submissions, searchQuery, activeStatus]);

  // Group by status
  const groupedSubmissions = useMemo(() => {
    const groups: Record<string, typeof filteredSubmissions> = {};
    
    if (activeStatus !== "all") {
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

        {/* Tuesday 3PM Cutoff — helps reps understand pay timing */}
        <PayrollCutoffBanner />

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Commissions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track and manage your earnings
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {canSubmit && (
              <>
                <Button 
                  data-tutorial="submit-commission"
                  onClick={() => navigate("/commissions/new")} 
                  className="gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={commissionHolds.length > 0}
                  title={commissionHolds.length > 0 ? "Blocked by active hold" : ""}
                >
                  <Plus className="h-4 w-4" />
                  Submit Commission
                </Button>
                <Button 
                  data-tutorial="request-draw"
                  variant="outline" 
                  onClick={() => navigate("/commissions/draw/new")}
                  className="gap-2 rounded-xl border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  disabled={commissionHolds.length > 0}
                  title={commissionHolds.length > 0 ? "Blocked by active hold" : ""}
                >
                  <DollarSign className="h-4 w-4" />
                  Request a Draw
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Override Phase Indicator */}
        <OverridePhaseIndicator />

        {/* Summary Cards + Draw Balance + Manager Override Earnings */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <CommissionSummaryCards {...summaryStats} />
            {isManager && <ManagerOverrideEarningsCard />}
          </div>
          <div data-tutorial="draw-balance">
            <DrawBalanceWidget />
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="pipeline" className="space-y-4">
          <TabsList className="bg-card/60 border border-border/40 rounded-2xl p-1 h-auto flex-wrap">
            <TabsTrigger value="pipeline" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <FileSpreadsheet className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            {showMyDraws && (
              <TabsTrigger value="my-draws" className="gap-2 rounded-xl data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-600">
                <Wallet className="h-4 w-4" />
                My Draws
              </TabsTrigger>
            )}
            {showDrawRequests && (
              <TabsTrigger value="draw-requests" className="gap-2 rounded-xl data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-600">
                <ClipboardList className="h-4 w-4" />
                Draw Requests
              </TabsTrigger>
            )}
            {isReviewer && (
              <TabsTrigger value="tracker" className="gap-2 rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            )}
            {isManager && (
              <TabsTrigger value="overrides" className="gap-2 rounded-xl data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-600">
                <TrendingUp className="h-4 w-4" />
                My Overrides
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pipeline" className="space-y-4 mt-0">
            {/* Status Pipeline */}
            <div data-tutorial="commission-pipeline">
            <CommissionStatusPipeline
              statusCounts={statusCounts}
              activeStatus={activeStatus}
              onStatusClick={setActiveStatus}
            />
            </div>

            {/* Search */}
            <div className="relative" data-tutorial="commission-search">
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
                {Object.entries(groupedSubmissions).map(([status, items]) => {
                  // For approved/paid: Accounting sees commissions grouped by pay run
                  const shouldGroupByPayRun = isAdminView && (status === "approved" || status === "paid") && items.some((s) => (s as { scheduled_pay_date?: string | null }).scheduled_pay_date);
                  const payRunGroups = shouldGroupByPayRun
                    ? (items as any[]).reduce<Record<string, typeof items>>((acc, s) => {
                        const key = s.scheduled_pay_date || "Unassigned";
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(s);
                        return acc;
                      }, {})
                    : { _single: items };

                  return (
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
                      {Object.entries(payRunGroups).map(([payRunKey, payRunItems]) => (
                        <div key={payRunKey} className={shouldGroupByPayRun ? "mb-6" : ""}>
                          {shouldGroupByPayRun && (
                            <div className="flex items-center gap-2 mb-3">
                              <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                Pay Run: {payRunKey === "Unassigned" ? "Unassigned" : formatPayDateShort(payRunKey)}
                              </h3>
                              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {payRunItems.length}
                              </span>
                            </div>
                          )}
                          <div className="space-y-2.5">
                            {payRunItems.map((submission) => (
                              <CommissionCard key={submission.id} submission={submission} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
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
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Button onClick={() => navigate("/commissions/new")} className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Commission
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/commissions/draw/new")} className="rounded-xl border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Request a Draw
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {showMyDraws && (
            <TabsContent value="my-draws">
              <DrawHistoryTab />
            </TabsContent>
          )}

          {showDrawRequests && (
            <TabsContent value="draw-requests">
              <DrawApprovalQueue />
            </TabsContent>
          )}

          {isReviewer && (
            <TabsContent value="tracker">
              <CommissionTracker submissions={submissions || []} />
            </TabsContent>
          )}

          {isManager && (
            <TabsContent value="overrides">
              <ManagerOverridesTab />
            </TabsContent>
          )}
        </Tabs>

        <GuidedTour pageName="commissions" pageTitle="Commissions" steps={commissionsSteps} />
      </div>
    </AppLayout>
  );
}
