import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDisplayName } from "@/lib/displayName";
import type { Json } from "@/integrations/supabase/types";

interface AuditLogEntry {
  id: string;
  action_type: string;
  object_type: string;
  object_id: string;
  previous_value: Json | null;
  new_value: Json | null;
  performed_by: string;
  performed_by_email: string | null;
  performed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

interface CreateAuditLogParams {
  action_type: string;
  object_type: string;
  object_id: string;
  previous_value?: Json | null;
  new_value?: Json | null;
  notes?: string;
}

export function useAdminAuditLog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logAction = useMutation({
    mutationFn: async (params: CreateAuditLogParams) => {
      if (!user) throw new Error("User not authenticated");

      // Get user profile for email and name
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("admin_audit_log").insert([{
        action_type: params.action_type,
        object_type: params.object_type,
        object_id: params.object_id,
        previous_value: params.previous_value || null,
        new_value: params.new_value || null,
        performed_by: user.id,
        performed_by_email: profile?.email || user.email,
        performed_by_name: profile ? formatDisplayName(profile.full_name, profile.email) : null,
        notes: params.notes || null,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-audit-log"] });
    },
  });

  return { logAction };
}

export function useAuditLogEntries(limit = 100) {
  return useQuery({
    queryKey: ["admin-audit-log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });
}

// Action type constants for consistency
export const AUDIT_ACTIONS = {
  // User actions
  USER_APPROVED: "user_approved",
  USER_REJECTED: "user_rejected",
  USER_CREATED: "user_created",
  USER_DELETED: "user_deleted",
  USER_DEACTIVATED: "user_deactivated",
  USER_LOGIN: "user_login",
  ROLE_CHANGED: "role_changed",
  DEPARTMENT_CHANGED: "department_changed",
  TEAM_CHANGED: "team_changed",
  MANAGER_CHANGED: "manager_changed",
  INVITE_SENT: "invite_sent",
  PASSWORD_RESET: "password_reset",
  
  // Commission actions
  COMMISSION_TIER_CHANGED: "commission_tier_changed",
  COMMISSION_SUBMITTED: "commission_submitted",
  COMMISSION_APPROVED: "commission_approved",
  COMMISSION_REJECTED: "commission_rejected",
  COMMISSION_PAID: "commission_paid",
  COMMISSION_COMPLETED: "commission_completed",
  COMMISSION_STATUS_CHANGED: "commission_status_changed",
  
  // Request actions
  REQUEST_SUBMITTED: "request_submitted",
  REQUEST_APPROVED: "request_approved",
  REQUEST_REJECTED: "request_rejected",
  REQUEST_COMPLETED: "request_completed",
  REQUEST_STATUS_CHANGED: "request_status_changed",
  
  // Warranty actions
  WARRANTY_SUBMITTED: "warranty_submitted",
  WARRANTY_ASSIGNED: "warranty_assigned",
  WARRANTY_STATUS_CHANGED: "warranty_status_changed",
  WARRANTY_COMPLETED: "warranty_completed",
  WARRANTY_DENIED: "warranty_denied",
  WARRANTY_NOTE_ADDED: "warranty_note_added",
  
  // Resource actions
  RESOURCE_CREATED: "resource_created",
  RESOURCE_UPDATED: "resource_updated",
  RESOURCE_DELETED: "resource_deleted",
  
  // System actions
  SETTINGS_CHANGED: "settings_changed",
} as const;

export const OBJECT_TYPES = {
  USER: "user",
  COMMISSION: "commission",
  REQUEST: "request",
  WARRANTY: "warranty",
  TEAM_ASSIGNMENT: "team_assignment",
  COMMISSION_TIER: "commission_tier",
  RESOURCE: "resource",
  SETTING: "setting",
} as const;

// Helper to get friendly action labels
export const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    user_approved: "User Approved",
    user_rejected: "User Rejected",
    user_created: "User Created",
    user_deleted: "User Deleted",
    user_deactivated: "User Deactivated",
    user_login: "User Login",
    role_changed: "Role Changed",
    department_changed: "Department Changed",
    team_changed: "Team Changed",
    manager_changed: "Manager Changed",
    invite_sent: "Invite Sent",
    password_reset: "Password Reset",
    commission_tier_changed: "Commission Tier Changed",
    commission_submitted: "Commission Submitted",
    commission_approved: "Commission Approved",
    commission_rejected: "Commission Rejected",
    commission_paid: "Commission Paid",
    commission_completed: "Commission Completed",
    commission_status_changed: "Commission Status Changed",
    request_submitted: "Request Submitted",
    request_approved: "Request Approved",
    request_rejected: "Request Rejected",
    request_completed: "Request Completed",
    request_status_changed: "Request Status Changed",
    warranty_submitted: "Warranty Submitted",
    warranty_assigned: "Warranty Assigned",
    warranty_status_changed: "Warranty Status Changed",
    warranty_completed: "Warranty Completed",
    warranty_denied: "Warranty Denied",
    warranty_note_added: "Warranty Note Added",
    resource_created: "Resource Created",
    resource_updated: "Resource Updated",
    resource_deleted: "Resource Deleted",
    settings_changed: "Settings Changed",
  };
  return labels[action] || action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};

// Query for audit logs filtered by object
export function useAuditLogForObject(objectType: string, objectId: string | undefined) {
  return useQuery({
    queryKey: ["audit-log-object", objectType, objectId],
    queryFn: async () => {
      if (!objectId) return [];
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .eq("object_type", objectType)
        .eq("object_id", objectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!objectId,
  });
}
