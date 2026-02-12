import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useAccountingCommissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["accounting-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_documents")
        .select("*")
        .in("status", ["approved", "paid"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useMarkCommissionsPaid() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (commissionIds: string[]) => {
      if (!user) throw new Error("Not authenticated");

      const now = new Date().toISOString();

      // Mark each commission as paid
      const { error } = await supabase
        .from("commission_documents")
        .update({
          status: "paid",
          paid_at: now,
          paid_by: user.id,
        })
        .in("id", commissionIds);

      if (error) throw error;

      // Check for draw deductions for each commission
      for (const commissionId of commissionIds) {
        // Get the commission details
        const { data: commission } = await supabase
          .from("commission_documents")
          .select("job_name_id, rep_commission, sales_rep_id")
          .eq("id", commissionId)
          .single();

        if (!commission?.sales_rep_id) continue;

        // Find outstanding draws for this rep
        const { data: draws } = await supabase
          .from("draw_requests")
          .select("*")
          .eq("user_id", commission.sales_rep_id)
          .eq("status", "approved")
          .order("created_at", { ascending: true });

        if (!draws?.length) continue;

        let remainingPayout = commission.rep_commission || 0;

        for (const draw of draws) {
          if (remainingPayout <= 0) break;
          
          const deductAmount = Math.min(draw.requested_amount - (draw.remaining_balance || 0), remainingPayout);
          if (deductAmount <= 0) continue;

          const newBalance = (draw.requested_amount - deductAmount);

          await supabase
            .from("draw_requests")
            .update({
              status: newBalance <= 0 ? "deducted" : "approved",
              deducted_from_commission_id: commissionId,
              deducted_at: now,
              remaining_balance: Math.max(0, newBalance),
            })
            .eq("id", draw.id);

          remainingPayout -= deductAmount;
        }
      }

      return commissionIds;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ["accounting-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission-documents"] });
      queryClient.invalidateQueries({ queryKey: ["draw-requests"] });
      toast.success(`${ids.length} commission${ids.length > 1 ? "s" : ""} marked as paid`);
    },
    onError: (err) => {
      toast.error("Failed to process payouts", { description: String(err) });
    },
  });
}
