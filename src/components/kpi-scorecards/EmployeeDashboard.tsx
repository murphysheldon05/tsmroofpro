import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMyEmployeeAssignments,
  useTemplates,
  useSubmissions,
} from "@/hooks/useKpiScorecards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Minus, Eye, Trophy, BarChart3 } from "lucide-react";
import type { BonusTier } from "@/lib/kpiTypes";
import { getScoreColor, matchBonusTier } from "@/lib/kpiTypes";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

function EmployeeCard({ assignmentId, templateId }: { assignmentId: string; templateId: string }) {
  const navigate = useNavigate();
  const { data: templates = [] } = useTemplates();
  const { data: submissions = [] } = useSubmissions(assignmentId);

  const template = templates.find((t) => t.id === templateId);
  const bonusTiers = (template?.bonus_tiers as unknown) as BonusTier[] | null;

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
  const latestScore = latest ? Number(latest.average) : null;
  const scoreColor = latestScore !== null ? getScoreColor(latestScore) : null;

  return (
    <Card className="card-lift overflow-hidden relative">
      {latestScore !== null && scoreColor && (
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: scoreColor }}
        />
      )}
      <CardContent className="p-5 space-y-4">
        {/* Header: template name + trend */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="section-label mb-1">Scorecard</p>
            <h3 className="text-sm font-bold text-foreground truncate">{template?.name ?? "—"}</h3>
          </div>
          {latest && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
                trendDir === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                trendDir === "down" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                trendDir === "flat" && "bg-muted text-muted-foreground",
              )}
            >
              {trendDir === "up" && <TrendingUp className="w-3 h-3" />}
              {trendDir === "down" && <TrendingDown className="w-3 h-3" />}
              {trendDir === "flat" && <Minus className="w-3 h-3" />}
              {prior && latest && (
                <span>
                  {Number(latest.average) - Number(prior.average) >= 0 ? "+" : ""}
                  {(Number(latest.average) - Number(prior.average)).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Big score */}
        {latestScore !== null ? (
          <div className="flex items-end gap-2">
            <span
              className="text-5xl font-extrabold leading-none tracking-tight"
              style={{ color: scoreColor ?? undefined }}
            >
              {latestScore.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground pb-1">/ 5.0</span>
          </div>
        ) : (
          <div className="py-3">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-semibold text-foreground">No scores yet</p>
                <p className="text-xs text-muted-foreground">Your first scorecard will appear here.</p>
              </div>
            </div>
          </div>
        )}

        {/* Month avg */}
        {monthAvg !== null && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
            <span className="text-muted-foreground">Month average</span>
            <span className="font-semibold text-foreground">{monthAvg.toFixed(2)}</span>
          </div>
        )}

        {/* Bonus */}
        {template?.has_bonus && (
          tier ? (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold"
              style={{
                borderColor: `${tier.color ?? "#FFD700"}40`,
                background: `${tier.color ?? "#FFD700"}14`,
                color: tier.color ?? "#C9A227",
              }}
            >
              <Trophy className="w-3.5 h-3.5 flex-shrink-0" />
              <span>On track for {tier.label}</span>
              <span className="ml-auto">${tier.amount}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Below bonus threshold</p>
          )
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
      <h2 className="text-lg font-bold text-foreground">My Scorecards</h2>
      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={BarChart3}
              title="No scorecards assigned yet"
              description="Once an admin assigns a scorecard to you, it'll appear here with your scores and trends."
              tone="primary"
              size="lg"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 row-stagger">
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
