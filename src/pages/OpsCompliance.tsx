import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Ban, 
  TrendingUp, 
  FileText, 
  CheckCircle,
  LayoutDashboard
} from "lucide-react";

// Hooks
import {
  useOpenViolationsCount,
  useActiveHoldsCount,
  usePendingEscalationsCount,
  useUnacknowledgedUsersCount,
  useResolvedThisMonthCount,
  useRecentViolations,
  usePendingEscalations,
} from "@/hooks/useCompliance";

// Components
import { ComplianceSummaryCards } from "@/components/compliance/ComplianceSummaryCards";
import { RecentViolationsTable } from "@/components/compliance/RecentViolationsTable";
import { AwaitingDecisionTable } from "@/components/compliance/AwaitingDecisionTable";
import { QuickActionsBar } from "@/components/compliance/QuickActionsBar";
import { LogViolationModal } from "@/components/compliance/LogViolationModal";
import { ApplyHoldModal } from "@/components/compliance/ApplyHoldModal";
import { ViolationsTab } from "@/components/compliance/ViolationsTab";
import { HoldsTab } from "@/components/compliance/HoldsTab";
import { EscalationsTab } from "@/components/compliance/EscalationsTab";
import { AuditLogTab } from "@/components/compliance/AuditLogTab";
import { AcknowledgmentsTab } from "@/components/compliance/AcknowledgmentsTab";
import { MasterSOPsTab } from "@/components/compliance/MasterSOPsTab";
const tabs = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "violations", label: "Violations", icon: AlertTriangle },
  { value: "holds", label: "Holds", icon: Ban },
  { value: "escalations", label: "Escalations", icon: TrendingUp },
  { value: "audit-log", label: "Audit Log", icon: FileText },
  { value: "sops", label: "Master SOPs", icon: ShieldCheck },
  { value: "acknowledgments", label: "Acknowledgments", icon: CheckCircle },
];

