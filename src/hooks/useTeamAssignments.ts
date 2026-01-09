import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TeamAssignment {
  id: string;
  employee_id: string;
  manager_id: string;
  created_at: string;
  created_by: string | null;
  // Joined data
  employee_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  manager_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

// Get all team assignments (for admins)
export function useTeamAssignments() {
  return useQuery({
    queryKey: ["team-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch all relevant profiles
      const userIds = new Set<string>();
      data?.forEach((a) => {
        userIds.add(a.employee_id);
        userIds.add(a.manager_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return (data || []).map((a) => ({
        ...a,
        employee_profile: profileMap.get(a.employee_id),
        manager_profile: profileMap.get(a.manager_id),
      })) as TeamAssignment[];
    },
  });
}

// Get the current user's manager (for employees)
export function useMyManager() {
  return useQuery({
    queryKey: ["my-manager"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("team_assignments")
        .select("manager_id")
        .eq("employee_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get manager profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", data.manager_id)
        .single();

      return profile;
    },
  });
}

// Get employees managed by the current user (for managers)
export function useMyTeam() {
  return useQuery({
    queryKey: ["my-team"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("team_assignments")
        .select("employee_id")
        .eq("manager_id", user.id);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const employeeIds = data.map((a) => a.employee_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", employeeIds);

      return profiles || [];
    },
  });
}

// Assign an employee to a manager
export function useAssignEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      managerId,
    }: {
      employeeId: string;
      managerId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Check if assignment already exists
      const { data: existing } = await supabase
        .from("team_assignments")
        .select("id")
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (existing) {
        // Update existing assignment
        const { error } = await supabase
          .from("team_assignments")
          .update({ manager_id: managerId })
          .eq("employee_id", employeeId);

        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase.from("team_assignments").insert({
          employee_id: employeeId,
          manager_id: managerId,
          created_by: user?.id,
        });

        if (error) throw error;
      }

      return { employeeId, managerId };
    },
    onSuccess: () => {
      toast.success("Team assignment updated");
      queryClient.invalidateQueries({ queryKey: ["team-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
      queryClient.invalidateQueries({ queryKey: ["my-manager"] });
    },
    onError: (error) => {
      console.error("Failed to assign employee:", error);
      toast.error("Failed to update team assignment");
    },
  });
}

// Remove an employee's assignment
export function useRemoveAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from("team_assignments")
        .delete()
        .eq("employee_id", employeeId);

      if (error) throw error;
      return employeeId;
    },
    onSuccess: () => {
      toast.success("Team assignment removed");
      queryClient.invalidateQueries({ queryKey: ["team-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
      queryClient.invalidateQueries({ queryKey: ["my-manager"] });
    },
    onError: (error) => {
      console.error("Failed to remove assignment:", error);
      toast.error("Failed to remove team assignment");
    },
  });
}

// Get manager for a specific employee
export function useEmployeeManager(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["employee-manager", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;

      const { data, error } = await supabase
        .from("team_assignments")
        .select("manager_id")
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (error) throw error;
      return data?.manager_id || null;
    },
    enabled: !!employeeId,
  });
}
