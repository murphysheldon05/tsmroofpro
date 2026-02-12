import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Subcontractor {
  id: string;
  company_name: string;
  primary_contact_name: string;
  phone: string;
  email: string;
  trade_type: "roofing" | "tile" | "shingle" | "foam" | "coatings" | "metal" | "gutters" | "drywall" | "paint" | "other";
  service_areas: string[];
  status: "active" | "on_hold" | "do_not_use";
  internal_rating: number | null;
  notes: string | null;
  coi_status: "received" | "missing";
  coi_expiration_date: string | null;
  w9_status: "received" | "missing";
  ic_agreement_status: "received" | "missing";
  last_requested_date: string | null;
  last_received_date: string | null;
  requested_docs: string[] | null;
  docs_due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type SubcontractorInsert = Omit<Subcontractor, "id" | "created_at" | "updated_at">;
type SubcontractorUpdate = Partial<SubcontractorInsert>;

export function useSubcontractors() {
  return useQuery({
    queryKey: ["subcontractors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcontractors")
        .select("*")
        .order("company_name");
      if (error) throw error;
      return data as Subcontractor[];
    },
  });
}

export function useSubcontractor(id: string | undefined) {
  return useQuery({
    queryKey: ["subcontractor", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("subcontractors")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Subcontractor | null;
    },
    enabled: !!id,
  });
}

export function useCreateSubcontractor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sub: SubcontractorInsert) => {
      const { data, error } = await supabase
        .from("subcontractors")
        .insert(sub as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
    },
  });
}

export function useUpdateSubcontractor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: SubcontractorUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("subcontractors")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
    },
  });
}

export function useDeleteSubcontractor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcontractors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
    },
  });
}
