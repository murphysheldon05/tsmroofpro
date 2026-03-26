import { Badge } from "@/components/ui/badge";
import {
  getScoreColor,
  getScoreBgClass,
  matchBonusTier,
  SCORE_COLORS,
  type BonusTier,
  type ScorecardKpi,
} from "@/lib/kpiTypes";

interface ScoreSummaryBarProps {
  scores: Record<string, number>;
  kpis: ScorecardKpi[];
  bonusTiers: BonusTier[] | null;
  hasBonus: boolean;
}

export function ScoreSummaryBar({
  scores,
  kpis,
  bonusTiers,
  hasBonus,
}: ScoreSummaryBarProps) {
  const scoredKpis = kpis.filter((k) => scores[k.id] != null);
  const average =
    scoredKpis.length > 0
      ? scoredKpis.reduce((sum, k) => sum + (scores[k.id] ?? 0), 0) /
        scoredKpis.length
      : 0;

  const tier = hasBonus ? matchBonusTier(average, bonusTiers) : null;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold" style={{ color: getScoreColor(average) }}>
          {average > 0 ? average.toFixed(1) : "—"}
        </span>
        <span className="text-lg text-muted-foreground font-medium">/ 5.0</span>
        <span className="text-sm text-muted-foreground ml-auto">
          {scoredKpis.length} / {kpis.length} scored
        </span>
      </div>

      {hasBonus && (
        <div className="text-sm">
          {tier ? (
            <span className="font-medium" style={{ color: tier.color ?? "#FFD700" }}>
              Qualifies for {tier.label} — ${tier.amount}
            </span>
          ) : average > 0 ? (
            <span className="text-muted-foreground">Below bonus threshold</span>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {kpis.map((kpi) => {
          const score = scores[kpi.id];
          if (score == null) return null;
          return (
            <Badge
              key={kpi.id}
              variant="outline"
              className="text-xs"
              style={{
                borderColor: SCORE_COLORS[score] + "60",
                color: SCORE_COLORS[score],
              }}
            >
              {kpi.name}: {score}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
