import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SOPMASTER_VERSION } from "@/lib/sopMasterConstants";

export function useSOPAcknowledgment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has acknowledged current SOPMASTER version
  const { data: hasAcknowledged, isLoading } = useQuery({
    queryKey: ["sop-acknowledgment", user?.id, SOPMASTER_VERSION],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("sop_acknowledgments")
        .select("id")
        .eq("user_id", user.id)
        .eq("sop_key", "SOPMASTER")
        .eq("version", SOPMASTER_VERSION)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Submit acknowledgment
  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      // Insert acknowledgment record
      const { error: ackError } = await supabase
        .from("sop_acknowledgments")
        .insert({
          user_id: user.id,
          sop_key: "SOPMASTER",
          version: SOPMASTER_VERSION,
          method: "checkbox",
        });

      if (ackError) throw ackError;

      // Log to compliance audit log
      await supabase.from("compliance_audit_log").insert({
        actor_user_id: user.id,
        action: "acknowledge_sop",
        target_type: "user",
        target_id: user.id,
        metadata: {
          sop_key: "SOPMASTER",
          version: SOPMASTER_VERSION,
          method: "checkbox",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sop-acknowledgment", user?.id, SOPMASTER_VERSION],
      });
    },
  });

  return {
    hasAcknowledged: hasAcknowledged ?? false,
    isLoading,
    acknowledge: acknowledgeMutation.mutateAsync,
    isAcknowledging: acknowledgeMutation.isPending,
  };
}
