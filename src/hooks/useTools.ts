import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Tool {
  id: string;
  name: string;
  description: string | null;
  url: string;
  category: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  ios_app_url: string | null;
  android_app_url: string | null;
  training_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useTools() {
  return useQuery({
    queryKey: ["tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Tool[];
    },
  });
}

export function useCreateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tool: {
      name: string;
      description?: string;
      url: string;
      category: string;
      icon?: string;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("tools")
        .insert(tool)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast.success("Tool added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add tool: " + error.message);
    },
  });
}

export function useUpdateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string | null;
      url?: string;
      category?: string;
      icon?: string | null;
      sort_order?: number;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("tools")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast.success("Tool updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update tool: " + error.message);
    },
  });
}
