import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DeliveryCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  crew_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDeliveryCalendarEvents() {
  return useQuery({
    queryKey: ["delivery-calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_calendar_events")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data as DeliveryCalendarEvent[];
    },
  });
}

export function useCreateDeliveryEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: {
      title: string;
      description?: string;
      start_date: string;
      end_date?: string;
      crew_id?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("delivery_calendar_events")
        .insert({
          ...event,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-calendar-events"] });
      toast.success("Delivery event added");
    },
    onError: (error) => {
      toast.error("Failed to add delivery event: " + error.message);
    },
  });
}

export function useUpdateDeliveryEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      title?: string;
      description?: string;
      start_date?: string;
      end_date?: string | null;
      crew_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("delivery_calendar_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-calendar-events"] });
      toast.success("Delivery event updated");
    },
    onError: (error) => {
      toast.error("Failed to update delivery event: " + error.message);
    },
  });
}

export function useDeleteDeliveryEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("delivery_calendar_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-calendar-events"] });
      toast.success("Delivery event deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete delivery event: " + error.message);
    },
  });
}
