import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as UserNotification[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-notification-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
}

// Helper to create in-app notification (called from edge functions via service role)
export async function createNotification(
  userId: string,
  notification: {
    notification_type: string;
    title: string;
    message: string;
    entity_type?: string;
    entity_id?: string;
  }
) {
  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      ...notification,
    });

  if (error) {
    console.error('Failed to create notification:', error);
    return false;
  }
  return true;
}

// ─── Notification Preferences ─────────────────────────────────

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_commission_submitted: boolean;
  email_commission_approved: boolean;
  email_commission_rejected: boolean;
  email_commission_denied: boolean;
  email_commission_paid: boolean;
  email_commission_accounting_approved: boolean;
  updated_at: string;
}

const DEFAULT_PREFS: Omit<NotificationPreferences, 'id' | 'user_id' | 'updated_at'> = {
  email_commission_submitted: true,
  email_commission_approved: true,
  email_commission_rejected: true,
  email_commission_denied: true,
  email_commission_paid: true,
  email_commission_accounting_approved: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          id: '',
          user_id: user.id,
          updated_at: new Date().toISOString(),
          ...DEFAULT_PREFS,
        };
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (prefs: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'updated_at'>>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}
