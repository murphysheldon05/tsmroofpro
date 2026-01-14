import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationRouting {
  id: string;
  notification_type: string;
  primary_role: string;
  fallback_email: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleAssignment {
  id: string;
  role_name: string;
  assigned_user_id: string | null;
  assigned_email: string | null;
  backup_user_id: string | null;
  backup_email: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotificationRouting() {
  return useQuery({
    queryKey: ["notification-routing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_routing")
        .select("*")
        .order("notification_type");
      
      if (error) throw error;
      return data as NotificationRouting[];
    },
  });
}

export function useUpdateNotificationRouting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routing: Partial<NotificationRouting> & { id: string }) => {
      const { data, error } = await supabase
        .from("notification_routing")
        .update({
          primary_role: routing.primary_role,
          fallback_email: routing.fallback_email,
          enabled: routing.enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", routing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-routing"] });
      toast.success("Notification routing updated");
    },
    onError: (error: any) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useRoleAssignments() {
  return useQuery({
    queryKey: ["role-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_assignments")
        .select("*")
        .order("role_name");
      
      if (error) throw error;
      return data as RoleAssignment[];
    },
  });
}

export function useUpdateRoleAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: Partial<RoleAssignment> & { id: string }) => {
      const { data, error } = await supabase
        .from("role_assignments")
        .update({
          assigned_user_id: assignment.assigned_user_id,
          assigned_email: assignment.assigned_email,
          backup_user_id: assignment.backup_user_id,
          backup_email: assignment.backup_email,
          active: assignment.active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignment.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-assignments"] });
      toast.success("Role assignment updated");
    },
    onError: (error: any) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}
