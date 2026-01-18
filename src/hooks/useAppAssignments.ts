import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppAssignment = Database["public"]["Tables"]["app_assignments"]["Row"];
type AppAssignmentInsert = Database["public"]["Tables"]["app_assignments"]["Insert"];
type AppAssignmentUpdate = Database["public"]["Tables"]["app_assignments"]["Update"];

export interface AppAssignmentWithDetails extends AppAssignment {
  applications?: { app_name: string; category: string } | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

export function useAppAssignments() {
  return useQuery({
    queryKey: ["app-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_assignments")
        .select(`
          *,
          applications(app_name, category),
          profiles(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AppAssignmentWithDetails[];
    },
  });
}

export function useAppAssignmentsByEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["app-assignments", "employee", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("app_assignments")
        .select(`
          *,
          applications(app_name, category, status)
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
}

export function useAppAssignmentsByApp(appId: string | undefined) {
  return useQuery({
    queryKey: ["app-assignments", "app", appId],
    queryFn: async () => {
      if (!appId) return [];
      const { data, error } = await supabase
        .from("app_assignments")
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq("app_id", appId)
        .order("assignment_role");

      if (error) throw error;
      return data;
    },
    enabled: !!appId,
  });
}

export function useCreateAppAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: AppAssignmentInsert) => {
      const { data, error } = await supabase
        .from("app_assignments")
        .insert(assignment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-assignments"] });
      toast.success("Assignment created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });
}

export function useUpdateAppAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AppAssignmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("app_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-assignments"] });
      toast.success("Assignment updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });
}

export function useUpsertAppAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignments: AppAssignmentInsert[]) => {
      // For each assignment, try to find existing by employee_id + app_id + assignment_role
      const results = [];
      for (const assignment of assignments) {
        const { data: existing } = await supabase
          .from("app_assignments")
          .select("id")
          .eq("employee_id", assignment.employee_id)
          .eq("app_id", assignment.app_id)
          .eq("assignment_role", assignment.assignment_role)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { data, error } = await supabase
            .from("app_assignments")
            .update(assignment)
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw error;
          results.push(data);
        } else {
          // Insert new
          const { data, error } = await supabase
            .from("app_assignments")
            .insert(assignment)
            .select()
            .single();
          if (error) throw error;
          results.push(data);
        }
      }
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["app-assignments"] });
      toast.success(`Imported ${data?.length || 0} assignments`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to import assignments: ${error.message}`);
    },
  });
}
