import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EventCategory = "new_install" | "repair" | "inspection" | "maintenance" | "delivery" | "other";

export const EVENT_CATEGORIES: Record<EventCategory, { label: string; color: string; bgColor: string }> = {
  new_install: { label: "New Install", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40" },
  repair: { label: "Repair", color: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/40" },
  inspection: { label: "Inspection", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/40" },
  maintenance: { label: "Maintenance", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40" },
  delivery: { label: "Delivery", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40" },
  other: { label: "Other", color: "text-slate-700 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/40" },
};

export interface ProductionCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  event_category: EventCategory;
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
      event_category?: EventCategory;
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
      event_category?: EventCategory;
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
