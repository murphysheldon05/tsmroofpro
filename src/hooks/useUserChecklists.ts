import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type UserChecklist = Database["public"]["Tables"]["user_checklists"]["Row"];
type UserChecklistInsert = Database["public"]["Tables"]["user_checklists"]["Insert"];
type UserChecklistUpdate = Database["public"]["Tables"]["user_checklists"]["Update"];
type ChecklistItem = Database["public"]["Tables"]["checklist_items"]["Row"];
type ChecklistItemInsert = Database["public"]["Tables"]["checklist_items"]["Insert"];
type ChecklistItemUpdate = Database["public"]["Tables"]["checklist_items"]["Update"];

export interface UserChecklistWithItems extends UserChecklist {
  checklist_items?: ChecklistItem[];
  profiles?: { full_name: string | null; email: string | null } | null;
}

export function useUserChecklists() {
  return useQuery({
    queryKey: ["user-checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_checklists")
        .select(`
          *,
          profiles!user_checklists_employee_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserChecklistWithItems[];
    },
  });
}

export function useUserChecklistsByEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["user-checklists", "employee", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("user_checklists")
        .select(`
          *,
          checklist_items(*)
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserChecklistWithItems[];
    },
    enabled: !!employeeId,
  });
}

export function useChecklistItems(checklistId: string | undefined) {
  return useQuery({
    queryKey: ["checklist-items", checklistId],
    queryFn: async () => {
      if (!checklistId) return [];
      const { data, error } = await supabase
        .from("checklist_items")
        .select(`
          *,
          applications(app_name)
        `)
        .eq("checklist_id", checklistId)
        .order("due_date");

      if (error) throw error;
      return data;
    },
    enabled: !!checklistId,
  });
}

export function useMyChecklists(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-checklists", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_checklists")
        .select(`
          *,
          checklist_items(*)
        `)
        .eq("employee_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserChecklistWithItems[];
    },
    enabled: !!userId,
  });
}

export function useCreateUserChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checklist: UserChecklistInsert) => {
      const { data, error } = await supabase
        .from("user_checklists")
        .insert(checklist)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-checklists"] });
      toast.success("Checklist created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create checklist: ${error.message}`);
    },
  });
}

export function useUpdateUserChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UserChecklistUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("user_checklists")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-checklists"] });
      toast.success("Checklist updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update checklist: ${error.message}`);
    },
  });
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: ChecklistItemInsert) => {
      const { data, error } = await supabase
        .from("checklist_items")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-items"] });
      queryClient.invalidateQueries({ queryKey: ["user-checklists"] });
      toast.success("Checklist item created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create item: ${error.message}`);
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ChecklistItemUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("checklist_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-items"] });
      queryClient.invalidateQueries({ queryKey: ["user-checklists"] });
      queryClient.invalidateQueries({ queryKey: ["my-checklists"] });
      toast.success("Item updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });
}
