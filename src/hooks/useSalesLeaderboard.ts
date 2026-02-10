import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, startOfYear, format } from "date-fns";

export type LeaderboardTab = "sales" | "profit" | "commissions";
export type TimeRange = "week" | "month" | "ytd" | "custom";

export interface LeaderboardEntry {
  repId: string;
  repName: string;
  total: number;
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

export function useSalesLeaderboard(tab: LeaderboardTab, range: TimeRange, customStart?: string, customEnd?: string) {
  const { start, end } = getDateRange(range, customStart, customEnd);

  return useQuery({
    queryKey: ["sales-leaderboard", tab, range, start, end],
    queryFn: async () => {
      if (tab === "sales") {
        // Sales tab: sum gross_contract_total from commission_documents for approved/paid
        const { data, error } = await supabase
          .from("commission_documents")
          .select("sales_rep, sales_rep_id, gross_contract_total, job_date, status")
          .gte("job_date", start)
          .lte("job_date", end)
          .in("status", ["manager_approved", "accounting_approved", "paid", "approved"]);

        if (error) throw error;

        const { data: allReps, error: repsError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("employee_status", "active");
        if (repsError) throw repsError;

        const { data: roles } = await supabase.from("user_roles").select("user_id, role");
        const salesRoles = new Set(["employee", "manager", "admin"]);
        const salesRepIds = new Set((roles || []).filter(r => salesRoles.has(r.role)).map(r => r.user_id));

        const repTotals = new Map<string, { name: string; total: number }>();
        (allReps || []).forEach(rep => {
          if (salesRepIds.has(rep.id)) {
            repTotals.set(rep.id, { name: rep.full_name || "Unknown", total: 0 });
          }
        });

        (data || []).forEach(doc => {
          const repId = doc.sales_rep_id;
          if (!repId) return;
          const value = Number(doc.gross_contract_total || 0);
          const existing = repTotals.get(repId);
          if (existing) {
            existing.total += value;
          } else {
            repTotals.set(repId, { name: doc.sales_rep || "Unknown", total: value });
          }
        });

        return Array.from(repTotals.entries())
          .map(([repId, { name, total }]) => ({ repId, repName: name, total }))
          .sort((a, b) => b.total - a.total);
      }

      // Profit & Commissions tabs (existing logic)
      const { data, error } = await supabase
        .from("commission_documents")
        .select("sales_rep, sales_rep_id, company_profit, rep_commission, job_date, status")
        .gte("job_date", start)
        .lte("job_date", end)
        .in("status", ["manager_approved", "accounting_approved", "paid", "approved"]);

      if (error) throw error;

      const { data: allReps, error: repsError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("employee_status", "active");
      if (repsError) throw repsError;

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const salesRoles = new Set(["employee", "manager", "admin"]);
      const salesRepIds = new Set((roles || []).filter(r => salesRoles.has(r.role)).map(r => r.user_id));

      const repTotals = new Map<string, { name: string; total: number }>();
      (allReps || []).forEach(rep => {
        if (salesRepIds.has(rep.id)) {
          repTotals.set(rep.id, { name: rep.full_name || "Unknown", total: 0 });
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
          repTotals.set(repId, { name: doc.sales_rep || "Unknown", total: Number(value) });
        }
      });

      return Array.from(repTotals.entries())
        .map(([repId, { name, total }]) => ({ repId, repName: name, total }))
        .sort((a, b) => b.total - a.total);
    },
    refetchInterval: 60000,
  });
}

export function useLeaderboardSetting() {
  return useQuery({
    queryKey: ["app-settings", "show_sales_leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "show_sales_leaderboard")
        .maybeSingle();
      if (error) throw error;
      return data?.setting_value === true || data?.setting_value === "true";
    },
  });
}
