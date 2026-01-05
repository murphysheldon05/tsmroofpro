import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RequestType {
  id: string;
  value: string;
  label: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useRequestTypes() {
  return useQuery({
    queryKey: ["request-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_types")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as RequestType[];
    },
  });
}

export function useCreateRequestType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestType: {
      value: string;
      label: string;
      description?: string;
      icon?: string;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("request_types")
        .insert(requestType)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-types"] });
      toast.success("Request type added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add request type: " + error.message);
    },
  });
}

export function useUpdateRequestType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      value?: string;
      label?: string;
      description?: string | null;
      icon?: string | null;
      sort_order?: number;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("request_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-types"] });
      toast.success("Request type updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update request type: " + error.message);
    },
  });
}
