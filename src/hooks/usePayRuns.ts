import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCurrentPayRunPeriod,
  getNextPayRunPeriod,
  type PayRunPeriod,
} from "@/lib/commissionPayDateCalculations";

export interface PayRun {
  id: string;
  run_date: string;
  period_start: string;
  period_end: string;
  submission_deadline: string;
  revision_deadline: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

/**
 * Ensure a pay run exists for the given period_start (Saturday).
 * Uses the DB function get_or_create_pay_run_for_period() for atomic upsert.
 * Returns the pay_run_id.
 */
export async function ensurePayRunExists(periodStart: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_pay_run_for_period", {
    p_period_start: periodStart,
  });
  if (error) throw error;
  return data as string;
}

export function useCurrentPayRun() {
  return useQuery({
    queryKey: ["pay-run", "current"],
    queryFn: async () => {
      const period = getCurrentPayRunPeriod();
      const payRunId = await ensurePayRunExists(period.periodStart);
      const { data, error } = await supabase
        .from("commission_pay_runs")
        .select("*")
        .eq("id", payRunId)
        .single();
      if (error) throw error;
      return data as PayRun;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useNextPayRun() {
  return useQuery({
    queryKey: ["pay-run", "next"],
    queryFn: async () => {
      const period = getNextPayRunPeriod();
      const payRunId = await ensurePayRunExists(period.periodStart);
      const { data, error } = await supabase
        .from("commission_pay_runs")
        .select("*")
        .eq("id", payRunId)
        .single();
      if (error) throw error;
      return data as PayRun;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePayRunList() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["pay-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_pay_runs")
        .select("*")
        .order("period_start", { ascending: false })
        .limit(52); // ~1 year of pay runs
      if (error) throw error;
      return (data || []) as PayRun[];
    },
    enabled: isAdmin,
  });
}

export function usePayRunCommissions(payRunId: string | undefined) {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["pay-run-commissions", payRunId],
    queryFn: async () => {
      if (!payRunId) return [];
      const { data, error } = await supabase
        .from("commission_documents")
        .select("*")
        .eq("pay_run_id", payRunId)
        .neq("status", "draft")
        .order("submitted_at", { ascending: true, nullsFirst: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((d: any) => d.created_by).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profileMap = (profiles || []).reduce((acc: Record<string, string>, p: any) => {
          acc[p.id] = p.full_name || p.email || "Unknown";
          return acc;
        }, {});
      }

      return (data || []).map((d: any) => ({
        ...d,
        rep_name: d.sales_rep || profileMap[d.created_by] || "Unknown",
      }));
    },
    enabled: isAdmin && !!payRunId,
  });
}
