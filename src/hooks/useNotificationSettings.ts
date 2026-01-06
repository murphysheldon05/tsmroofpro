import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationSetting {
  id: string;
  notification_type: string;
  recipient_email: string;
  recipient_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as NotificationSetting[];
    },
  });
}

export function useCreateNotificationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setting: {
      notification_type: string;
      recipient_email: string;
      recipient_name?: string;
    }) => {
      const { data, error } = await supabase
        .from("notification_settings")
        .insert(setting)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Notification recipient added");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("This email is already added for this notification type");
      } else {
        toast.error("Failed to add recipient: " + error.message);
      }
    },
  });
}

export function useUpdateNotificationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      recipient_email?: string;
      recipient_name?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("notification_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Notification setting updated");
    },
    onError: (error) => {
      toast.error("Failed to update setting: " + error.message);
    },
  });
}

export function useDeleteNotificationSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Notification recipient removed");
    },
    onError: (error) => {
      toast.error("Failed to remove recipient: " + error.message);
    },
  });
}
