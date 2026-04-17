import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWarranties, WARRANTY_STATUSES, PRIORITY_LEVELS, ROOF_TYPES } from "@/hooks/useWarranties";
import { differenceInDays, parseISO } from "date-fns";
import { Clock, TrendingUp, BarChart3, Home } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";

const agingChartConfig: ChartConfig = {
  count: { label: "Open warranties" },
  avgDays: { label: "Avg. days" },
};

export function WarrantyAgingReport() {
  const { data: warranties = [], isLoading } = useWarranties();

  const agingMetrics = useMemo(() => {
    // Calculate average days to resolution for completed warranties
    const completedWarranties = warranties.filter(
      (w) => w.status === "completed" && w.date_completed
    );

    const calculateAvgDays = (filtered: typeof completedWarranties) => {
      if (filtered.length === 0) return 0;
      const totalDays = filtered.reduce((sum, w) => {
        const submitted = parseISO(w.date_submitted);
        const completed = parseISO(w.date_completed!);
        return sum + differenceInDays(completed, submitted);
      }, 0);
      return Math.round(totalDays / filtered.length);
    };

    // Overall average
    const overallAvg = calculateAvgDays(completedWarranties);

    // By Priority
    const byPriority = PRIORITY_LEVELS.map((p) => {
      const filtered = completedWarranties.filter((w) => w.priority_level === p.value);
      return {
        name: p.label,
        value: p.value,
        avgDays: calculateAvgDays(filtered),
        count: filtered.length,
        color: p.value === "emergency" ? "#ef4444" : 
               p.value === "high" ? "#f97316" : 
               p.value === "medium" ? "#eab308" : "#22c55e",
      };
    });

    // By Roof Type
    const byRoofType = ROOF_TYPES.map((r) => {
      const filtered = completedWarranties.filter((w) => w.roof_type === r.value);
      return {
        name: r.label,
        value: r.value,
        avgDays: calculateAvgDays(filtered),
        count: filtered.length,
      };
    }).filter((r) => r.count > 0);

    // Current aging for open warranties
    const openWarranties = warranties.filter(
      (w) => w.status !== "completed" && w.status !== "denied"
    );

    const currentAging = openWarranties.map((w) => {
      const submitted = parseISO(w.date_submitted);
      return differenceInDays(new Date(), submitted);
    });

    const avgCurrentAge = currentAging.length > 0
      ? Math.round(currentAging.reduce((a, b) => a + b, 0) / currentAging.length)
      : 0;

    // Aging buckets for open warranties
    const agingBuckets = [
      { label: "0-7 days", min: 0, max: 7, count: 0, color: "#22c55e" },
      { label: "8-14 days", min: 8, max: 14, count: 0, color: "#eab308" },
      { label: "15-30 days", min: 15, max: 30, count: 0, color: "#f97316" },
      { label: "30+ days", min: 31, max: Infinity, count: 0, color: "#ef4444" },
    ];

    openWarranties.forEach((w) => {
      const age = differenceInDays(new Date(), parseISO(w.date_submitted));
      const bucket = agingBuckets.find((b) => age >= b.min && age <= b.max);
      if (bucket) bucket.count++;
    });

    // By Status - average days in current status
    const byStatus = WARRANTY_STATUSES.filter(
      (s) => s.value !== "completed" && s.value !== "denied"
    ).map((s) => {
      const filtered = openWarranties.filter((w) => w.status === s.value);
      const avgDaysInStatus = filtered.length > 0
        ? Math.round(
            filtered.reduce((sum, w) => {
              return sum + differenceInDays(new Date(), parseISO(w.last_status_change_at));
            }, 0) / filtered.length
          )
        : 0;
      return {
        name: s.label,
        value: s.value,
        avgDays: avgDaysInStatus,
        count: filtered.length,
      };
    });

    return {
      overallAvg,
      byPriority,
      byRoofType,
      avgCurrentAge,
      agingBuckets,
      byStatus,
      totalCompleted: completedWarranties.length,
      totalOpen: openWarranties.length,
    };
  }, [warranties]);

  if (isLoading) {
    return <div className="text-center py-8">Loading report...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Resolution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agingMetrics.overallAvg} days</div>
            <p className="text-xs text-muted-foreground">
              Based on {agingMetrics.totalCompleted} completed warranties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Current Age</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agingMetrics.avgCurrentAge} days</div>
            <p className="text-xs text-muted-foreground">
              {agingMetrics.totalOpen} open warranties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Priority Avg</CardTitle>
            <BarChart3 className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {agingMetrics.byPriority.find((p) => p.value === "emergency")?.avgDays || 0} days
            </div>
            <p className="text-xs text-muted-foreground">
              {agingMetrics.byPriority.find((p) => p.value === "emergency")?.count || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Common Roof</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {agingMetrics.byRoofType.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {agingMetrics.byRoofType.sort((a, b) => b.count - a.count)[0]?.name}
                </div>
                <p className="text-xs text-muted-foreground">
                  {agingMetrics.byRoofType.sort((a, b) => b.count - a.count)[0]?.count} warranties
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Buckets Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Warranties by Age</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={agingChartConfig} className="h-64 w-full aspect-auto">
              <BarChart data={agingMetrics.agingBuckets} layout="vertical">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" width={80} tickLine={false} axisLine={false} />
                <ChartTooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }} content={<ChartTooltipContent />} />
                <Bar dataKey="count" name="count" radius={[0, 6, 6, 0]}>
                  {agingMetrics.agingBuckets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Resolution Time by Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avg. Resolution Time by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={agingChartConfig} className="h-64 w-full aspect-auto">
              <BarChart data={agingMetrics.byPriority}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  content={<ChartTooltipContent formatter={(value) => `${value} days`} />}
                />
                <Bar dataKey="avgDays" name="avgDays" radius={[6, 6, 0, 0]}>
                  {agingMetrics.byPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Resolution Time by Roof Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avg. Resolution Time by Roof Type</CardTitle>
          </CardHeader>
          <CardContent>
            {agingMetrics.byRoofType.length === 0 ? (
              <EmptyState
                icon={Home}
                title="No completed warranties"
                description="Once warranties are closed out, average resolution times by roof type will appear here."
                tone="slate"
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {agingMetrics.byRoofType.map((roof) => (
                  <div key={roof.value} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{roof.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({roof.count} completed)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.min((roof.avgDays / (agingMetrics.overallAvg * 2)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {roof.avgDays} days
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time in Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avg. Days in Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            {agingMetrics.byStatus.filter((s) => s.count > 0).length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No open warranties"
                description="All caught up — nothing sitting in an active status right now."
                tone="emerald"
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {agingMetrics.byStatus
                  .filter((s) => s.count > 0)
                  .sort((a, b) => b.avgDays - a.avgDays)
                  .map((status) => (
                    <div key={status.value} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{status.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({status.count} open)
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          status.avgDays >= 7 ? "text-destructive" : ""
                        }`}
                      >
                        {status.avgDays} days
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}