import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WarrantyWatcher {
  id: string;
  warranty_id: string;
  user_id: string;
  created_at: string;
}

export function useWarrantyWatchers(warrantyId: string | undefined) {
  return useQuery({
    queryKey: ["warranty-watchers", warrantyId],
    queryFn: async () => {
      if (!warrantyId) return [];
      const { data, error } = await supabase
        .from("warranty_watchers")
        .select("*")
        .eq("warranty_id", warrantyId);
      if (error) throw error;
      return data as WarrantyWatcher[];
    },
    enabled: !!warrantyId,
  });
}

export function useIsWatching(warrantyId: string | undefined) {
  const { user } = useAuth();
  const { data: watchers = [] } = useWarrantyWatchers(warrantyId);
  return watchers.some(w => w.user_id === user?.id);
}

export function useToggleWatch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ warrantyId, isWatching }: { warrantyId: string; isWatching: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isWatching) {
        const { error } = await supabase
          .from("warranty_watchers")
          .delete()
          .eq("warranty_id", warrantyId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("warranty_watchers")
          .insert({ warranty_id: warrantyId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["warranty-watchers", variables.warrantyId] });
      toast.success(variables.isWatching ? "Stopped watching" : "Now watching this warranty");
    },
    onError: (error) => {
      toast.error("Failed to update watch status: " + error.message);
    },
  });
}
