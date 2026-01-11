import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentManager {
  id: string;
  department_id: string;
  manager_id: string;
  is_team_lead: boolean;
  created_at: string;
  created_by: string | null;
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Department[];
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (department: { name: string; description?: string | null; sort_order?: number }) => {
      const { data, error } = await supabase
        .from("departments")
        .insert({
          name: department.name,
          description: department.description,
          sort_order: department.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create department");
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Department> & { id: string }) => {
      const { data, error } = await supabase
        .from("departments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update department");
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete department");
    },
  });
}

export function useDepartmentManagers(departmentId?: string) {
  return useQuery({
    queryKey: ["department-managers", departmentId],
    queryFn: async () => {
      let query = supabase.from("department_managers").select("*");
      
      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DepartmentManager[];
    },
  });
}

export function useAssignDepartmentManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      departmentId,
      managerId,
      isTeamLead = false,
    }: {
      departmentId: string;
      managerId: string;
      isTeamLead?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("department_managers")
        .insert({
          department_id: departmentId,
          manager_id: managerId,
          is_team_lead: isTeamLead,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-managers"] });
      toast.success("Manager assigned to department");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign manager");
    },
  });
}

export function useRemoveDepartmentManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("department_managers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-managers"] });
      toast.success("Manager removed from department");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove manager");
    },
  });
}
