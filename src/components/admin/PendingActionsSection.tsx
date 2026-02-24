import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Pending Actions section — visible only to Sheldon (admin with management department).
 * Shows IT Requests awaiting assignment and Pending User Approvals with count badges.
 * Clicking either navigates to the relevant management page.
 */
export function PendingActionsSection() {
  const navigate = useNavigate();
  const { isAdmin, userDepartment } = useAuth();

  const isSheldon = isAdmin && userDepartment?.toLowerCase() === "management";
  if (!isSheldon) return null;

  const { data: counts, isLoading } = useQuery({
    queryKey: ["pending-actions-sheldon"],
    queryFn: async () => {
      const [itRes, profilesRes] = await Promise.all([
        supabase
          .from("requests")
          .select("*", { count: "exact", head: true })
          .eq("type", "it_access")
          .eq("status", "pending")
          .is("assigned_to", null),
        // Count profiles that need approval (matches PendingApprovals list; avoids orphaned pending_approval rows)
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_approved", false),
      ]);
      return {
        itRequests: itRes.count ?? 0,
        pendingApprovals: profilesRes.count ?? 0,
      };
    },
    enabled: isSheldon,
    refetchInterval: 30000,
  });

  const itCount = counts?.itRequests ?? 0;
  const approvalCount = counts?.pendingApprovals ?? 0;

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-4 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded mb-4" />
        <div className="space-y-2">
          <div className="h-10 bg-muted rounded-lg" />
          <div className="h-10 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Pending Actions</h2>
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="divide-y divide-border/50">
          <button
            onClick={() => navigate("/requests?type=it_access")}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-150",
              "hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-white/[0.02] active:scale-[0.99]"
            )}
          >
            <span className="flex items-center gap-3">
              <Send className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                IT Requests awaiting assignment
              </span>
            </span>
            <Badge
              variant={itCount > 0 ? "destructive" : "secondary"}
              className="min-w-[24px] justify-center"
            >
              {itCount}
            </Badge>
          </button>
          <button
            onClick={() => navigate("/admin#pending-approvals")}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-150",
              "hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-white/[0.02] active:scale-[0.99]"
            )}
          >
            <span className="flex items-center gap-3">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Pending User Approvals
              </span>
            </span>
            <Badge
              variant={approvalCount > 0 ? "destructive" : "secondary"}
              className="min-w-[24px] justify-center"
            >
              {approvalCount}
            </Badge>
          </button>
        </div>
      </div>
    </div>
  );
}