export default function OpsCompliance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  
  const activeTab = searchParams.get("tab") || "dashboard";

  // Modal states
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Data queries
  const { data: openViolations, isLoading: loadingViolations } = useOpenViolationsCount();
  const { data: activeHolds, isLoading: loadingHolds } = useActiveHoldsCount();
  const { data: pendingEscalations, isLoading: loadingEscalations } = usePendingEscalationsCount();
  const { data: unacknowledgedUsers, isLoading: loadingUnack } = useUnacknowledgedUsersCount();
  const { data: resolvedThisMonth, isLoading: loadingResolved } = useResolvedThisMonthCount();
  const { data: recentViolations, isLoading: loadingRecent } = useRecentViolations(5);
  const { data: pendingEscalationsList, isLoading: loadingPendingList } = usePendingEscalations();

  const isLoadingSummary = loadingViolations || loadingHolds || loadingEscalations || loadingUnack || loadingResolved;

  const handleTabChange = (value: string) => {
    if (value === "dashboard") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: value });
    }
  };

  const handleNavigate = (tab: string, params?: string) => {
    if (params) {
      setSearchParams({ tab, ...Object.fromEntries(new URLSearchParams(params)) });
    } else {
      setSearchParams({ tab });
    }
  };

  const handleReviewEscalation = (escalationId: string) => {
    // Navigate to escalations tab with the specific escalation highlighted
    setSearchParams({ tab: "escalations", review: escalationId });
    toast.info("Opening escalation for review...");
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const weekAgo = subDays(new Date(), 7);
      
      // Fetch week's data
      const [violationsRes, holdsRes, escalationsRes] = await Promise.all([
        supabase
          .from("compliance_violations")
          .select("*")
          .gte("created_at", weekAgo.toISOString()),
        supabase
          .from("compliance_holds")
          .select("*")
          .gte("created_at", weekAgo.toISOString()),
        supabase
          .from("compliance_escalations")
          .select("*")
          .gte("created_at", weekAgo.toISOString()),
      ]);

      const violations = violationsRes.data || [];
      const holds = holdsRes.data || [];
      const escalations = escalationsRes.data || [];

      // Generate CSV
      const csvLines = [
        "WEEKLY COMPLIANCE REPORT",
        `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
        `Period: ${format(weekAgo, "yyyy-MM-dd")} to ${format(new Date(), "yyyy-MM-dd")}`,
        "",
        "SUMMARY",
        `Total Violations: ${violations.length}`,
        `Total Holds: ${holds.length}`,
        `Total Escalations: ${escalations.length}`,
        "",
        "VIOLATIONS",
        "Date,SOP,Severity,Status,Description",
        ...violations.map(v => 
          `${format(new Date(v.created_at), "yyyy-MM-dd")},${v.sop_key},${v.severity},${v.status},"${v.description.replace(/"/g, '""')}"`
        ),
        "",
        "HOLDS",
        "Date,Type,Status,Reason",
        ...holds.map(h => 
          `${format(new Date(h.created_at), "yyyy-MM-dd")},${h.hold_type},${h.status},"${h.reason.replace(/"/g, '""')}"`
        ),
      ];

      const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Report exported successfully");
    } catch (error: any) {
      toast.error("Failed to export report: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Access check
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access the Ops Compliance section.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Ops Compliance</h1>
            <p className="text-sm text-muted-foreground">
              Manage violations, holds, escalations, and SOP compliance
            </p>
          </div>
        </div>

        {/* Tab Navigation - Mobile Friendly */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max min-w-full sm:w-full sm:grid sm:grid-cols-7 h-auto p-1 bg-muted/50">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" className="sm:hidden" />
          </ScrollArea>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-4 space-y-4 sm:space-y-6">
            {/* Summary Cards */}
            <ComplianceSummaryCards
              openViolations={openViolations}
              activeHolds={activeHolds}
              pendingEscalations={pendingEscalations}
              unacknowledgedUsers={unacknowledgedUsers}
              resolvedThisMonth={resolvedThisMonth}
              isLoading={isLoadingSummary}
              onNavigate={handleNavigate}
            />

            {/* Quick Actions */}
            <QuickActionsBar
              onLogViolation={() => setViolationModalOpen(true)}
              onApplyHold={() => setHoldModalOpen(true)}
              onViewAuditLog={() => handleNavigate("audit-log")}
              onExportReport={handleExportReport}
              isExporting={isExporting}
            />

            {/* Recent Violations */}
            <RecentViolationsTable
              violations={recentViolations}
              isLoading={loadingRecent}
              onViewAll={() => handleNavigate("violations")}
            />

            {/* Awaiting Decision - Admin Only */}
            {isAdmin && (
              <AwaitingDecisionTable
                escalations={pendingEscalationsList}
                isLoading={loadingPendingList}
                onReview={handleReviewEscalation}
              />
            )}
          </TabsContent>

          {/* Violations Tab */}
          <TabsContent value="violations" className="mt-4">
            <ViolationsTab />
          </TabsContent>

          {/* Holds Tab */}
          <TabsContent value="holds" className="mt-4">
            <HoldsTab />
          </TabsContent>

          {/* Escalations Tab */}
          <TabsContent value="escalations" className="mt-4">
            <EscalationsTab />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit-log" className="mt-4">
            <AuditLogTab />
          </TabsContent>

          {/* Master SOPs Tab */}
          <TabsContent value="sops" className="mt-4">
            <MasterSOPsTab />
          </TabsContent>

          {/* Acknowledgments Tab */}
          <TabsContent value="acknowledgments" className="mt-4">
            <AcknowledgmentsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <LogViolationModal 
        open={violationModalOpen} 
        onOpenChange={setViolationModalOpen} 
      />
      <ApplyHoldModal 
        open={holdModalOpen} 
        onOpenChange={setHoldModalOpen} 
      />
    </AppLayout>
  );
}
