import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMyEmployeeAssignments,
  useTemplates,
  useSubmissions,
} from "@/hooks/useKpiScorecards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";
import type { BonusTier, ScorecardSubmission } from "@/lib/kpiTypes";
import { getScoreBgClass, matchBonusTier } from "@/lib/kpiTypes";

function EmployeeCard({ assignmentId, templateId }: { assignmentId: string; templateId: string }) {
  const navigate = useNavigate();
  const { data: templates = [] } = useTemplates();
  const { data: submissions = [] } = useSubmissions(assignmentId);

  const template = templates.find((t) => t.id === templateId);
  const bonusTiers = template?.bonus_tiers as BonusTier[] | null;

  const { latest, prior, monthAvg, trendDir } = useMemo(() => {
    if (submissions.length === 0)
      return { latest: null, prior: null, monthAvg: null, trendDir: "flat" as const };

    const sorted = [...submissions].sort(
      (a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
    );
    const latest = sorted[0];
    const prior = sorted[1] ?? null;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSubs = sorted.filter(
      (s) => new Date(s.period_start) >= monthStart
    );
    const monthAvg =
      monthSubs.length > 0
        ? monthSubs.reduce((sum, s) => sum + Number(s.average), 0) /
          monthSubs.length
        : null;

    let trendDir: "up" | "down" | "flat" = "flat";
    if (latest && prior) {
      const diff = Number(latest.average) - Number(prior.average);
      if (diff > 0.1) trendDir = "up";
      else if (diff < -0.1) trendDir = "down";
    }

    return { latest, prior, monthAvg, trendDir };
  }, [submissions]);

  const tier = monthAvg !== null ? matchBonusTier(monthAvg, bonusTiers) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{template?.name ?? "—"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {latest ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getScoreBgClass(Number(latest.average))}>
                {Number(latest.average).toFixed(1)}
              </Badge>
              {trendDir === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
              {trendDir === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
              {trendDir === "flat" && <Minus className="w-4 h-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">Latest</span>
            </div>
            {monthAvg !== null && (
              <p className="text-sm text-muted-foreground">
                Month avg: <span className="font-medium text-foreground">{monthAvg.toFixed(1)}</span>
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No scores yet</p>
        )}

        {template?.has_bonus ? (
          tier ? (
            <p className="text-sm font-medium" style={{ color: tier.color ?? "#FFD700" }}>
              On track for {tier.label} (${tier.amount})
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Below bonus threshold</p>
          )
        ) : (
          <p className="text-xs text-muted-foreground">No bonus structure</p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate(`/kpi-scorecards/view/${assignmentId}`)}
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          View History
        </Button>
      </CardContent>
    </Card>
  );
}

export function EmployeeDashboard() {
  const { data: assignments = [], isLoading } = useMyEmployeeAssignments();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">My Scorecards</h2>
      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No scorecards assigned to you yet. Contact your admin.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {assignments.map((a) => (
            <EmployeeCard
              key={a.id}
              assignmentId={a.id}
              templateId={a.template_id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
