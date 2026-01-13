import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ComplianceRequest {
  id: string;
  recipient_type: string;
  recipient_id: string;
  recipient_name: string;
  documents_requested: string[];
  due_date: string | null;
  notes: string | null;
  requested_by: string | null;
  created_at: string;
}

export function useComplianceRequests() {
  return useQuery({
    queryKey: ["compliance-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ComplianceRequest[];
    },
  });
}

export function useComplianceRequestsByRecipient(recipientId: string | undefined) {
  return useQuery({
    queryKey: ["compliance-requests", recipientId],
    queryFn: async () => {
      if (!recipientId) return [];
      const { data, error } = await supabase
        .from("compliance_requests")
        .select("*")
        .eq("recipient_id", recipientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ComplianceRequest[];
    },
    enabled: !!recipientId,
  });
}

export function useCreateComplianceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: Omit<ComplianceRequest, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("compliance_requests")
        .insert(request)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-requests"] });
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
}
