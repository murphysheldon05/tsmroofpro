import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

// Today's Builds - filtered from production_calendar_events
export function useTodaysBuilds() {
  return useQuery({
    queryKey: ["todays-builds"],
    queryFn: async () => {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("production_calendar_events")
        .select(`
          *,
          crews:crew_id (
            id,
            name,
            color
          )
        `)
        .eq("start_date", todayStr)
        .neq("event_category", "delivery")
        .order("title", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// Today's Deliveries - filtered from delivery_calendar_events
export function useTodaysDeliveries() {
  return useQuery({
    queryKey: ["todays-deliveries"],
    queryFn: async () => {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("delivery_calendar_events")
        .select(`
          *,
          crews:crew_id (
            id,
            name,
            color
          )
        `)
        .eq("start_date", todayStr)
        .order("title", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });
}

// Action Required items
export function useActionRequired() {
  const { user, isAdmin, isManager } = useAuth();
  const isScopedUser = !isAdmin && !isManager;

  return useQuery({
    queryKey: ["action-required", user?.id, isScopedUser],
    queryFn: async () => {
      // Get pending warranty requests
      const { data: pendingWarranties, error: warrantyError } = await supabase
        .from("warranty_requests")
        .select("id, customer_name, job_address, status, updated_at, priority_level")
        .not("status", "in", '("completed","denied")')
        .order("updated_at", { ascending: true })
        .limit(5);

      if (warrantyError) throw warrantyError;

      // Get pending commission submissions — scoped for non-admins
      let commQuery = supabase
        .from("commission_submissions")
        .select("id, job_name, job_address, status, updated_at")
        .in("status", ["pending_review", "rejected"])
        .order("updated_at", { ascending: true })
        .limit(5);

      if (isScopedUser && user) {
        commQuery = commQuery.eq("submitted_by", user.id);
      }

      const { data: pendingCommissions, error: commissionError } = await commQuery;
      if (commissionError) throw commissionError;

      // Get pending requests — scoped for non-admins
      let reqQuery = supabase
        .from("requests")
        .select("id, title, type, status, updated_at")
        .eq("status", "pending")
        .order("updated_at", { ascending: true })
        .limit(5);

      if (isScopedUser && user) {
        reqQuery = reqQuery.eq("submitted_by", user.id);
      }

      const { data: pendingRequests, error: requestError } = await reqQuery;
      if (requestError) throw requestError;

      // Filter to items not updated in 3+ days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const staleWarranties = (pendingWarranties || []).filter(
        (w) => new Date(w.updated_at) < threeDaysAgo
      );

      return {
        pendingWarranties: pendingWarranties || [],
        pendingCommissions: pendingCommissions || [],
        pendingRequests: pendingRequests || [],
        staleWarranties,
      };
    },
    refetchInterval: 60000,
  });
}

// Quick Stats
export function useQuickStats() {
  const { user, isAdmin, isManager } = useAuth();
  const isScopedUser = !isAdmin && !isManager;

  return useQuery({
    queryKey: ["command-center-stats", user?.id, isScopedUser],
    queryFn: async () => {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");

      // Builds today
      const { count: buildsToday } = await supabase
        .from("production_calendar_events")
        .select("*", { count: "exact", head: true })
        .eq("start_date", todayStr)
        .neq("event_category", "delivery");

      // Deliveries today
      const { count: deliveriesToday } = await supabase
        .from("delivery_calendar_events")
        .select("*", { count: "exact", head: true })
        .eq("start_date", todayStr);

      // Open warranties
      const { count: openWarranties } = await supabase
        .from("warranty_requests")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("completed","denied")');

      // Pending approvals - scoped for non-admins
      let pendingRequestsCount = 0;
      if (!isScopedUser) {
        const { count } = await supabase
          .from("requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        pendingRequestsCount = count || 0;
      }

      let commQuery = supabase
        .from("commission_submissions")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending_review", "rejected"]);

      // Sales reps only see their own pending commissions
      if (isScopedUser) {
        commQuery = commQuery.eq("submitted_by", user!.id);
      }

      const { count: pendingCommissions } = await commQuery;

      return {
        buildsToday: buildsToday || 0,
        deliveriesToday: deliveriesToday || 0,
        openWarranties: openWarranties || 0,
        pendingApprovals: pendingRequestsCount + (pendingCommissions || 0),
      };
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}
