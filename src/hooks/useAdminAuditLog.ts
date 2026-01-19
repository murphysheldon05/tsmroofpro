import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
        performed_by_name: profile?.full_name || null,
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
  USER_APPROVED: "user_approved",
  USER_REJECTED: "user_rejected",
  USER_CREATED: "user_created",
  USER_DELETED: "user_deleted",
  USER_DEACTIVATED: "user_deactivated",
  ROLE_CHANGED: "role_changed",
  DEPARTMENT_CHANGED: "department_changed",
  TEAM_CHANGED: "team_changed",
  MANAGER_CHANGED: "manager_changed",
  COMMISSION_TIER_CHANGED: "commission_tier_changed",
  COMMISSION_APPROVED: "commission_approved",
  COMMISSION_REJECTED: "commission_rejected",
  COMMISSION_PAID: "commission_paid",
  REQUEST_APPROVED: "request_approved",
  REQUEST_REJECTED: "request_rejected",
  INVITE_SENT: "invite_sent",
} as const;

export const OBJECT_TYPES = {
  USER: "user",
  COMMISSION: "commission",
  REQUEST: "request",
  TEAM_ASSIGNMENT: "team_assignment",
  COMMISSION_TIER: "commission_tier",
} as const;
