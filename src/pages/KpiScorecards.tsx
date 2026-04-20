import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ArrowRight } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  getAccessibleWeeklyKpiCards,
  isWeeklyKpiManagerRole,
} from "@/lib/weeklyKpiAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCurrentWeekStartDate,
  getCurrentWeekEndDate,
} from "@/lib/weeklyScorecardConfig";
import {
  useMarkRollupPaid,
  useMonthlyRollups,
  useRunMonthlyRollup,
} from "@/hooks/useWeeklyKpiScorecards";

export default function KpiScorecards() {
  const { role, user } = useAuth();
  const weekStart = getCurrentWeekStartDate();
  const weekEnd = getCurrentWeekEndDate(weekStart);
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
  const isAdmin = role === "admin";
  const isManagerLike = isWeeklyKpiManagerRole(role);
  const accessibleCards = getAccessibleWeeklyKpiCards({
    role,
    fullName: profile?.full_name,
    email: profile?.email ?? user?.email,
  });
  const { data: weeklyEntries = [] } = useQuery({
    queryKey: ["weekly-kpi-hub-entries", weekStart],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("kpi_scorecard_entries")
        .select("*")
        .eq("week_start_date", weekStart);
      if (error) throw error;
      return data ?? [];
    },
  });
  const monthYear = new Date().toISOString().slice(0, 7);
  const { data: monthlyRollups = [] } = useMonthlyRollups(monthYear);
  const runMonthlyRollup = useRunMonthlyRollup();
  const markRollupPaid = useMarkRollupPaid();

  if (accessibleCards.length === 0) {
    return <Navigate to="/command-center" replace />;
  }

  const getCardStatus = (card: (typeof accessibleCards)[number]) => {
    const match = weeklyEntries.find((entry: any) => {
      if (card.assignedRoles?.includes("sales_rep")) {
        return entry.scorecard_role === "sales_rep" && entry.assigned_user_id === user?.id;
      }

      return entry.scorecard_role === card.key;
    });

    if (match) return "Scored";
    return isManagerLike ? "Pending" : "Not Yet Scored";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex items-start gap-4 rounded-[18px] border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">
            KPI Scorecards
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Current week: {weekStart} to {weekEnd}.
          </p>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            {isAdmin
              ? "Admin access: all scorecards"
              : isManagerLike
              ? "Manager access: all scorecards"
              : "Assigned access only"}
          </Badge>
        </div>
      </header>

      <Tabs defaultValue="weekly" className="space-y-6">
        <TabsList>
          <TabsTrigger value="weekly">Weekly Scorecards</TabsTrigger>
          {isAdmin && <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>}
        </TabsList>

        <TabsContent value="weekly">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {accessibleCards.map((card) => (
              <Card
                key={card.href}
                className="overflow-hidden border-border/70 bg-card shadow-sm"
              >
                <div className="bg-[#1A1A1A] px-5 py-4">
                  <h2 className="text-lg font-bold text-white">
                    {!isManagerLike && accessibleCards.length === 1
                      ? "My Weekly Scorecard"
                      : card.title}
                  </h2>
                </div>
                <CardContent className="space-y-5 p-5">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {!isManagerLike && accessibleCards.length === 1
                        ? `${card.subtitle} · ${getCardStatus(card)}`
                        : card.subtitle}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-[#00D26A]/40 bg-[#00D26A]/10 text-[#008F49]"
                    >
                      {isManagerLike
                        ? `Reviewed by: ${card.reviewedBy}`
                        : `Status: ${getCardStatus(card)}`}
                    </Badge>
                  </div>

                  <Button
                    asChild
                    className="w-full bg-[#00D26A] text-[#0B0B0B] hover:bg-[#00BD61]"
                  >
                    <Link to={card.href}>
                      {isManagerLike ? "Score This Week" : "View My Scorecard"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="monthly" className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/80 p-4">
              <div>
                <h2 className="text-lg font-semibold">Monthly Summary</h2>
                <p className="text-sm text-muted-foreground">
                  Rollups for {monthYear}. Generate again to refresh after new submissions.
                </p>
              </div>
              <Button
                onClick={() => runMonthlyRollup.mutate(monthYear)}
                disabled={runMonthlyRollup.isPending}
              >
                {runMonthlyRollup.isPending ? "Generating..." : "Generate Rollup"}
              </Button>
            </div>

            <div className="grid gap-4">
              {monthlyRollups.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No monthly rollups generated yet.
                  </CardContent>
                </Card>
              ) : (
                monthlyRollups.map((rollup) => (
                  <Card key={rollup.id} className="border-border/70">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold">{rollup.employee_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {rollup.scorecard_role} · Weeks Submitted: {rollup.weeks_submitted}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {rollup.bonus_status === "paid"
                            ? "Paid"
                            : rollup.bonus_status === "no_bonus"
                            ? "No Bonus"
                            : "Pending Payment"}
                        </Badge>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div>
                          <div className="text-xs uppercase text-muted-foreground">Monthly Avg %</div>
                          <div className="font-semibold">
                            {rollup.monthly_avg_pct != null ? `${Number(rollup.monthly_avg_pct).toFixed(1)}%` : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-muted-foreground">Monthly Rating</div>
                          <div className="font-semibold">
                            {rollup.monthly_avg_rating != null
                              ? `${Number(rollup.monthly_avg_rating).toFixed(2)} · ${rollup.monthly_rating_label ?? ""}`
                              : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-muted-foreground">Bonus Tier</div>
                          <div className="font-semibold">{rollup.bonus_tier_label ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-muted-foreground">Bonus Earned</div>
                          <div className="font-semibold">${Number(rollup.bonus_amount ?? 0).toFixed(0)}</div>
                        </div>
                      </div>

                      {rollup.weekly_breakdown && rollup.weekly_breakdown.length > 0 && (
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                          <div className="mb-2 font-medium">Week-by-week breakdown</div>
                          <div className="space-y-2">
                            {rollup.weekly_breakdown.map((item, index) => {
                              const row = item as Record<string, unknown>;
                              return (
                                <div key={`${rollup.id}-${index}`} className="flex flex-wrap items-center justify-between gap-2">
                                  <span>{String(row.week_start_date ?? "Week")}</span>
                                  <span className="text-muted-foreground">
                                    {row.compliance_pct != null
                                      ? `${row.compliance_pct}%`
                                      : row.average_score != null
                                      ? `Rating ${row.average_score}`
                                      : "—"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {rollup.bonus_status !== "paid" && Number(rollup.bonus_amount ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {["check", "direct deposit", "other"].map((method) => (
                            <Button
                              key={method}
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                markRollupPaid.mutate({
                                  rollupId: rollup.id,
                                  paymentMethod: method,
                                })
                              }
                              disabled={markRollupPaid.isPending}
                            >
                              Mark Paid: {method}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
