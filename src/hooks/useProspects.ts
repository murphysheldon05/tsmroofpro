import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Prospect {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  prospect_type: "subcontractor" | "vendor";
  trade_vendor_type: string | null;
  source: "inbound_call" | "referral" | "jobsite_meet" | "other";
  stage: "new" | "contacted" | "waiting_docs" | "trial_job" | "approved" | "not_a_fit";
  notes: string | null;
  next_followup_date: string | null;
  assigned_owner: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type ProspectInsert = Omit<Prospect, "id" | "created_at" | "updated_at">;
type ProspectUpdate = Partial<ProspectInsert>;

export function useProspects() {
  return useQuery({
    queryKey: ["prospects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Prospect[];
    },
  });
}

export function useProspect(id: string | undefined) {
  return useQuery({
    queryKey: ["prospect", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Prospect;
    },
    enabled: !!id,
  });
}

export function useCreateProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prospect: ProspectInsert) => {
      const { data, error } = await supabase
        .from("prospects")
        .insert(prospect as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ProspectUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("prospects")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
}

export function useDeleteProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
}
