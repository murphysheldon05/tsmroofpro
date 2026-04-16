import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3 } from "lucide-react";
import { AdminTemplateGrid } from "@/components/kpi-scorecards/AdminTemplateGrid";
import { AdminRecentSubmissions } from "@/components/kpi-scorecards/AdminRecentSubmissions";
import { ReviewerDashboard } from "@/components/kpi-scorecards/ReviewerDashboard";
import { EmployeeDashboard } from "@/components/kpi-scorecards/EmployeeDashboard";
import { AssignmentsModal } from "@/components/kpi-scorecards/AssignmentsModal";
import type { ScorecardTemplate } from "@/lib/kpiTypes";

export default function KpiScorecards() {
  const { isAdmin, role } = useAuth();
  const isReviewer = role === "manager" || role === "sales_manager";
  const [assignmentTemplate, setAssignmentTemplate] =
    useState<ScorecardTemplate | null>(null);

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-0">
      <header className="pt-2 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
            KPI Scorecards
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin
              ? "Manage scorecard templates, assignments, and review submissions"
              : isReviewer
              ? "Review and score your team's KPIs"
              : "View your KPI scores and progress"}
          </p>
        </div>
      </header>

      {isAdmin ? (
        <div className="space-y-8">
          <AdminTemplateGrid
            onManageAssignments={(t) => setAssignmentTemplate(t)}
          />
          <AdminRecentSubmissions />
        </div>
      ) : isReviewer ? (
        <ReviewerDashboard />
      ) : (
        <EmployeeDashboard />
      )}

      <AssignmentsModal
        template={assignmentTemplate}
        onClose={() => setAssignmentTemplate(null)}
      />
    </div>
  );
}
