import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommissionTier {
  id: string;
  name: string;
  description: string | null;
  allowed_op_percentages: number[];
  allowed_profit_splits: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCommissionTier {
  id: string;
  user_id: string;
  tier_id: string;
  assigned_by: string | null;
  assigned_at: string;
  tier?: CommissionTier;
}

export function useCommissionTiers() {
  return useQuery({
    queryKey: ['commission-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as CommissionTier[];
    },
  });
}

export function useUserCommissionTier(userId?: string) {
  return useQuery({
    queryKey: ['user-commission-tier', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_commission_tiers')
        .select(`
          *,
          tier:commission_tiers(*)
        `)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data as (UserCommissionTier & { tier: CommissionTier }) | null;
    },
    enabled: !!userId,
  });
}

export function useAssignUserTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, tierId, assignedBy }: { userId: string; tierId: string; assignedBy: string }) => {
      // Upsert - update if exists, insert if not
      const { data, error } = await supabase
        .from('user_commission_tiers')
        .upsert({
          user_id: userId,
          tier_id: tierId,
          assigned_by: assignedBy,
          assigned_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-commission-tier', variables.userId] });
      toast.success('Commission tier assigned successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign commission tier: ' + error.message);
    },
  });
}

export function useRemoveUserTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_commission_tiers')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user-commission-tier', userId] });
      toast.success('Commission tier removed');
    },
    onError: (error) => {
      toast.error('Failed to remove commission tier: ' + error.message);
    },
  });
}

// Admin hooks for managing tiers
export function useCreateCommissionTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tier: Omit<CommissionTier, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .insert(tier)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-tiers'] });
      toast.success('Commission tier created');
    },
    onError: (error) => {
      toast.error('Failed to create commission tier: ' + error.message);
    },
  });
}

export function useUpdateCommissionTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CommissionTier> & { id: string }) => {
      const { data, error } = await supabase
        .from('commission_tiers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-tiers'] });
      toast.success('Commission tier updated');
    },
    onError: (error) => {
      toast.error('Failed to update commission tier: ' + error.message);
    },
  });
}

export function useDeleteCommissionTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission_tiers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-tiers'] });
      toast.success('Commission tier deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete commission tier: ' + error.message);
    },
  });
}
