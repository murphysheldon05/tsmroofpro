import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useDraws() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["draws", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draws")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUserDraws(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  
  return useQuery({
    queryKey: ["draws", "user", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draws")
        .select("*")
        .eq("user_id", targetId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!targetId,
  });
}

export function useActiveDrawForUser(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;
  
  return useQuery({
    queryKey: ["draws", "active", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draws")
        .select("*")
        .eq("user_id", targetId!)
        .in("status", ["active", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!targetId,
  });
}

export function useDrawSettings() {
  return useQuery({
    queryKey: ["draw-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_settings")
        .select("*");
      if (error) throw error;
      const settings: Record<string, number> = {};
      data?.forEach((s: any) => { settings[s.setting_key] = Number(s.setting_value); });
      return settings;
    },
  });
}

export function useDrawApplications(drawId?: string) {
  return useQuery({
    queryKey: ["draw-applications", drawId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draw_applications")
        .select("*")
        .eq("draw_id", drawId!)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!drawId,
  });
}

export function useRequestDraw() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ amount, notes }: { amount: number; notes?: string }) => {
      const { data, error } = await supabase
        .from("draws")
        .insert({
          user_id: user!.id,
          amount,
          remaining_balance: amount,
          notes: notes || null,
          status: "requested",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Draw request submitted for review");
      queryClient.invalidateQueries({ queryKey: ["draws"] });
    },
    onError: (error: any) => {
      toast.error("Failed to request draw: " + error.message);
    },
  });
}

export function useApproveDraw() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ drawId }: { drawId: string }) => {
      const { error } = await supabase
        .from("draws")
        .update({
          status: "active",
          approved_at: new Date().toISOString(),
          approved_by: user!.id,
        })
        .eq("id", drawId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Draw approved");
      queryClient.invalidateQueries({ queryKey: ["draws"] });
    },
    onError: (error: any) => {
      toast.error("Failed to approve draw: " + error.message);
    },
  });
}

export function useDenyDraw() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ drawId, reason }: { drawId: string; reason: string }) => {
      const { error } = await supabase
        .from("draws")
        .update({
          status: "denied",
          denied_by: user!.id,
          denial_reason: reason,
        })
        .eq("id", drawId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Draw denied");
      queryClient.invalidateQueries({ queryKey: ["draws"] });
    },
    onError: (error: any) => {
      toast.error("Failed to deny draw: " + error.message);
    },
  });
}

export function useApplyCommissionToDraw() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ drawId, commissionId, amount, currentBalance }: { 
      drawId: string; commissionId: string; amount: number; currentBalance: number 
    }) => {
      const newBalance = Math.max(0, currentBalance - amount);
      const newStatus = newBalance <= 0 ? "paid_off" : "active";
      
      // Insert application record
      const { error: appError } = await supabase
        .from("draw_applications")
        .insert({
          draw_id: drawId,
          commission_id: commissionId,
          amount,
          applied_by: user!.id,
        });
      if (appError) throw appError;
      
      // Update draw balance
      const { error: drawError } = await supabase
        .from("draws")
        .update({
          remaining_balance: newBalance,
          status: newStatus,
        })
        .eq("id", drawId);
      if (drawError) throw drawError;
    },
    onSuccess: () => {
      toast.success("Commission applied to draw");
      queryClient.invalidateQueries({ queryKey: ["draws"] });
      queryClient.invalidateQueries({ queryKey: ["draw-applications"] });
    },
    onError: (error: any) => {
      toast.error("Failed to apply commission to draw: " + error.message);
    },
  });
}

export function useUpdateDrawSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      const { error } = await supabase
        .from("draw_settings")
        .update({ setting_value: value, updated_by: user!.id })
        .eq("setting_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Draw settings updated");
      queryClient.invalidateQueries({ queryKey: ["draw-settings"] });
    },
    onError: (error: any) => {
      toast.error("Failed to update setting: " + error.message);
    },
  });
}
