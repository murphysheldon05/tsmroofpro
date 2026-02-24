import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ——— Types ———

export interface CommissionRep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string;
  user_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CommissionPayType {
  id: string;
  name: string;
  badge_bg: string;
  badge_text: string;
  badge_border: string;
  sort_order: number;
  created_at: string;
}

export interface CommissionPayRun {
  id: string;
  run_date: string;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

export interface CommissionEntry {
  id: string;
  rep_id: string;
  job: string | null;
  customer: string | null;
  approved_date: string | null;
  job_value: number | null;
  amount_paid: number;
  paid_date: string;
  check_type: string | null;
  notes: string | null;
  pay_type_id: string;
  earned_comm: number | null;
  applied_bank: number | null;
  has_paid: boolean;
  pay_run_id: string | null;
  created_at: string;
}

// Enriched entry with joined data
export interface EnrichedEntry extends CommissionEntry {
  rep_name: string;
  rep_color: string;
  pay_type_name: string;
  pay_type: CommissionPayType;
}

// ——— Hooks ———

export function useCommissionReps() {
  const { user, isAdmin, isManager } = useAuth();

  return useQuery({
    queryKey: ["commission-reps", user?.id, isAdmin, isManager],
    queryFn: async () => {
      // Sales rep: only their own linked rep
      if (!isAdmin && !isManager && user) {
        const { data, error } = await supabase
          .from("commission_reps")
          .select("*")
          .eq("user_id", user.id);
        if (error) throw error;
        return (data as CommissionRep[]) || [];
      }

      // Manager-level: only reps assigned to this manager (team_assignments) + self
      if (isManager && !isAdmin && user) {
        const { data: assignments } = await supabase
          .from("team_assignments")
          .select("employee_id")
          .eq("manager_id", user.id);
        const assignedUserIds = new Set<string>([user.id]);
        assignments?.forEach((a: { employee_id: string }) => assignedUserIds.add(a.employee_id));
        const { data: profilesWithManager } = await supabase
          .from("profiles")
          .select("id")
          .eq("manager_id", user.id);
        profilesWithManager?.forEach((p: { id: string }) => assignedUserIds.add(p.id));

        const { data, error } = await supabase
          .from("commission_reps")
          .select("*")
          .in("user_id", Array.from(assignedUserIds))
          .order("name");
        if (error) throw error;
        return (data as CommissionRep[]) || [];
      }

      const { data, error } = await supabase
        .from("commission_reps")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CommissionRep[];
    },
    enabled: !!user,
  });
}

export function useCommissionPayTypes() {
  return useQuery({
    queryKey: ["commission-pay-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_pay_types")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as CommissionPayType[];
    },
  });
}

export function useCommissionPayRuns() {
  return useQuery({
    queryKey: ["commission-pay-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_pay_runs")
        .select("*")
        .order("run_date", { ascending: false });
      if (error) throw error;
      return data as CommissionPayRun[];
    },
  });
}

export function useCommissionEntries() {
  const { user, isAdmin, isManager } = useAuth();

  return useQuery({
    queryKey: ["commission-entries", user?.id, isAdmin, isManager],
    queryFn: async () => {
      // User-level: only their linked rep's entries (data isolation)
      if (!isAdmin && !isManager && user) {
        const { data: linkedRep } = await supabase
          .from("commission_reps")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (linkedRep) {
          const { data, error } = await supabase
            .from("commission_entries")
            .select("*")
            .eq("rep_id", linkedRep.id)
            .order("paid_date", { ascending: true });
          if (error) throw error;
          return data as CommissionEntry[];
        }
        return [] as CommissionEntry[];
      }

      // Manager-level: only entries for reps assigned to this manager + self (never other managers or unassigned)
      if (isManager && !isAdmin && user) {
        const { data: assignments } = await supabase
          .from("team_assignments")
          .select("employee_id")
          .eq("manager_id", user.id);
        const assignedUserIds = new Set<string>([user.id]);
        assignments?.forEach((a: { employee_id: string }) => assignedUserIds.add(a.employee_id));
        const { data: profilesWithManager } = await supabase
          .from("profiles")
          .select("id")
          .eq("manager_id", user.id);
        profilesWithManager?.forEach((p: { id: string }) => assignedUserIds.add(p.id));

        const { data: reps } = await supabase
          .from("commission_reps")
          .select("id")
          .in("user_id", Array.from(assignedUserIds));
        const repIds = (reps || []).map((r: { id: string }) => r.id);
        if (repIds.length === 0) return [] as CommissionEntry[];

        const { data, error } = await supabase
          .from("commission_entries")
          .select("*")
          .in("rep_id", repIds)
          .order("paid_date", { ascending: true });
        if (error) throw error;
        return data as CommissionEntry[];
      }

      // Admin: all entries
      const { data, error } = await supabase
        .from("commission_entries")
        .select("*")
        .order("paid_date", { ascending: true });
      if (error) throw error;
      return data as CommissionEntry[];
    },
    enabled: !!user,
  });
}

