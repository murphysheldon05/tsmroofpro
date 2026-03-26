import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useTemplateKpis,
  useSubmissions,
  useProfiles,
} from "@/hooks/useKpiScorecards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2 } from "lucide-react";
import { HistoryTable } from "@/components/kpi-scorecards/HistoryTable";
import { TrendChart } from "@/components/kpi-scorecards/TrendChart";
import {
  getScoreColor,
  getScoreBgClass,
  matchBonusTier,
  type BonusTier,
  type ScorecardAssignment,
  type ScorecardTemplate,
  type ScorecardKpi,
} from "@/lib/kpiTypes";

export default function KpiScorecardHistory() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { data: profiles = [] } = useProfiles();

  const { data: assignment, isLoading: loadingAssignment } = useQuery({
    queryKey: ["scorecard-assignment", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;
      const { data, error } = await supabase
        .from("scorecard_assignments")
        .select("*")
        .eq("id", assignmentId)
        .maybeSingle();
      if (error) throw error;
      return data as ScorecardAssignment | null;
    },
    enabled: !!assignmentId,
  });

  const { data: template } = useQuery({
    queryKey: ["scorecard-template", assignment?.template_id],
    queryFn: async () => {
      if (!assignment?.template_id) return null;
      const { data, error } = await supabase
        .from("scorecard_templates")
        .select("*")
        .eq("id", assignment.template_id)
        .maybeSingle();
      if (error) throw error;
      return data as ScorecardTemplate | null;
    },
    enabled: !!assignment?.template_id,
  });

  const { data: kpis = [] } = useTemplateKpis(assignment?.template_id);
  const { data: submissions = [] } = useSubmissions(assignmentId);
  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const employee = profiles.find((p) => p.id === assignment?.employee_id);
  const bonusTiers = template?.bonus_tiers as BonusTier[] | null;
  const freq = template?.review_frequency ?? "weekly";

  const { monthAvg, perKpiAvgs } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSubs = submissions.filter(
      (s) => new Date(s.period_start + "T00:00:00") >= monthStart
    );

    if (monthSubs.length === 0)
      return { monthAvg: null, perKpiAvgs: new Map<string, number>() };

    const monthAvg =
      monthSubs.reduce((sum, s) => sum + Number(s.average), 0) /
      monthSubs.length;

    const perKpiAvgs = new Map<string, number>();
    kpis.forEach((kpi) => {
      const scores = monthSubs
        .map((s) => (s.scores as Record<string, number>)[kpi.id])
        .filter((v) => v != null);
      if (scores.length > 0) {
        perKpiAvgs.set(
          kpi.id,
          scores.reduce((a, b) => a + b, 0) / scores.length
        );
      }
    });

    return { monthAvg, perKpiAvgs };
  }, [submissions, kpis]);

  const tier = monthAvg !== null ? matchBonusTier(monthAvg, bonusTiers) : null;

  if (loadingAssignment) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <p className="text-muted-foreground">Assignment not found.</p>
        <Button variant="outline" asChild>
          <Link to="/kpi-scorecards">Back to KPI Scorecards</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 sm:px-0">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <Link
          to="/kpi-scorecards"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KPI Scorecards
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {employee?.full_name ?? "Employee"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {template?.name ?? "Scorecard"} — History
            </p>
          </div>
          {monthAvg !== null && (
            <div className="text-right">
              <span
                className="text-3xl font-bold"
                style={{ color: getScoreColor(monthAvg) }}
              >
                {monthAvg.toFixed(1)}
              </span>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
          )}
        </div>
      </header>

      {/* Monthly Summary */}
      {monthAvg !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {kpis.map((kpi) => {
                const avg = perKpiAvgs.get(kpi.id) ?? 0;
                return (
                  <div key={kpi.id} className="flex items-center gap-3">
                    <span className="text-sm w-[120px] truncate" title={kpi.full_name || kpi.name}>
                      {kpi.name}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(avg / 5) * 100}%`,
                          backgroundColor: getScoreColor(avg),
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">
                      {avg > 0 ? avg.toFixed(1) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {template?.has_bonus && bonusTiers && bonusTiers.length > 0 && (
              <div className="pt-3 border-t border-border">
                <div className="flex flex-wrap items-center gap-2">
                  {[...bonusTiers]
                    .sort((a, b) => b.min_avg - a.min_avg)
                    .map((bt) => {
                      const isActive = tier?.label === bt.label;
                      return (
                        <Badge
                          key={bt.label}
                          variant={isActive ? "default" : "outline"}
                          className="text-xs"
                          style={
                            isActive
                              ? {
                                  backgroundColor: bt.color ?? "#FFD700",
                                  color: "#000",
                                }
                              : { borderColor: bt.color ?? "#ccc" }
                          }
                        >
                          {bt.label} (${bt.amount})
                          {isActive && " ← You're here"}
                        </Badge>
                      );
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trend Chart */}
      <TrendChart
        submissions={submissions}
        kpis={kpis}
        frequency={freq}
        bonusTiers={bonusTiers ?? null}
        hasBonus={template?.has_bonus ?? false}
      />

      {/* History Table */}
      <section className="space-y-4 pb-8">
        <h2 className="text-lg font-semibold">Week-by-Week History</h2>
        <HistoryTable
          submissions={submissions}
          kpis={kpis}
          frequency={freq}
          profileMap={profileMap}
        />
      </section>
    </div>
  );
}
