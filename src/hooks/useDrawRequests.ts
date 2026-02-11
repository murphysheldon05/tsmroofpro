import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Types ───
export interface DrawRequest {
  id: string;
  user_id: string;
  job_number: string;
  job_name: string | null;
  requested_amount: number;
  estimated_commission: number | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  denied_by: string | null;
  denied_at: string | null;
  denial_reason: string | null;
  paid_at: string | null;
  deducted_from_commission_id: string | null;
  deducted_at: string | null;
  remaining_balance: number;
  notes: string | null;
  requires_manager_approval: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_name?: string;
  user_email?: string;
}

// ─── My Draw Requests (current user) ───
export function useMyDrawRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["draw-requests", "mine", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_requests" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DrawRequest[];
    },
    enabled: !!user,
  });
}

// ─── Team Draw Requests (Sales Manager) ───
export function useTeamDrawRequests() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["draw-requests", "team", user?.id],
    queryFn: async () => {
      // Get team member IDs
      const { data: team } = await supabase
        .from("team_assignments")
        .select("employee_id")
        .eq("manager_id", user!.id);
      
      const teamIds = team?.map(t => t.employee_id) || [];
      if (teamIds.length === 0) return [] as DrawRequest[];

      const { data, error } = await supabase
        .from("draw_requests" as any)
        .select("*")
        .in("user_id", teamIds)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Enrich with user names
      const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return ((data || []) as unknown as DrawRequest[]).map(d => ({
        ...d,
        user_name: profileMap.get(d.user_id)?.full_name || "Unknown",
        user_email: profileMap.get(d.user_id)?.email || "",
      }));
    },
    enabled: !!user && (role === "sales_manager" || role === "admin"),
  });
}

// ─── All Draw Requests (Admin) ───
export function useAllDrawRequests() {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ["draw-requests", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds.length ? userIds : ["no-id"]);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return ((data || []) as unknown as DrawRequest[]).map(d => ({
        ...d,
        user_name: profileMap.get(d.user_id)?.full_name || "Unknown",
        user_email: profileMap.get(d.user_id)?.email || "",
      }));
    },
    enabled: !!user && isAdmin,
  });
}

// ─── Draw Balance for a user ───
export function useDrawBalance(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  return useQuery({
    queryKey: ["draw-requests", "balance", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_requests" as any)
        .select("requested_amount, remaining_balance, status")
        .eq("user_id", targetId!)
        .in("status", ["approved", "paid"]);
      if (error) throw error;
      const items = (data || []) as any[];
      const totalOutstanding = items.reduce((sum, d) => sum + Number(d.remaining_balance || 0), 0);
      const count = items.filter(d => Number(d.remaining_balance) > 0).length;
      return { totalOutstanding, activeCount: count };
    },
    enabled: !!targetId,
  });
}

// ─── Submit Draw Request ───
export function useSubmitDrawRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      job_number: string;
      job_name?: string;
      requested_amount: number;
      estimated_commission?: number;
      notes?: string;
    }) => {
      const requiresApproval = input.requested_amount > 1500;
      const { data, error } = await supabase
        .from("draw_requests" as any)
        .insert({
          user_id: user!.id,
          job_number: input.job_number,
          job_name: input.job_name || null,
          requested_amount: input.requested_amount,
          estimated_commission: input.estimated_commission || null,
          remaining_balance: input.requested_amount,
          notes: input.notes || null,
          requires_manager_approval: requiresApproval,
          status: "pending",
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Send notification
      try {
        await supabase.functions.invoke("send-draw-notification", {
          body: {
            notification_type: "requested",
            draw_id: (data as any).id,
            user_id: user!.id,
            job_number: input.job_number,
            job_name: input.job_name,
            amount: input.requested_amount,
            requires_manager_approval: requiresApproval,
          },
        });
      } catch (e) {
        console.error("Draw notification failed:", e);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Draw request submitted. Your Sales Manager will review it.");
      queryClient.invalidateQueries({ queryKey: ["draw-requests"] });
    },
    onError: (error: any) => {
      toast.error("Failed to submit draw request: " + error.message);
    },
  });
}

