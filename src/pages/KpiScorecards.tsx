import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Sparkles } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { AdminTemplateGrid } from "@/components/kpi-scorecards/AdminTemplateGrid";
import { ReviewerDashboard } from "@/components/kpi-scorecards/ReviewerDashboard";
import { EmployeeDashboard } from "@/components/kpi-scorecards/EmployeeDashboard";
import { AdminRecentSubmissions } from "@/components/kpi-scorecards/AdminRecentSubmissions";
import { AssignmentsModal } from "@/components/kpi-scorecards/AssignmentsModal";
import { useMyEmployeeAssignments, useMyReviewAssignments } from "@/hooks/useKpiScorecards";
import type { ScorecardTemplate } from "@/lib/kpiTypes";

export default function KpiScorecards() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [selectedTemplate, setSelectedTemplate] = useState<ScorecardTemplate | null>(null);

  const { data: reviewAssignments = [], isLoading: loadingReviewAssignments } =
    useMyReviewAssignments();
  const { data: employeeAssignments = [], isLoading: loadingEmployeeAssignments } =
    useMyEmployeeAssignments();

  const hasAssignedAccess = useMemo(
    () => reviewAssignments.length > 0 || employeeAssignments.length > 0,
    [reviewAssignments.length, employeeAssignments.length],
  );

  if (!isAdmin && (loadingReviewAssignments || loadingEmployeeAssignments)) {
    return <div className="mx-auto max-w-7xl py-12 text-sm text-muted-foreground">Loading KPI scorecards...</div>;
  }

  if (!isAdmin && !hasAssignedAccess) {
    return <Navigate to="/command-center" replace />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex items-start gap-4 rounded-[18px] border border-border/60 bg-card/80 p-6 shadow-sm card-lift">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            KPI Scorecards
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Admins can build templates and manage assignments. Assigned employees and reviewers see only their own scorecards.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              {isAdmin ? "Admin access: all templates and assignments" : "Assigned access only"}
            </Badge>
            <Badge variant="outline" className="border-[hsl(var(--highlight))]/40 bg-[hsl(var(--highlight))]/10 text-[hsl(var(--highlight-foreground))]">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Editable templates and live scoring
            </Badge>
          </div>
        </div>
      </header>

      {isAdmin ? (
        <div className="space-y-8">
          <AdminTemplateGrid onManageAssignments={setSelectedTemplate} />
          <AdminRecentSubmissions />
        </div>
      ) : (
        <div className="space-y-8">
          {reviewAssignments.length > 0 && <ReviewerDashboard />}
          {employeeAssignments.length > 0 && <EmployeeDashboard />}
        </div>
      )}

      <AssignmentsModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />
    </div>
  );
}
