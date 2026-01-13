import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Vendor {
  id: string;
  vendor_name: string;
  primary_contact_name: string;
  phone: string;
  email: string;
  vendor_type: "supplier" | "dump" | "equipment_rental" | "safety" | "marketing" | "other";
  service_areas: string[];
  status: "active" | "on_hold" | "do_not_use";
  account_number: string | null;
  preferred_contact_method: "call" | "text" | "email" | null;
  notes: string | null;
  coi_status: "received" | "missing" | null;
  coi_expiration_date: string | null;
  w9_status: "received" | "missing" | null;
  ic_agreement_status: "received" | "missing" | null;
  last_requested_date: string | null;
  last_received_date: string | null;
  requested_docs: string[] | null;
  docs_due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

type VendorInsert = Omit<Vendor, "id" | "created_at" | "updated_at">;
type VendorUpdate = Partial<VendorInsert>;

export function useVendors() {
  return useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("vendor_name");
      if (error) throw error;
      return data as Vendor[];
    },
  });
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Vendor;
    },
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: VendorInsert) => {
      const { data, error } = await supabase
        .from("vendors")
        .insert(vendor as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: VendorUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("vendors")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}
