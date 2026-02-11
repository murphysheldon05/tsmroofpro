import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useRoleOnboarding() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  // Get the active SOP for the user's role
  const { data: sop, isLoading: sopLoading } = useQuery({
    queryKey: ["role-onboarding-sop", role],
    queryFn: async () => {
      if (!role) return null;
      const { data, error } = await supabase
        .from("role_onboarding_sops")
        .select("*")
        .eq("role", role)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!role,
  });

  // Get sections for the SOP
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["role-onboarding-sections", sop?.id],
    queryFn: async () => {
      if (!sop?.id) return [];
      const { data, error } = await supabase
        .from("role_onboarding_sections")
        .select("*")
        .eq("sop_id", sop.id)
        .order("section_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sop?.id,
  });

  // Get user's acknowledgments
  const { data: acknowledgments, isLoading: acksLoading } = useQuery({
    queryKey: ["role-onboarding-acks", user?.id, sop?.id],
    queryFn: async () => {
      if (!user?.id || !sop?.id) return [];
      const { data, error } = await supabase
        .from("role_onboarding_acknowledgments")
        .select("*")
        .eq("user_id", user.id)
        .eq("sop_id", sop.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!sop?.id,
  });

  // Get completion record
  const { data: completion } = useQuery({
    queryKey: ["role-onboarding-completion", user?.id, sop?.id],
    queryFn: async () => {
      if (!user?.id || !sop?.id) return null;
      const { data, error } = await supabase
        .from("role_onboarding_completions")
        .select("*")
        .eq("user_id", user.id)
        .eq("sop_id", sop.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!sop?.id,
  });

  const requiredSections = sections?.filter((s) => s.is_acknowledgment_required) || [];
  const acknowledgedIds = new Set(acknowledgments?.map((a) => a.section_id) || []);
  const completedCount = requiredSections.filter((s) => acknowledgedIds.has(s.id)).length;
  const totalRequired = requiredSections.length;
  const allSectionsAcknowledged = totalRequired > 0 && completedCount === totalRequired;
  const isComplete = !!completion;

  // Acknowledge a section
  const acknowledge = useMutation({
    mutationFn: async (sectionId: string) => {
      if (!user?.id || !sop?.id) throw new Error("Missing user or SOP");
      const { error } = await supabase
        .from("role_onboarding_acknowledgments")
        .insert({
          user_id: user.id,
          sop_id: sop.id,
          section_id: sectionId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-onboarding-acks"] });
    },
  });

  // Submit electronic signature
  const submitSignature = useMutation({
    mutationFn: async (signature: string) => {
      if (!user?.id || !sop?.id) throw new Error("Missing user or SOP");
      const { error } = await supabase
        .from("role_onboarding_completions")
        .insert({
          user_id: user.id,
          sop_id: sop.id,
          electronic_signature: signature,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-onboarding-completion"] });
    },
  });

  return {
    sop,
    sections: sections || [],
    acknowledgments: acknowledgments || [],
    completion,
    acknowledgedIds,
    completedCount,
    totalRequired,
    allSectionsAcknowledged,
    isComplete,
    isLoading: sopLoading || sectionsLoading || acksLoading,
    acknowledge,
    submitSignature,
  };
}
