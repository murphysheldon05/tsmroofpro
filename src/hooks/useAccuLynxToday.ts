import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TodayLaborItem {
  id: string;
  job_id: string;
  job_name: string;
  address_full: string;
  scheduled_datetime: string;
  roof_type: string | null;
  squares: number | null;
  map_url_primary: string;
  map_url_google: string | null;
  acculynx_job_url: string;
  source_event_id: string;
  last_synced_at: string;
}

export interface TodayDeliveryItem {
  id: string;
  job_id: string;
  job_name: string;
  address_full: string;
  scheduled_datetime: string;
  map_url_primary: string;
  map_url_google: string | null;
  acculynx_job_url: string;
  source_event_id: string;
  last_synced_at: string;
}

export function useTodayLabor() {
  return useQuery({
    queryKey: ["today-labor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("today_labor")
        .select("*")
        .order("scheduled_datetime", { ascending: true });

      if (error) throw error;
      return (data || []) as TodayLaborItem[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useTodayDeliveries() {
  return useQuery({
    queryKey: ["today-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("today_deliveries")
        .select("*")
        .order("scheduled_datetime", { ascending: true });

      if (error) throw error;
      return (data || []) as TodayDeliveryItem[];
    },
    refetchInterval: 60000,
  });
}

export function useTodayLaborCount() {
  return useQuery({
    queryKey: ["today-labor-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("today_labor")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });
}

export function useTodayDeliveriesCount() {
  return useQuery({
    queryKey: ["today-deliveries-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("today_deliveries")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });
}
