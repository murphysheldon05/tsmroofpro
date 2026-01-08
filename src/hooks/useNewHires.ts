import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NewHire {
  id: string;
  full_name: string;
  phone_number: string | null;
  personal_email: string;
  status: string;
  required_access: string[];
  notes: string | null;
  submitted_by: string;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useNewHires() {
  return useQuery({
    queryKey: ["new-hires"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("new_hires")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NewHire[];
    },
  });
}

export function useCreateNewHire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newHire: {
      full_name: string;
      phone_number?: string;
      personal_email: string;
      required_access: string[];
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("new_hires")
        .insert({
          ...newHire,
          submitted_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-hires"] });
      toast.success("New hire submitted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to submit new hire: " + error.message);
    },
  });
}

export function useUpdateNewHireStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData: any = { status };
      if (status === "completed" || status === "in_progress") {
        updateData.processed_by = user.id;
        if (status === "completed") {
          updateData.processed_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("new_hires")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-hires"] });
      toast.success("Status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });
}

export function useDeleteNewHire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("new_hires")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-hires"] });
      toast.success("New hire deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });
}
