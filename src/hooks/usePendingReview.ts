import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingItem {
  id: string;
  type: "commission" | "request" | "warranty";
  title: string;
  subtitle: string;
  status: string;
  priority: "high" | "medium" | "low";
  updated_at: string;
  created_at: string;
  requires_action: "review" | "revision" | "info_needed";
  rejection_reason?: string | null;
  submitted_by?: string;
}

export interface PendingReviewData {
  items: PendingItem[];
  counts: {
    commissions: number;
    requests: number;
    warranties: number;
    total: number;
  };
}

/**
 * Hook that returns role-appropriate pending review items.
 * - Managers/Admins: Items requiring their review/approval
 * - Standard Users: Items requiring THEIR action (revisions, info needed)
 */
export function usePendingReview() {
  const { user, isAdmin, isManager } = useAuth();
  const isReviewer = isAdmin || isManager;

  return useQuery({
    queryKey: ["pending-review", user?.id, isReviewer],
    queryFn: async () => {
      if (!user) return { items: [], counts: { commissions: 0, requests: 0, warranties: 0, total: 0 } };

      const items: PendingItem[] = [];

      if (isReviewer) {
        // MANAGERS/ADMINS: Show items needing their review
        
        // Pending commission submissions needing review
        const { data: pendingCommissions } = await supabase
          .from("commission_submissions")
          .select("id, job_name, job_address, status, approval_stage, updated_at, created_at, submitted_by")
          .eq("status", "pending_review")
          .order("created_at", { ascending: true })
          .limit(10);

        pendingCommissions?.forEach((c) => {
          items.push({
            id: c.id,
            type: "commission",
            title: c.job_name,
            subtitle: c.job_address,
            status: c.status,
            priority: "high",
            updated_at: c.updated_at,
            created_at: c.created_at,
            requires_action: "review",
            submitted_by: c.submitted_by,
          });
        });

        // Pending requests needing review
        const { data: pendingRequests } = await supabase
          .from("requests")
          .select("id, title, type, status, updated_at, created_at, submitted_by")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(10);

        pendingRequests?.forEach((r) => {
          items.push({
            id: r.id,
            type: "request",
            title: r.title,
            subtitle: r.type.replace(/_/g, " "),
            status: r.status,
            priority: "medium",
            updated_at: r.updated_at,
            created_at: r.created_at,
            requires_action: "review",
            submitted_by: r.submitted_by,
          });
        });

        // Pending warranties needing review
        const { data: pendingWarranties } = await supabase
          .from("warranty_requests")
          .select("id, customer_name, job_address, status, priority_level, updated_at, created_at")
          .in("status", ["submitted", "pending_assignment", "in_progress"])
          .order("created_at", { ascending: true })
          .limit(10);

        pendingWarranties?.forEach((w) => {
          const priority = w.priority_level === "high" || w.priority_level === "urgent" ? "high" : 
                          w.priority_level === "medium" ? "medium" : "low";
          items.push({
            id: w.id,
            type: "warranty",
            title: w.customer_name,
            subtitle: w.job_address,
            status: w.status,
            priority,
            updated_at: w.updated_at,
            created_at: w.created_at,
            requires_action: "review",
          });
        });

      } else {
        // STANDARD USERS: Show only items requiring THEIR action
        
        // Commissions returned for revision
        const { data: revisionCommissions } = await supabase
          .from("commission_submissions")
          .select("id, job_name, job_address, status, rejection_reason, updated_at, created_at")
          .eq("submitted_by", user.id)
          .eq("status", "revision_required")
          .order("updated_at", { ascending: true });

        revisionCommissions?.forEach((c) => {
          items.push({
            id: c.id,
            type: "commission",
            title: c.job_name,
            subtitle: c.job_address,
            status: c.status,
            priority: "high",
            updated_at: c.updated_at,
            created_at: c.created_at,
            requires_action: "revision",
            rejection_reason: c.rejection_reason,
          });
        });

        // Requests needing info from user
        const { data: infoRequests } = await supabase
          .from("requests")
          .select("id, title, type, status, rejection_reason, updated_at, created_at")
          .eq("submitted_by", user.id)
          .in("status", ["needs_info", "rejected"])
          .order("updated_at", { ascending: true });

        infoRequests?.forEach((r) => {
          items.push({
            id: r.id,
            type: "request",
            title: r.title,
            subtitle: r.type.replace(/_/g, " "),
            status: r.status,
            priority: r.status === "rejected" ? "high" : "medium",
            updated_at: r.updated_at,
            created_at: r.created_at,
            requires_action: r.status === "rejected" ? "revision" : "info_needed",
            rejection_reason: r.rejection_reason,
          });
        });
      }

      // Sort by priority (high first), then by oldest first
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      items.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Calculate counts by category
      const counts = {
        commissions: items.filter(i => i.type === "commission").length,
        requests: items.filter(i => i.type === "request").length,
        warranties: items.filter(i => i.type === "warranty").length,
        total: items.length,
      };

      return { items, counts };
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
}
