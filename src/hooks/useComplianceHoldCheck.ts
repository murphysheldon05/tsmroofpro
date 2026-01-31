import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HoldCheckResult {
  blocked: boolean;
  reason: string | null;
  holdId: string | null;
  holdType: string | null;
}

const NO_HOLD: HoldCheckResult = {
  blocked: false,
  reason: null,
  holdId: null,
  holdType: null,
};

/**
 * Check for active commission hold on a job or user
 */
export async function checkCommissionHold(
  jobId?: string | null,
  userId?: string | null
): Promise<HoldCheckResult> {
  if (!jobId && !userId) return NO_HOLD;

  let query = supabase
    .from("compliance_holds")
    .select("id, reason, hold_type")
    .eq("hold_type", "commission_hold")
    .eq("status", "active");

  // Build OR condition for job_id or user_id
  if (jobId && userId) {
    query = query.or(`job_id.eq.${jobId},user_id.eq.${userId}`);
  } else if (jobId) {
    query = query.eq("job_id", jobId);
  } else if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.error("Error checking commission hold:", error);
    return NO_HOLD;
  }

  if (data) {
    return {
      blocked: true,
      reason: data.reason,
      holdId: data.id,
      holdType: data.hold_type,
    };
  }

  return NO_HOLD;
}

/**
 * Check for active invoice hold on a job
 */
export async function checkInvoiceHold(jobId: string): Promise<HoldCheckResult> {
  if (!jobId) return NO_HOLD;

  const { data, error } = await supabase
    .from("compliance_holds")
    .select("id, reason, hold_type")
    .eq("job_id", jobId)
    .eq("hold_type", "invoice_hold")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error checking invoice hold:", error);
    return NO_HOLD;
  }

  if (data) {
    return {
      blocked: true,
      reason: data.reason,
      holdId: data.id,
      holdType: data.hold_type,
    };
  }

  return NO_HOLD;
}

/**
 * Check for active scheduling hold on a job
 */
export async function checkSchedulingHold(jobId: string): Promise<HoldCheckResult> {
  if (!jobId) return NO_HOLD;

  const { data, error } = await supabase
    .from("compliance_holds")
    .select("id, reason, hold_type")
    .eq("job_id", jobId)
    .eq("hold_type", "scheduling_hold")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error checking scheduling hold:", error);
    return NO_HOLD;
  }

  if (data) {
    return {
      blocked: true,
      reason: data.reason,
      holdId: data.id,
      holdType: data.hold_type,
    };
  }

  return NO_HOLD;
}

/**
 * Check for active access hold on a user
 */
export async function checkAccessHold(userId: string): Promise<HoldCheckResult> {
  if (!userId) return NO_HOLD;

  const { data, error } = await supabase
    .from("compliance_holds")
    .select("id, reason, hold_type")
    .eq("user_id", userId)
    .eq("hold_type", "access_hold")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error checking access hold:", error);
    return NO_HOLD;
  }

  if (data) {
    return {
      blocked: true,
      reason: data.reason,
      holdId: data.id,
      holdType: data.hold_type,
    };
  }

  return NO_HOLD;
}

/**
 * Hook to check for access hold on the current user
 */
export function useAccessHoldCheck() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["access-hold-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return NO_HOLD;
      return checkAccessHold(user.id);
    },
    enabled: !!user?.id,
    staleTime: 30000, // Check every 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to get all active holds for a job
 */
export function useJobHoldsCheck(jobId: string | null | undefined) {
  return useQuery({
    queryKey: ["job-holds-check", jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data, error } = await supabase
        .from("compliance_holds")
        .select("id, reason, hold_type, created_at")
        .eq("job_id", jobId)
        .eq("status", "active");

      if (error) {
        console.error("Error checking job holds:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!jobId,
  });
}

/**
 * Hook to get all active holds for the current user
 */
export function useUserHoldsCheck() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-holds-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("compliance_holds")
        .select("id, reason, hold_type, created_at, job_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) {
        console.error("Error checking user holds:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
}
