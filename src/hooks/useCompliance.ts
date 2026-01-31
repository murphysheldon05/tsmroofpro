import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Fetch open/blocked violations count
export function useOpenViolationsCount() {
  return useQuery({
    queryKey: ["compliance-violations-open-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("compliance_violations")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "blocked"]);
      
      if (error) throw error;
      return count || 0;
    },
  });
}

// Fetch active holds count
export function useActiveHoldsCount() {
  return useQuery({
    queryKey: ["compliance-holds-active-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("compliance_holds")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      
      if (error) throw error;
      return count || 0;
    },
  });
}

// Fetch pending escalations count
export function usePendingEscalationsCount() {
  return useQuery({
    queryKey: ["compliance-escalations-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("compliance_escalations")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      
      if (error) throw error;
      return count || 0;
    },
  });
}

// Fetch unacknowledged users count for SOPMASTER
export function useUnacknowledgedUsersCount(currentVersion: string = "2025-01-30-v1") {
  return useQuery({
    queryKey: ["compliance-unacknowledged-count", currentVersion],
    queryFn: async () => {
      // Get total active users
      const { count: totalUsers, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("employee_status", "active");
      
      if (usersError) throw usersError;

      // Get users who have acknowledged SOPMASTER with current version
      const { data: acknowledged, error: ackError } = await supabase
        .from("sop_acknowledgments")
        .select("user_id")
        .eq("sop_key", "SOPMASTER")
        .eq("version", currentVersion);
      
      if (ackError) throw ackError;

      const acknowledgedCount = new Set(acknowledged?.map(a => a.user_id)).size;
      return Math.max(0, (totalUsers || 0) - acknowledgedCount);
    },
  });
}

// Fetch recent violations (last 5)
export function useRecentViolations(limit: number = 5) {
  return useQuery({
    queryKey: ["compliance-violations-recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_violations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch pending escalations
export function usePendingEscalations() {
  return useQuery({
    queryKey: ["compliance-escalations-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_escalations")
        .select(`
          *,
          compliance_violations (
            id,
            sop_key,
            description,
            severity
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch all violations with filters
export function useViolations(statusFilter?: string) {
  return useQuery({
    queryKey: ["compliance-violations", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("compliance_violations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch all holds with filters
export function useHolds(statusFilter?: string) {
  return useQuery({
    queryKey: ["compliance-holds", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("compliance_holds")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch audit log
export function useComplianceAuditLog(limit: number = 50) {
  return useQuery({
    queryKey: ["compliance-audit-log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch acknowledgments
export function useAcknowledgments() {
  return useQuery({
    queryKey: ["sop-acknowledgments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sop_acknowledgments")
        .select("*")
        .order("acknowledged_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}