// Returns entries enriched with rep + pay type info
export function useEnrichedEntries() {
  const { data: entries, isLoading: entriesLoading } = useCommissionEntries();
  const { data: reps, isLoading: repsLoading } = useCommissionReps();
  const { data: payTypes, isLoading: typesLoading } = useCommissionPayTypes();

  const isLoading = entriesLoading || repsLoading || typesLoading;

  const enriched: EnrichedEntry[] = (!entries || !reps || !payTypes)
    ? []
    : entries.map((e) => {
        const rep = reps.find((r) => r.id === e.rep_id);
        const pt = payTypes.find((p) => p.id === e.pay_type_id);
        return {
          ...e,
          rep_name: rep?.name || "Unknown",
          rep_color: rep?.color || "#6b7280",
          pay_type_name: pt?.name || "Unknown",
          pay_type: pt || { id: e.pay_type_id, name: "Unknown", badge_bg: "#e5e7eb", badge_text: "#374151", badge_border: "#d1d5db", sort_order: 99, created_at: "" },
        };
      });

  return { data: enriched, isLoading, reps: reps || [], payTypes: payTypes || [] };
}

// ——— Mutations ———

export function useUpdateEntryPayType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pay_type_id }: { id: string; pay_type_id: string }) => {
      const { error } = await supabase
        .from("commission_entries")
        .update({ pay_type_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission-entries"] }),
  });
}

export function useCreatePayRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (run_date: string) => {
      const { data, error } = await supabase
        .from("commission_pay_runs")
        .insert({ run_date })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission-pay-runs"] }),
  });
}

export function useCompletePayRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("commission_pay_runs")
        .update({ status: "completed", completed_at: new Date().toISOString(), completed_by: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission-pay-runs"] }),
  });
}

// ——— Rep CRUD ———

const COLOR_PALETTE = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B",
  "#EF4444", "#06B6D4", "#6366F1", "#14B8A6",
  "#F97316", "#EC4899", "#84CC16", "#D946EF",
];

export function useCreateRep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rep: { name: string; email?: string; phone?: string }) => {
      // Get existing reps to determine next color
      const { data: existing } = await supabase.from("commission_reps").select("color");
      const usedColors = new Set((existing || []).map((r) => r.color));
      const color = COLOR_PALETTE.find((c) => !usedColors.has(c)) || COLOR_PALETTE[(existing || []).length % COLOR_PALETTE.length];

      const { data, error } = await supabase
        .from("commission_reps")
        .insert({ name: rep.name.toUpperCase(), email: rep.email || null, phone: rep.phone || null, color })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission-reps"] }),
  });
}

export function useUpdateRep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CommissionRep> & { id: string }) => {
      const { error } = await supabase.from("commission_reps").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission-reps"] }),
  });
}

export function useDeleteRep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commission_reps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-reps"] });
      qc.invalidateQueries({ queryKey: ["commission-entries"] });
    },
  });
}

// ——— Pay Type CRUD ———

export function useCreatePayType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pt: { name: string; badge_bg: string; badge_text: string; badge_border: string }) => {
      const { data: existing } = await supabase.from("commission_pay_types").select("sort_order").order("sort_order", { ascending: false }).limit(1);
      const nextOrder = ((existing || [])[0]?.sort_order || 0) + 1;
      const { data, error } = await supabase
        .from("commission_pay_types")
        .insert({ ...pt, sort_order: nextOrder })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission-pay-types"] }),
  });
}

export function useUpdatePayType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CommissionPayType> & { id: string }) => {
      const { error } = await supabase.from("commission_pay_types").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-pay-types"] });
      qc.invalidateQueries({ queryKey: ["commission-entries"] });
    },
  });
}

export function useDeletePayType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, replacementId }: { id: string; replacementId: string }) => {
      // Reassign entries to replacement pay type
      const { error: updateErr } = await supabase
        .from("commission_entries")
        .update({ pay_type_id: replacementId })
        .eq("pay_type_id", id);
      if (updateErr) throw updateErr;
      // Delete the pay type
      const { error } = await supabase.from("commission_pay_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-pay-types"] });
      qc.invalidateQueries({ queryKey: ["commission-entries"] });
    },
  });
}

// ——— Helpers ———

export function getRepInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function formatUSD(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

export function formatUSDCompact(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return formatUSD(amount);
}

export function slugifyRep(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
