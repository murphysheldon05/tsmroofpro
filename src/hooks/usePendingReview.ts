import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInBusinessDays, addBusinessDays, isToday, isTomorrow, isPast, startOfDay } from "date-fns";

// SLA defaults (in business days) - could be made configurable via admin settings
export const SLA_DEFAULTS = {
  approval: 1,      // Approvals due in 1 business day
  request: 2,       // Requests due in 2 business days  
  commission: 2,    // Commissions due in 2 business days
  revision: 3,      // User revisions due in 3 business days
};

export type SlaStatus = "overdue" | "due_today" | "due_tomorrow" | "on_track";

export interface PendingItem {
  id: string;
  type: "commission" | "request" | "warranty";
  title: string;
  subtitle: string;
  status: string;
  priority: "high" | "medium" | "low";
  updated_at: string;
  created_at: string;
  submitted_at: string;
  requires_action: "review" | "revision" | "info_needed";
  rejection_reason?: string | null;
  submitted_by?: string;
  // SLA/Aging fields
  age_days: number;
  sla_due_at: Date;
  sla_status: SlaStatus;
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
 * Calculate business days between two dates (Mon-Fri only)
 */
function calculateAgeDays(fromDate: Date): number {
  const today = startOfDay(new Date());
  const start = startOfDay(fromDate);
  return differenceInBusinessDays(today, start);
}

/**
 * Calculate SLA due date based on submission date and SLA days
 */
function calculateSlaDueDate(submittedAt: Date, slaDays: number): Date {
  return addBusinessDays(startOfDay(submittedAt), slaDays);
}

/**
 * Determine SLA status based on due date
 */
function calculateSlaStatus(slaDueAt: Date): SlaStatus {
  const dueDate = startOfDay(slaDueAt);
  const today = startOfDay(new Date());
  
  if (isPast(dueDate) && !isToday(dueDate)) {
    return "overdue";
  }
  if (isToday(dueDate)) {
    return "due_today";
  }
  if (isTomorrow(dueDate)) {
    return "due_tomorrow";
  }
  return "on_track";
}

/**
 * Get SLA days based on item type and action required
 */
function getSlaDays(type: PendingItem["type"], requiresAction: PendingItem["requires_action"]): number {
  if (requiresAction === "revision" || requiresAction === "info_needed") {
    return SLA_DEFAULTS.revision;
  }
  switch (type) {
    case "commission":
      return SLA_DEFAULTS.commission;
    case "request":
      return SLA_DEFAULTS.request;
    case "warranty":
      return SLA_DEFAULTS.approval;
    default:
      return SLA_DEFAULTS.request;
  }
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
          .limit(20);

        pendingCommissions?.forEach((c) => {
          const submittedAt = new Date(c.created_at);
          const slaDays = getSlaDays("commission", "review");
          const slaDueAt = calculateSlaDueDate(submittedAt, slaDays);
          
          items.push({
            id: c.id,
            type: "commission",
            title: c.job_name,
            subtitle: c.job_address,
            status: c.status,
            priority: "high",
            updated_at: c.updated_at,
            created_at: c.created_at,
            submitted_at: c.created_at,
            requires_action: "review",
            submitted_by: c.submitted_by,
            age_days: calculateAgeDays(submittedAt),
            sla_due_at: slaDueAt,
            sla_status: calculateSlaStatus(slaDueAt),
          });
        });

        // Pending requests needing review
        const { data: pendingRequests } = await supabase
          .from("requests")
          .select("id, title, type, status, updated_at, created_at, submitted_by")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(20);

        pendingRequests?.forEach((r) => {
          const submittedAt = new Date(r.created_at);
          const slaDays = getSlaDays("request", "review");
          const slaDueAt = calculateSlaDueDate(submittedAt, slaDays);
          
          items.push({
            id: r.id,
            type: "request",
            title: r.title,
            subtitle: r.type.replace(/_/g, " "),
            status: r.status,
            priority: "medium",
            updated_at: r.updated_at,
            created_at: r.created_at,
            submitted_at: r.created_at,
            requires_action: "review",
            submitted_by: r.submitted_by,
            age_days: calculateAgeDays(submittedAt),
            sla_due_at: slaDueAt,
            sla_status: calculateSlaStatus(slaDueAt),
          });
        });

        // Pending warranties needing review (exclude completed/denied)
        const { data: pendingWarranties } = await supabase
          .from("warranty_requests")
          .select("id, customer_name, job_address, status, priority_level, updated_at, created_at, date_submitted")
          .in("status", ["new", "assigned", "in_review", "scheduled", "in_progress", "waiting_on_materials", "waiting_on_manufacturer"])
          .order("created_at", { ascending: true })
          .limit(20);

        pendingWarranties?.forEach((w) => {
          const priority = w.priority_level === "high" || w.priority_level === "urgent" ? "high" : 
                          w.priority_level === "medium" ? "medium" : "low";
          const submittedAt = new Date(w.date_submitted || w.created_at);
          const slaDays = getSlaDays("warranty", "review");
          const slaDueAt = calculateSlaDueDate(submittedAt, slaDays);
          
          items.push({
            id: w.id,
            type: "warranty",
            title: w.customer_name,
            subtitle: w.job_address,
            status: w.status,
            priority,
            updated_at: w.updated_at,
            created_at: w.created_at,
            submitted_at: w.date_submitted || w.created_at,
            requires_action: "review",
            age_days: calculateAgeDays(submittedAt),
            sla_due_at: slaDueAt,
            sla_status: calculateSlaStatus(slaDueAt),
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
          // For revisions, SLA is based on when it was returned (updated_at)
          const returnedAt = new Date(c.updated_at);
          const slaDays = getSlaDays("commission", "revision");
          const slaDueAt = calculateSlaDueDate(returnedAt, slaDays);
          
          items.push({
            id: c.id,
            type: "commission",
            title: c.job_name,
            subtitle: c.job_address,
            status: c.status,
            priority: "high",
            updated_at: c.updated_at,
            created_at: c.created_at,
            submitted_at: c.updated_at, // For revisions, track from return date
            requires_action: "revision",
            rejection_reason: c.rejection_reason,
            age_days: calculateAgeDays(returnedAt),
            sla_due_at: slaDueAt,
            sla_status: calculateSlaStatus(slaDueAt),
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
          const returnedAt = new Date(r.updated_at);
          const requiresAction = r.status === "rejected" ? "revision" : "info_needed";
          const slaDays = getSlaDays("request", requiresAction);
          const slaDueAt = calculateSlaDueDate(returnedAt, slaDays);
          
          items.push({
            id: r.id,
            type: "request",
            title: r.title,
            subtitle: r.type.replace(/_/g, " "),
            status: r.status,
            priority: r.status === "rejected" ? "high" : "medium",
            updated_at: r.updated_at,
            created_at: r.created_at,
            submitted_at: r.updated_at,
            requires_action: requiresAction,
            rejection_reason: r.rejection_reason,
            age_days: calculateAgeDays(returnedAt),
            sla_due_at: slaDueAt,
            sla_status: calculateSlaStatus(slaDueAt),
          });
        });
      }

      // Sort by: 1) SLA status (overdue first), 2) Priority, 3) Age (oldest first)
      const slaOrder: Record<SlaStatus, number> = { overdue: 0, due_today: 1, due_tomorrow: 2, on_track: 3 };
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      
      items.sort((a, b) => {
        // First by SLA status
        const slaDiff = slaOrder[a.sla_status] - slaOrder[b.sla_status];
        if (slaDiff !== 0) return slaDiff;
        
        // Then by priority
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by age (oldest first = largest age)
        return b.age_days - a.age_days;
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
