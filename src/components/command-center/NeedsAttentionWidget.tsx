import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, AlertCircle, DollarSign, Wrench, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttentionItem {
  label: string;
  count: number;
  color: "red" | "amber" | "blue" | "green";
  href: string;
}

const colorMap = {
  red: "bg-red-500 text-white",
  amber: "bg-amber-500 text-white",
  blue: "bg-blue-500 text-white",
  green: "bg-green-500 text-white",
};

const colorMapMuted = {
  red: "bg-[#f1f4f7] text-[#9ca3af] dark:bg-muted dark:text-muted-foreground",
  amber: "bg-[#f1f4f7] text-[#9ca3af] dark:bg-muted dark:text-muted-foreground",
  blue: "bg-[#f1f4f7] text-[#9ca3af] dark:bg-muted dark:text-muted-foreground",
  green: "bg-[#f1f4f7] text-[#9ca3af] dark:bg-muted dark:text-muted-foreground",
};

export function NeedsAttentionWidget() {
  const { isAdmin, isManager, role } = useAuth();
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["needs-attention", role],
    queryFn: async () => {
      const results: AttentionItem[] = [];

      // Commissions Pending Review
      const { count: pendingCommissions } = await supabase
        .from("commission_submissions")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending_review"]);

      results.push({
        label: "Commissions Pending Review",
        count: pendingCommissions || 0,
        color: "red",
        href: "/commissions",
      });

      // IT Requests Awaiting Assignment
      const { count: unassignedIT } = await supabase
        .from("it_requests")
        .select("*", { count: "exact", head: true })
        .is("assigned_to_id", null)
        .neq("status", "resolved");

      results.push({
        label: "IT Requests Awaiting Assignment",
        count: unassignedIT || 0,
        color: "amber",
        href: "/requests",
      });

      // Commissions Ready for Payment
      const { count: readyForPayment } = await supabase
        .from("commission_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      results.push({
        label: "Commissions Ready for Payment",
        count: readyForPayment || 0,
        color: "blue",
        href: "/commissions",
      });

      // Pending User Approvals (admin only)
      if (isAdmin) {
        const { count: pendingApprovals } = await supabase
          .from("pending_approvals")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        results.push({
          label: "Pending User Approvals",
          count: pendingApprovals || 0,
          color: "green",
          href: "/admin",
        });
      }

      return results;
    },
    enabled: isAdmin || isManager,
    refetchInterval: 60000,
  });

  // Don't render for non-admin/manager roles
  if (!isAdmin && !isManager) return null;

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-5 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4.5 h-4.5 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Needs Your Attention</h3>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.href)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 min-h-[44px]",
              "hover:bg-[rgba(0,0,0,0.02)] dark:hover:bg-white/[0.02] active:scale-[0.98]",
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0",
                item.count > 0 ? colorMap[item.color] : colorMapMuted[item.color]
              )}
            >
              {item.count}
            </span>
            <span className={cn("text-left", item.count === 0 ? "text-[#9ca3af]" : "text-foreground font-medium")}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
