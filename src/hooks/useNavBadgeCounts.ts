import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** True if current user is Sheldon (admin with management department). */
function useIsSheldon() {
  const { user, isAdmin, userDepartment } = useAuth();
  const deptMatch = userDepartment?.toLowerCase() === "management";
  return !!user && isAdmin && deptMatch;
}

/** Count of IT requests + pending user approvals for Sheldon (admin with management department). Used for Admin Panel nav badge. */
export function useSheldonPendingCount() {
  const { user } = useAuth();
  const isSheldon = useIsSheldon();

  return useQuery({
    queryKey: ["sheldon-pending-count", user?.id, isSheldon],
    queryFn: async () => {
      const [itRes, approvalsRes] = await Promise.all([
        supabase
          .from("requests")
          .select("*", { count: "exact", head: true })
          .eq("type", "it_access")
          .eq("status", "pending")
          .is("assigned_to", null),
        supabase
          .from("pending_approvals")
          .select("*", { count: "exact", head: true })
          .eq("entity_type", "user")
          .eq("status", "pending"),
      ]);
      return (itRes.count ?? 0) + (approvalsRes.count ?? 0);
    },
    enabled: isSheldon,
    refetchInterval: 60000,
  });
}

/** Count of commission submissions awaiting compliance review (Submitted status). */
export function usePendingComplianceCount() {
  return useQuery({
    queryKey: ["pending-compliance-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("commission_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review")
        .in("approval_stage", ["pending_manager", "pending_admin"]);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60000,
  });
}

/** Count of warranty requests in 'New' status (not yet acknowledged / moved to In Progress). */
export function useNewWarrantyCount() {
  return useQuery({
    queryKey: ["new-warranty-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("warranty_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60000,
  });
}

/** Count of new Announcement/Update posts since user last visited Message Center. */
export function useMessageCenterBadgeCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["message-center-badge-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data: visit } = await supabase
        .from("message_center_last_visit")
        .select("last_visited_at")
        .eq("user_id", user.id)
        .maybeSingle();
      const since = visit?.last_visited_at ?? "1970-01-01T00:00:00Z";
      const { count, error } = await supabase
        .from("feed_posts")
        .select("*", { count: "exact", head: true })
        .in("post_type", ["announcement", "update"])
        .gt("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}
