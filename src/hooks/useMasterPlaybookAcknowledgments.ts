import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MASTER_SOPS } from "@/lib/masterPlaybookSOPs";
import { SOPMASTER_VERSION } from "@/lib/sopMasterConstants";

export function useMasterPlaybookAcknowledgments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all acknowledgments for the current user and version
  const { data: acknowledgedSOPs, isLoading } = useQuery({
    queryKey: ["master-playbook-acknowledgments", user?.id, SOPMASTER_VERSION],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();

      const { data, error } = await supabase
        .from("sop_acknowledgments")
        .select("sop_key")
        .eq("user_id", user.id)
        .eq("version", SOPMASTER_VERSION);

      if (error) throw error;
      return new Set((data || []).map((a) => a.sop_key));
    },
    enabled: !!user?.id,
  });

  // Check if all 10 SOPs are acknowledged
  const allAcknowledged = MASTER_SOPS.every(
    (sop) => acknowledgedSOPs?.has(sop.id)
  );

  // Get count for progress
  const acknowledgedCount = acknowledgedSOPs?.size ?? 0;
  const totalCount = MASTER_SOPS.length;

  // Acknowledge a single SOP
  const acknowledgeMutation = useMutation({
    mutationFn: async (sopId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Insert acknowledgment record
      const { error: ackError } = await supabase
        .from("sop_acknowledgments")
        .insert({
          user_id: user.id,
          sop_key: sopId,
          version: SOPMASTER_VERSION,
          method: "playbook_card",
        });

      if (ackError) throw ackError;

      // Log to compliance audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user.id,
        action: "acknowledge_sop",
        target_type: "sop",
        target_id: sopId,
        metadata: {
          sop_key: sopId,
          version: SOPMASTER_VERSION,
          method: "playbook_card",
        },
      });

      return sopId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["master-playbook-acknowledgments", user?.id, SOPMASTER_VERSION],
      });
      // Also invalidate the main SOP acknowledgment query (for SOPMASTER)
      queryClient.invalidateQueries({
        queryKey: ["sop-acknowledgment", user?.id, SOPMASTER_VERSION],
      });
    },
  });

  // Acknowledge all remaining SOPs at once (for final completion)
  const acknowledgeAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const unacknowledged = MASTER_SOPS.filter(
        (sop) => !acknowledgedSOPs?.has(sop.id)
      );

      // Insert all acknowledgments
      const inserts = unacknowledged.map((sop) => ({
        user_id: user.id,
        sop_key: sop.id,
        version: SOPMASTER_VERSION,
        method: "playbook_bulk",
      }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from("sop_acknowledgments")
          .insert(inserts);
        if (error) throw error;
      }

      // Also insert the master SOPMASTER acknowledgment
      const { error: masterError } = await supabase
        .from("sop_acknowledgments")
        .upsert({
          user_id: user.id,
          sop_key: "SOPMASTER",
          version: SOPMASTER_VERSION,
          method: "playbook_complete",
        }, {
          onConflict: 'user_id,sop_key,version'
        });

      if (masterError) throw masterError;

      // Log completion
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user.id,
        action: "complete_playbook",
        target_type: "user",
        target_id: user.id,
        metadata: {
          version: SOPMASTER_VERSION,
          sops_acknowledged: MASTER_SOPS.length,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["master-playbook-acknowledgments", user?.id, SOPMASTER_VERSION],
      });
      queryClient.invalidateQueries({
        queryKey: ["sop-acknowledgment", user?.id, SOPMASTER_VERSION],
      });
    },
  });

  return {
    acknowledgedSOPs: acknowledgedSOPs ?? new Set<string>(),
    isLoading,
    allAcknowledged,
    acknowledgedCount,
    totalCount,
    acknowledgeSOP: acknowledgeMutation.mutateAsync,
    isAcknowledging: acknowledgeMutation.isPending,
    acknowledgeAll: acknowledgeAllMutation.mutateAsync,
    isAcknowledgingAll: acknowledgeAllMutation.isPending,
  };
}
