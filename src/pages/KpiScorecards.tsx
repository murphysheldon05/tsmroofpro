import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Sparkles, ArrowRight } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { AdminTemplateGrid } from "@/components/kpi-scorecards/AdminTemplateGrid";
import { ReviewerDashboard } from "@/components/kpi-scorecards/ReviewerDashboard";
import { EmployeeDashboard } from "@/components/kpi-scorecards/EmployeeDashboard";
import { AdminRecentSubmissions } from "@/components/kpi-scorecards/AdminRecentSubmissions";
import { AssignmentsModal } from "@/components/kpi-scorecards/AssignmentsModal";
import { useMyEmployeeAssignments, useMyReviewAssignments } from "@/hooks/useKpiScorecards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAccessibleWeeklyKpiCards } from "@/lib/weeklyKpiAccess";
import type { ScorecardTemplate } from "@/lib/kpiTypes";

export default function KpiScorecards() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [selectedTemplate, setSelectedTemplate] = useState<ScorecardTemplate | null>(null);
  const { data: profile } = useQuery({
    queryKey: ["weekly-kpi-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: reviewAssignments = [], isLoading: loadingReviewAssignments } =
    useMyReviewAssignments();
  const { data: employeeAssignments = [], isLoading: loadingEmployeeAssignments } =
    useMyEmployeeAssignments();
  const legacyCards = useMemo(
    () =>
      getAccessibleWeeklyKpiCards({
        role,
        fullName: profile?.full_name,
        email: profile?.email ?? user?.email,
      }),
    [role, profile?.full_name, profile?.email, user?.email],
  );

  const hasAssignedAccess = useMemo(
    () => reviewAssignments.length > 0 || employeeAssignments.length > 0,
    [reviewAssignments.length, employeeAssignments.length],
  );

  if (!isAdmin && (loadingReviewAssignments || loadingEmployeeAssignments)) {
    return <div className="mx-auto max-w-7xl py-12 text-sm text-muted-foreground">Loading KPI scorecards...</div>;
  }

  if (!isAdmin && !hasAssignedAccess && legacyCards.length === 0) {
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
            Keep using your existing scorecards while editing and assigning the new template-based scorecards.
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

      {legacyCards.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Legacy Weekly Scorecards</h2>
            <Badge variant="outline" className="border-border/70">
              Kept active for edits
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {legacyCards.map((card) => (
              <Card key={card.href} className="overflow-hidden border-border/70 card-lift">
                <div className="bg-gradient-to-r from-primary/20 via-surface-3 to-surface-2 px-5 py-4 border-b border-border/60">
                  <h3 className="text-base font-bold text-foreground">{card.title}</h3>
                </div>
                <CardContent className="space-y-4 p-5">
                  <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                  <p className="text-xs text-muted-foreground">Reviewed by: {card.reviewedBy}</p>
                  <Button asChild variant="neon" className="w-full">
                    <Link to={card.href}>
                      Open and Edit
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

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
