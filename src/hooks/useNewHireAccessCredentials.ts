import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NewHireAccessCredential {
  id: string;
  new_hire_id: string;
  access_type: string;
  email: string | null;
  password: string | null;
  invite_sent: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useNewHireAccessCredentials(newHireId: string) {
  return useQuery({
    queryKey: ["new-hire-access-credentials", newHireId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("new_hire_access_credentials")
        .select("*")
        .eq("new_hire_id", newHireId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as NewHireAccessCredential[];
    },
    enabled: !!newHireId,
  });
}

export function useUpsertAccessCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credential: {
      new_hire_id: string;
      access_type: string;
      email?: string;
      password?: string;
      invite_sent?: boolean;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("new_hire_access_credentials")
        .upsert(
          {
            ...credential,
            created_by: user.id,
          },
          {
            onConflict: "new_hire_id,access_type",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["new-hire-access-credentials", variables.new_hire_id] });
      toast.success("Access credential saved");
    },
    onError: (error: Error) => {
      toast.error("Failed to save credential: " + error.message);
    },
  });
}

export function useDeleteAccessCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newHireId }: { id: string; newHireId: string }) => {
      const { error } = await supabase
        .from("new_hire_access_credentials")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return newHireId;
    },
    onSuccess: (newHireId) => {
      queryClient.invalidateQueries({ queryKey: ["new-hire-access-credentials", newHireId] });
      toast.success("Credential removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });
}
