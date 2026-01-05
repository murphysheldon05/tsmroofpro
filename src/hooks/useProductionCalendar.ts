import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductionCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useProductionCalendarEvents() {
  return useQuery({
    queryKey: ["production-calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_calendar_events")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data as ProductionCalendarEvent[];
    },
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: {
      title: string;
      description?: string;
      start_date: string;
      end_date?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("production_calendar_events")
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
      queryClient.invalidateQueries({ queryKey: ["production-calendar-events"] });
      toast.success("Event added to calendar");
    },
    onError: (error) => {
      toast.error("Failed to add event: " + error.message);
    },
  });
}

export function useUpdateCalendarEvent() {
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
    }) => {
      const { data, error } = await supabase
        .from("production_calendar_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-calendar-events"] });
      toast.success("Event updated");
    },
    onError: (error) => {
      toast.error("Failed to update event: " + error.message);
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("production_calendar_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-calendar-events"] });
      toast.success("Event deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete event: " + error.message);
    },
  });
}
