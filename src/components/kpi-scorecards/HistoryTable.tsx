import { useMemo, useState, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  formatPeriodLabel,
  SCORE_COLORS,
  type ScorecardKpi,
  type ScorecardSubmission,
} from "@/lib/kpiTypes";

interface HistoryTableProps {
  submissions: ScorecardSubmission[];
  kpis: ScorecardKpi[];
  frequency: string;
  profileMap: Map<string, { full_name: string | null }>;
}

function periodKey(s: ScorecardSubmission) {
  return `${s.period_start}|${s.period_end}`;
}

function groupByPeriod(
  submissions: ScorecardSubmission[]
): { period_start: string; period_end: string; items: ScorecardSubmission[] }[] {
  const map = new Map<string, ScorecardSubmission[]>();
  for (const s of submissions) {
    const k = periodKey(s);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }
  const groups = [...map.entries()].map(([key, items]) => {
    const [period_start, period_end] = key.split("|");
    return { period_start, period_end, items };
  });
  groups.sort(
    (a, b) =>
      new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
  );
  return groups;
}

function averageKpiScores(
  items: ScorecardSubmission[],
  kpis: ScorecardKpi[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const kpi of kpis) {
    const vals = items
      .map((s) => (s.scores as Record<string, number>)[kpi.id])
      .filter((v): v is number => v != null && !Number.isNaN(v));
    if (vals.length) {
      out[kpi.id] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }
  return out;
}

function averageOverall(items: ScorecardSubmission[]): number {
  const avgs = items.map((s) => Number(s.average)).filter((n) => !Number.isNaN(n));
  if (!avgs.length) return 0;
  return avgs.reduce((a, b) => a + b, 0) / avgs.length;
}

function avgTextColor(avg: number): string {
  if (avg >= 4) return SCORE_COLORS[5];
  if (avg >= 3) return SCORE_COLORS[3];
  return SCORE_COLORS[1];
}

export function HistoryTable({
  submissions,
  kpis,
  frequency,
  profileMap,
}: HistoryTableProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupByPeriod(submissions), [submissions]);

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No submissions yet.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[120px]">Period</TableHead>
            {kpis.map((kpi) => (
              <TableHead
                key={kpi.id}
                className="text-center min-w-[60px]"
                title={kpi.full_name || kpi.name}
              >
                {kpi.name}
              </TableHead>
            ))}
            <TableHead className="text-center min-w-[70px]">Avg</TableHead>
            <TableHead className="min-w-[90px]">Reviewer</TableHead>
            <TableHead className="min-w-[60px]">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.flatMap((group) => {
            const periodLabel = formatPeriodLabel(
              group.period_start,
              group.period_end,
              frequency
            );
            const sortedItems = [...group.items].sort((a, b) => {
              const na =
                profileMap.get(a.reviewer_id)?.full_name ?? "";
              const nb =
                profileMap.get(b.reviewer_id)?.full_name ?? "";
              return na.localeCompare(nb);
            });

            const rows: ReactNode[] = [];

            sortedItems.forEach((s) => {
              const scoreMap = s.scores as Record<string, number>;
              const reviewer = profileMap.get(s.reviewer_id);
              const hasNotes = !!s.notes?.trim();
              const isExpanded = expandedNotes.has(s.id);

              rows.push(
                <TableRow key={s.id}>
                  <TableCell className="text-sm font-medium">
                    {periodLabel}
                  </TableCell>
                  {kpis.map((kpi) => {
                    const score = scoreMap[kpi.id];
                    return (
                      <TableCell key={kpi.id} className="text-center">
                        {score != null ? (
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold"
                            style={{
                              backgroundColor: SCORE_COLORS[score] ?? "#888",
                            }}
                          >
                            {score}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <span
                      className="font-semibold text-sm"
                      style={{
                        color:
                          Number(s.average) >= 4
                            ? SCORE_COLORS[5]
                            : Number(s.average) >= 3
                              ? SCORE_COLORS[3]
                              : SCORE_COLORS[1],
                      }}
                    >
                      {Number(s.average).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {reviewer?.full_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {hasNotes ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => toggleNotes(s.id)}
                      >
                        {isExpanded ? "Hide" : "View"}
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            });

            if (sortedItems.length > 1) {
              const kpiAvgs = averageKpiScores(sortedItems, kpis);
              const overallAvg = averageOverall(sortedItems);
              const avgRowKey = `avg-${group.period_start}-${group.period_end}`;

              rows.push(
                <TableRow
                  key={avgRowKey}
                  className="bg-muted/40 border-t border-border/80"
                >
                  <TableCell className="text-sm font-semibold text-foreground">
                    {periodLabel}
                  </TableCell>
                  {kpis.map((kpi) => {
                    const v = kpiAvgs[kpi.id];
                    return (
                      <TableCell key={kpi.id} className="text-center">
                        {v != null ? (
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: avgTextColor(v) }}
                          >
                            {v.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <span
                      className="font-bold text-sm tabular-nums"
                      style={{ color: avgTextColor(overallAvg) }}
                    >
                      {overallAvg.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-primary">
                    Average ({sortedItems.length} reviewers)
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">—</span>
                  </TableCell>
                </TableRow>
              );
            }

            return rows;
          })}
        </TableBody>
      </Table>

      {submissions
        .filter((s) => expandedNotes.has(s.id) && s.notes?.trim())
        .map((s) => (
          <div
            key={`notes-${s.id}`}
            className="px-4 py-2 bg-muted/30 text-sm text-muted-foreground border-t border-border"
          >
            <span className="font-medium text-foreground">Notes:</span>{" "}
            {s.notes}
          </div>
        ))}
    </div>
  );
}