// ─── Approve Draw Request ───
export function useApproveDrawRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (drawId: string) => {
      const { data, error } = await supabase
        .from("draw_requests" as any)
        .update({
          status: "approved",
          approved_by: user!.id,
          approved_at: new Date().toISOString(),
        } as any)
        .eq("id", drawId)
        .select()
        .single();
      if (error) throw error;

      try {
        const d = data as any;
        await supabase.functions.invoke("send-draw-notification", {
          body: {
            notification_type: "approved",
            draw_id: drawId,
            user_id: d.user_id,
            job_number: d.job_number,
            job_name: d.job_name,
            amount: d.requested_amount,
          },
        });
      } catch (e) {
        console.error("Draw notification failed:", e);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Draw request approved");
      queryClient.invalidateQueries({ queryKey: ["draw-requests"] });
    },
    onError: (error: any) => {
      toast.error("Failed to approve draw: " + error.message);
    },
  });
}

// ─── Deny Draw Request ───
export function useDenyDrawRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ drawId, reason }: { drawId: string; reason: string }) => {
      const { data, error } = await supabase
        .from("draw_requests" as any)
        .update({
          status: "denied",
          denied_by: user!.id,
          denied_at: new Date().toISOString(),
          denial_reason: reason,
        } as any)
        .eq("id", drawId)
        .select()
        .single();
      if (error) throw error;

      try {
        const d = data as any;
        await supabase.functions.invoke("send-draw-notification", {
          body: {
            notification_type: "denied",
            draw_id: drawId,
            user_id: d.user_id,
            job_number: d.job_number,
            job_name: d.job_name,
            amount: d.requested_amount,
            denial_reason: reason,
          },
        });
      } catch (e) {
        console.error("Draw notification failed:", e);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Draw request denied");
      queryClient.invalidateQueries({ queryKey: ["draw-requests"] });
    },
    onError: (error: any) => {
      toast.error("Failed to deny draw: " + error.message);
    },
  });
}

// ─── Mark Draw Paid (Accounting) ───
export function useMarkDrawPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawId: string) => {
      const { data, error } = await supabase
        .from("draw_requests" as any)
        .update({
          paid_at: new Date().toISOString(),
        } as any)
        .eq("id", drawId)
        .select()
        .single();
      if (error) throw error;

      try {
        const d = data as any;
        await supabase.functions.invoke("send-draw-notification", {
          body: {
            notification_type: "paid",
            draw_id: drawId,
            user_id: d.user_id,
            job_number: d.job_number,
            job_name: d.job_name,
            amount: d.requested_amount,
          },
        });
      } catch (e) {
        console.error("Draw notification failed:", e);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Draw marked as paid/disbursed");
      queryClient.invalidateQueries({ queryKey: ["draw-requests"] });
    },
    onError: (error: any) => {
      toast.error("Failed to mark draw as paid: " + error.message);
    },
  });
}

// ─── Deduct Draw from Commission ───
export function useDeductDraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      drawId,
      commissionId,
      deductionAmount,
      currentBalance,
    }: {
      drawId: string;
      commissionId: string;
      deductionAmount: number;
      currentBalance: number;
    }) => {
      const newBalance = Math.max(0, currentBalance - deductionAmount);
      const newStatus = newBalance <= 0 ? "deducted" : "approved";

      const { data, error } = await supabase
        .from("draw_requests" as any)
        .update({
          status: newStatus,
          deducted_from_commission_id: commissionId,
          deducted_at: new Date().toISOString(),
          remaining_balance: newBalance,
        } as any)
        .eq("id", drawId)
        .select()
        .single();
      if (error) throw error;

      try {
        const d = data as any;
        await supabase.functions.invoke("send-draw-notification", {
          body: {
            notification_type: "deducted",
            draw_id: drawId,
            user_id: d.user_id,
            job_number: d.job_number,
            job_name: d.job_name,
            amount: d.requested_amount,
            deduction_amount: deductionAmount,
            remaining_balance: newBalance,
            commission_id: commissionId,
          },
        });
      } catch (e) {
        console.error("Draw notification failed:", e);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Draw deducted from commission");
      queryClient.invalidateQueries({ queryKey: ["draw-requests"] });
    },
    onError: (error: any) => {
      toast.error("Failed to deduct draw: " + error.message);
    },
  });
}
