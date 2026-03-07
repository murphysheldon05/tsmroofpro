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
  const { user, isAdmin, isManager, role, userDepartment } = useAuth();
  const fullAccessRoles = ["admin", "manager", "sales_manager"];
  const hasFullAccess = role ? fullAccessRoles.includes(role) : (isAdmin || isManager);

  return useQuery({
    queryKey: ["new-warranty-count", user?.id, hasFullAccess, userDepartment],
    queryFn: async () => {
      let query = supabase
        .from("warranty_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      if (!hasFullAccess && user) {
        if (userDepartment === "Production") {
          query = query.eq("assigned_production_member", user.id);
        } else {
          query = query.or(`assigned_production_member.eq.${user.id},secondary_support.eq.${user.id},created_by.eq.${user.id}`);
        }
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

