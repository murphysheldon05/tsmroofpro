import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Policy {
  id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policies")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Policy[];
    },
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policy: Omit<Policy, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("policies")
        .insert(policy)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create policy: " + error.message);
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Policy> & { id: string }) => {
      const { data, error } = await supabase
        .from("policies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update policy: " + error.message);
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete policy: " + error.message);
    },
  });
}
