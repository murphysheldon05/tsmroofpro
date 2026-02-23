import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDisplayName } from "@/lib/displayName";
import { startOfWeek, startOfMonth, startOfYear, format } from "date-fns";

export type LeaderboardTab = "sales" | "profit" | "commissions";
export type TimeRange = "week" | "month" | "ytd" | "custom";

export interface LeaderboardEntry {
  repId: string;
  repName: string;
  repColor?: string;
  total: number;
}

export interface LatestPayRunInfo {
  id: string;
  run_date: string;
}

function getDateRange(range: TimeRange, customStart?: string, customEnd?: string) {
  const now = new Date();
  switch (range) {
    case "week":
      return { start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    case "month":
      return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    case "ytd":
      return { start: format(startOfYear(now), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    case "custom":
      return { start: customStart || format(startOfMonth(now), "yyyy-MM-dd"), end: customEnd || format(now, "yyyy-MM-dd") };
  }
}

// Fetch the latest completed pay run
export function useLatestCompletedPayRun() {
  return useQuery({
    queryKey: ["latest-completed-pay-run"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_pay_runs")
        .select("id, run_date")
        .eq("status", "completed")
        .order("run_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LatestPayRunInfo | null;
    },
  });
}

// Fetch commission/profit leaderboard from commission_entries for a specific pay run
export function usePayRunLeaderboard(tab: "commissions" | "profit", payRunId: string | null) {
  return useQuery({
    queryKey: ["pay-run-leaderboard", tab, payRunId],
    enabled: !!payRunId,
    queryFn: async () => {
      if (!payRunId) return [] as LeaderboardEntry[];

      // Get entries for this pay run
      const { data: entries, error } = await supabase
        .from("commission_entries")
        .select("rep_id, amount_paid, job_value, pay_type_id")
        .eq("pay_run_id", payRunId);
      if (error) throw error;

      // Get commission pay type for filtering
      const { data: payTypes } = await supabase
        .from("commission_pay_types")
        .select("id, name");
      const commissionTypeId = payTypes?.find((pt) => pt.name === "Commission")?.id;

      // Get reps for names/colors
      const repIds = [...new Set((entries || []).map((e) => e.rep_id))];
      if (repIds.length === 0) return [] as LeaderboardEntry[];
      const { data: reps } = await supabase
        .from("commission_reps")
        .select("id, name, color")
        .in("id", repIds);
      const repMap = new Map((reps || []).map((r) => [r.id, r]));

      // Aggregate by rep
      const totals = new Map<string, number>();
      (entries || []).forEach((e) => {
        if (tab === "commissions") {
          // Only Commission-type entries
          if (e.pay_type_id === commissionTypeId) {
            totals.set(e.rep_id, (totals.get(e.rep_id) || 0) + (e.amount_paid || 0));
          }
        } else {
          // Profit = job_value for Commission-type entries
          if (e.pay_type_id === commissionTypeId && e.job_value) {
            totals.set(e.rep_id, (totals.get(e.rep_id) || 0) + e.job_value);
          }
        }
      });

      const result: LeaderboardEntry[] = Array.from(totals.entries())
        .map(([repId, total]) => {
          const rep = repMap.get(repId);
          return { repId, repName: rep?.name || "Unknown", repColor: rep?.color, total };
        })
        .filter((e) => e.total > 0)
        .sort((a, b) => b.total - a.total);

      return result;
    },
    refetchInterval: 60000,
  });
}

// Personal commission stats for the logged-in user
export function usePersonalCommissionStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["personal-commission-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;

      // Find linked rep
      const { data: rep } = await supabase
        .from("commission_reps")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!rep) return null;

      // Get all entries for this rep
      const { data: entries } = await supabase
        .from("commission_entries")
        .select("amount_paid, applied_bank, pay_type_id, pay_run_id, paid_date")
        .eq("rep_id", rep.id);

      // Get commission type id
      const { data: payTypes } = await supabase
        .from("commission_pay_types")
        .select("id, name");
      const commissionTypeId = payTypes?.find((pt) => pt.name === "Commission")?.id;

      // Get completed pay run ids for current year
      const yearStart = format(startOfYear(new Date()), "yyyy-MM-dd");
      const { data: completedRuns } = await supabase
        .from("commission_pay_runs")
        .select("id")
        .eq("status", "completed")
        .gte("run_date", yearStart);
      const completedRunIds = new Set((completedRuns || []).map((r) => r.id));

      // Get user's commission submissions
      const { data: submissions } = await supabase
        .from("commission_submissions")
        .select("commission_requested, commission_approved, status")
        .eq("submitted_by", userId);

      const submitted = (submissions || []).reduce((s, sub) => s + (sub.commission_requested || 0), 0);
      const approved = (submissions || []).reduce((s, sub) => {
        if (["approved", "paid"].includes(sub.status)) {
          return s + (sub.commission_approved || sub.commission_requested || 0);
        }
        return s;
      }, 0);

      // YTD paid from completed pay runs
      const ytdPaid = (entries || [])
        .filter((e) => e.pay_run_id && completedRunIds.has(e.pay_run_id))
        .reduce((s, e) => s + e.amount_paid, 0);

      // Draw balance
      const drawBalance = (entries || []).reduce((s, e) => s + (e.applied_bank || 0), 0);

      return { submitted, approved, ytdPaid, drawBalance, hasLinkedRep: true };
    },
    refetchInterval: 60000,
  });
}

