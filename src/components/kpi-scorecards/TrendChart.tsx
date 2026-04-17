import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatPeriodLabel,
  type ScorecardKpi,
  type ScorecardSubmission,
  type BonusTier,
} from "@/lib/kpiTypes";

interface TrendChartProps {
  submissions: ScorecardSubmission[];
  kpis: ScorecardKpi[];
  frequency: string;
  bonusTiers: BonusTier[] | null;
  hasBonus: boolean;
}

const KPI_LINE_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#a4de6c",
  "#d0a6e6",
  "#ffb347",
];

/** One chart point per review period; multiple reviewer submissions are averaged. */
function aggregateSubmissionsByPeriod(
  items: ScorecardSubmission[],
  kpis: ScorecardKpi[],
  frequency: string
): Record<string, unknown>[] {
  const map = new Map<string, ScorecardSubmission[]>();
  for (const s of items) {
    const k = `${s.period_start}|${s.period_end}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }
  const groups = [...map.entries()].map(([key, subs]) => {
    const [period_start, period_end] = key.split("|");
    return { period_start, period_end, subs };
  });
  groups.sort(
    (a, b) =>
      new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
  );

  return groups.map(({ period_start, period_end, subs }) => {
    const point: Record<string, unknown> = {
      period: formatPeriodLabel(period_start, period_end, frequency),
      average:
        subs.reduce((sum, s) => sum + Number(s.average), 0) / subs.length,
    };
    kpis.forEach((kpi) => {
      const vals = subs
        .map((s) => (s.scores as Record<string, number>)[kpi.id])
        .filter((v): v is number => v != null && !Number.isNaN(v));
      point[kpi.id] =
        vals.length > 0
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : null;
    });
    return point;
  });
}

export function TrendChart({
  submissions,
  kpis,
  frequency,
  bonusTiers,
  hasBonus,
}: TrendChartProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [showKpis, setShowKpis] = useState(false);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const d = new Date(s.period_start + "T00:00:00");
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [submissions, month, year]);

  const chartData = useMemo(
    () => aggregateSubmissionsByPeriod(filtered, kpis, frequency),
    [filtered, kpis, frequency]
  );

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
    if (isCurrentMonth) return;
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Score Trends</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={isCurrentMonth}
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {kpis.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs w-fit"
            onClick={() => setShowKpis(!showKpis)}
          >
            {showKpis ? "Hide per-KPI lines" : "Show per-KPI lines"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No data for this month"
            description="Scores submitted during this period will appear here as a trend line."
            tone="slate"
            size="md"
          />
        ) : (
          (() => {
            const chartConfig: ChartConfig = {
              average: { label: "Average", color: "hsl(var(--primary))" },
              ...Object.fromEntries(
                kpis.map((k, i) => [
                  k.id,
                  { label: k.name, color: KPI_LINE_COLORS[i % KPI_LINE_COLORS.length] },
                ])
              ),
            };
            return (
              <ChartContainer config={chartConfig} className="h-[300px] w-full aspect-auto">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} content={<ChartTooltipContent />} />
                  {showKpis && <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}

                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    name="Average"
                  />

                  {showKpis &&
                    kpis.map((kpi, i) => (
                      <Line
                        key={kpi.id}
                        type="monotone"
                        dataKey={kpi.id}
                        stroke={KPI_LINE_COLORS[i % KPI_LINE_COLORS.length]}
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        dot={{ r: 3 }}
                        name={kpi.name}
                      />
                    ))}

                  {hasBonus &&
                    bonusTiers?.map((tier) => (
                      <ReferenceLine
                        key={tier.label}
                        y={tier.min_avg}
                        stroke={tier.color ?? "#FFD700"}
                        strokeDasharray="6 3"
                        label={{
                          value: tier.label,
                          position: "right",
                          fill: tier.color ?? "#FFD700",
                          fontSize: 11,
                        }}
                      />
                    ))}
                </LineChart>
              </ChartContainer>
            );
          })()
        )}
      </CardContent>
    </Card>
  );
}
