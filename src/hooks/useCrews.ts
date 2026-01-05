import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Crew {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCrews() {
  return useQuery({
    queryKey: ["crews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Crew[];
    },
  });
}

export function useCreateCrew() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (crew: { name: string; color: string }) => {
      // Get current max sort_order
      const { data: crews } = await supabase
        .from("crews")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = (crews?.[0]?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from("crews")
        .insert({ ...crew, sort_order: nextOrder })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      toast.success("Crew added");
    },
    onError: (error) => {
      toast.error("Failed to add crew: " + error.message);
    },
  });
}

export function useUpdateCrew() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string }) => {
      const { data, error } = await supabase
        .from("crews")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      toast.success("Crew updated");
    },
    onError: (error) => {
      toast.error("Failed to update crew: " + error.message);
    },
  });
}

export function useDeleteCrew() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crews")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      toast.success("Crew removed");
    },
    onError: (error) => {
      toast.error("Failed to remove crew: " + error.message);
    },
  });
}