export function useSalesLeaderboard(tab: LeaderboardTab, range: TimeRange, customStart?: string, customEnd?: string) {
  const { start, end } = getDateRange(range, customStart, customEnd);

  return useQuery({
    queryKey: ["sales-leaderboard", tab, range, start, end],
    queryFn: async () => {
      if (tab === "sales") {
        try {
          const { data, error } = await supabase.functions.invoke("acculynx-sales-leaderboard", {
            body: { startDate: start, endDate: end },
          });

          if (error) {
            console.error("AccuLynx fetch error:", error);
            return { entries: [] as LeaderboardEntry[], acculynxNotConfigured: false, acculynxError: true };
          }

          if (data?.error === "acculynx_not_configured") {
            return { entries: [] as LeaderboardEntry[], acculynxNotConfigured: true, acculynxError: false };
          }

          if (!data?.success) {
            console.error("AccuLynx data error:", data?.error);
            return { entries: [] as LeaderboardEntry[], acculynxNotConfigured: false, acculynxError: true };
          }

          return {
            entries: (data.entries || []) as LeaderboardEntry[],
            acculynxNotConfigured: false,
            acculynxError: false,
          };
        } catch (err) {
          console.error("AccuLynx exception:", err);
          return { entries: [] as LeaderboardEntry[], acculynxNotConfigured: false, acculynxError: true };
        }
      }

      // For profit & commissions in "sales" leaderboard context (legacy path - used when time range filters are active)
      const { data, error } = await supabase
        .from("commission_documents")
        .select("sales_rep, sales_rep_id, company_profit, rep_commission, job_date, status")
        .gte("job_date", start)
        .lte("job_date", end)
        .in("status", ["manager_approved", "accounting_approved", "paid", "approved"]);

      if (error) throw error;

      const { data: allReps, error: repsError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("employee_status", "active");
      if (repsError) throw repsError;

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const salesRoles = new Set(["sales_rep", "sales_manager", "employee", "manager", "admin"]);
      const salesRepIds = new Set((roles || []).filter(r => salesRoles.has(r.role)).map(r => r.user_id));

      const repTotals = new Map<string, { name: string; total: number }>();
      (allReps || []).forEach(rep => {
        if (salesRepIds.has(rep.id)) {
          repTotals.set(rep.id, { name: formatDisplayName(rep.full_name, rep.email) || "Unknown", total: 0 });
        }
      });

      (data || []).forEach(doc => {
        const repId = doc.sales_rep_id;
        if (!repId) return;
        const value = tab === "profit" ? (doc.company_profit || 0) : (doc.rep_commission || 0);
        const existing = repTotals.get(repId);
        if (existing) {
          existing.total += Number(value);
        } else {
          const repProfile = allReps?.find(r => r.id === repId);
          repTotals.set(repId, {
            name: formatDisplayName(repProfile?.full_name ?? doc.sales_rep, repProfile?.email) || "Unknown",
            total: Number(value),
          });
        }
      });

      const entries: LeaderboardEntry[] = Array.from(repTotals.entries())
        .map(([repId, { name, total }]) => ({ repId, repName: name, total }))
        .sort((a, b) => b.total - a.total);

      return { entries, acculynxNotConfigured: false, acculynxError: false };
    },
    refetchInterval: 60000,
  });
}

export function useLeaderboardSetting(key: string = "show_sales_leaderboard") {
  return useQuery({
    queryKey: ["app-settings", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", key)
        .maybeSingle();
      if (error) throw error;
      if (!data) return false; // Default OFF (leaderboard hidden until AccuLynx API is confirmed)
      return data.setting_value === true || data.setting_value === "true";
    },
  });
}
