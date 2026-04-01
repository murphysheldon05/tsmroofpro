import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AuditLogEntry {
  id: string;
  commission_id: string;
  action: string;
  performed_by: string | null;
  performed_at: string;
  details: Record<string, any> | null;
  pay_run_id: string | null;
  performer_name?: string;
  performer_email?: string;
}

export type AuditAction =
  | "submitted"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "revision_submitted"
  | "paid"
  | "rolled_to_next_pay_run"
  | "admin_override_pulled_in"
  | "notes_added"
  | "edited";

export function useCommissionAuditLog(commissionId: string | undefined) {
  return useQuery({
    queryKey: ["commission-audit-log", commissionId],
    queryFn: async () => {
      if (!commissionId) return [];

      const { data, error } = await (supabase
        .from as any)("commission_audit_log")
        .select("*")
        .eq("commission_id", commissionId)
        .order("performed_at", { ascending: false });

      if (error) throw error;

      const performerIds = [...new Set((data || []).map((e: any) => e.performed_by).filter(Boolean))];
      let profileMap: Record<string, { name: string; email: string }> = {};
      if (performerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", performerIds as string[]);
        profileMap = (profiles || []).reduce(
          (acc: Record<string, { name: string; email: string }>, p: any) => {
            acc[p.id] = { name: p.full_name || p.email || "Unknown", email: p.email || "" };
            return acc;
          },
          {}
        );
      }

      return (data || []).map((entry: any) => ({
        ...entry,
        performer_name: entry.performed_by ? profileMap[entry.performed_by]?.name || "Unknown" : "System",
        performer_email: entry.performed_by ? profileMap[entry.performed_by]?.email || "" : "",
      })) as AuditLogEntry[];
    },
    enabled: !!commissionId,
  });
}

/**
 * Insert an audit log entry. Called from commission action hooks (not via useMutation
 * to keep it simple — this is a fire-and-forget side-effect of a primary mutation).
 */
export async function logCommissionAction(params: {
  commissionId: string;
  action: AuditAction;
  performedBy: string;
  details?: Record<string, any>;
  payRunId?: string | null;
}): Promise<void> {
  const { error } = await (supabase.from as any)("commission_audit_log").insert({
    commission_id: params.commissionId,
    action: params.action,
    performed_by: params.performedBy,
    details: params.details || null,
    pay_run_id: params.payRunId || null,
  });
  if (error) {
    console.error("Failed to insert audit log:", error);
  }
}
