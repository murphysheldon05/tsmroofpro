import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OverrideTracking {
  id: string;
  sales_rep_id: string;
  approved_commission_count: number;
  override_phase_complete: boolean;
  manually_adjusted_by: string | null;
  manually_adjusted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagerOverride {
  id: string;
  commission_id: string;
  sales_rep_id: string;
  sales_manager_id: string;
  commission_number: number;
  net_profit: number;
  override_percentage: number;
  override_amount: number;
  created_at: string;
}

export function useRepOverrideTracking(repId?: string) {
  const { user } = useAuth();
  const targetId = repId || user?.id;

  return useQuery({
    queryKey: ["override-tracking", targetId],
    queryFn: async () => {
      if (!targetId) return null;
      const { data, error } = await supabase
        .from("sales_rep_override_tracking")
        .select("*")
        .eq("sales_rep_id", targetId)
        .maybeSingle();
      if (error) throw error;
      return data as OverrideTracking | null;
    },
    enabled: !!targetId,
  });
}

export function useManagerOverrides(filters?: { managerId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ["manager-overrides", filters],
    queryFn: async () => {
      let query = supabase
        .from("sales_manager_overrides")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.managerId) {
        query = query.eq("sales_manager_id", filters.managerId);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ManagerOverride[];
    },
  });
}

export function useAllOverrideTrackings() {
  return useQuery({
    queryKey: ["all-override-trackings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_rep_override_tracking")
        .select("*");
      if (error) throw error;
      return data as OverrideTracking[];
    },
  });
}

export function useUpdateOverrideCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ repId, count }: { repId: string; count: number }) => {
      // Upsert
      const { data: existing } = await supabase
        .from("sales_rep_override_tracking")
        .select("id")
        .eq("sales_rep_id", repId)
        .maybeSingle();

      const { data: { user } } = await supabase.auth.getUser();

      if (existing) {
        const { error } = await supabase
          .from("sales_rep_override_tracking")
          .update({
            approved_commission_count: count,
            override_phase_complete: count >= 10,
            manually_adjusted_by: user?.id,
            manually_adjusted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("sales_rep_id", repId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sales_rep_override_tracking")
          .insert({
            sales_rep_id: repId,
            approved_commission_count: count,
            override_phase_complete: count >= 10,
            manually_adjusted_by: user?.id,
            manually_adjusted_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["override-tracking"] });
      qc.invalidateQueries({ queryKey: ["all-override-trackings"] });
    },
  });
}
