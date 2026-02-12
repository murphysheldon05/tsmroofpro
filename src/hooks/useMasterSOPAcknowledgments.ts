import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SOPMASTER_VERSION, SOPMASTER_CONTENT } from "@/lib/sopMasterConstants";

export interface SOPAcknowledgmentStatus {
  sopNumber: number;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export function useMasterSOPAcknowledgments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all acknowledgments for current user and version
  const { data: acknowledgments, isLoading } = useQuery({
    queryKey: ["master-sop-acknowledgments", user?.id, SOPMASTER_VERSION],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("master_sop_acknowledgments")
        .select("sop_number, acknowledged_at")
        .eq("user_id", user.id)
        .eq("sop_version", SOPMASTER_VERSION);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    // Once loaded, don't refetch — acknowledgments are permanent per version
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60, // Keep cached for 1 hour
  });

  // Get status for each SOP (1-10)
  const sopStatuses: SOPAcknowledgmentStatus[] = SOPMASTER_CONTENT.map((sop) => {
    const ack = acknowledgments?.find((a) => a.sop_number === sop.number);
    return {
      sopNumber: sop.number,
      acknowledged: !!ack,
      acknowledgedAt: ack?.acknowledged_at || null,
    };
  });

  // Count completed
  const completedCount = sopStatuses.filter((s) => s.acknowledged).length;
  const totalCount = SOPMASTER_CONTENT.length;
  const allCompleted = completedCount === totalCount;

  // Acknowledge a single SOP
  const acknowledgeMutation = useMutation({
    mutationFn: async (sopNumber: number) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("master_sop_acknowledgments")
        .insert({
          user_id: user.id,
          sop_number: sopNumber,
          sop_version: SOPMASTER_VERSION,
        });

      if (error) throw error;

      // Log to compliance audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user.id,
        action: "acknowledge_master_sop",
        target_type: "sop",
        target_id: `SOP-${String(sopNumber).padStart(2, "0")}`,
        metadata: {
          sop_number: sopNumber,
          version: SOPMASTER_VERSION,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["master-sop-acknowledgments", user?.id, SOPMASTER_VERSION],
      });
    },
  });

  return {
    sopStatuses,
    completedCount,
    totalCount,
    allCompleted,
    isLoading,
    acknowledgeSOP: acknowledgeMutation.mutateAsync,
    isAcknowledging: acknowledgeMutation.isPending,
  };
}
