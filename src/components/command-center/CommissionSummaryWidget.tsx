import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, CheckCircle, DollarSign, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfMonth, format } from "date-fns";

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 10000) return `$${(value / 1000).toFixed(0)}K`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
};

export function CommissionSummaryWidget() {
  const { user, role, isAdmin, isManager } = useAuth();
  const isScopedUser = !isAdmin && !isManager;

  const { data, isLoading } = useQuery({
    queryKey: ["cc-commission-summary", user?.id, role],
    queryFn: async () => {
      let pendingQuery = supabase
        .from("commission_submissions")
        .select("net_commission_owed")
        .eq("status", "pending_review");

      let approvedQuery = supabase
        .from("commission_submissions")
        .select("net_commission_owed")
        .eq("status", "approved");

      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      let paidQuery = supabase
        .from("commission_submissions")
        .select("net_commission_owed, paid_at")
        .eq("status", "paid")
        .gte("paid_at", monthStart);

      // Draw balance from draw_requests table
      let drawQuery = supabase
        .from("draw_requests" as any)
        .select("remaining_balance")
        .in("status", ["approved", "paid"]);

      // Data isolation: sales reps & employees only see their own data
      if (isScopedUser) {
        pendingQuery = pendingQuery.eq("submitted_by", user!.id);
        approvedQuery = approvedQuery.eq("submitted_by", user!.id);
        paidQuery = paidQuery.eq("submitted_by", user!.id);
        drawQuery = drawQuery.eq("user_id", user!.id);
      }

      const [pendingRes, approvedRes, paidRes, drawRes] = await Promise.all([
        pendingQuery, approvedQuery, paidQuery, drawQuery,
      ]);

      const sum = (arr: any[] | null, field: string) =>
        (arr || []).reduce((s, r) => s + (r[field] || 0), 0);

      return {
        pending: sum(pendingRes.data, "net_commission_owed"),
        approved: sum(approvedRes.data, "net_commission_owed"),
        paid: sum(paidRes.data, "net_commission_owed"),
        draw: sum(drawRes.data, "remaining_balance"),
      };
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const cards = [
    {
      label: "Pending",
      value: data?.pending || 0,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      border: "border-t-[4px] border-t-amber-500",
    },
    {
      label: "Approved",
      value: data?.approved || 0,
      icon: CheckCircle,
      color: "text-blue-600 dark:text-blue-400",
      border: "border-t-[4px] border-t-blue-500",
    },
    {
      label: "Paid This Month",
      value: data?.paid || 0,
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      border: "border-t-[4px] border-t-green-500",
    },
    {
      label: "Draw Balance",
      value: data?.draw || 0,
      icon: AlertTriangle,
      color: (data?.draw || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
      border: (data?.draw || 0) > 0 ? "border-t-[4px] border-t-red-500" : "border-t-[4px] border-t-muted",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-card animate-pulse border border-border/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "rounded-[14px] border border-border/50 bg-card p-4 transition-all duration-200 hover-lift shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
            card.border
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <card.icon className={cn("w-4 h-4", card.color)} />
            <span className={cn("text-[11px] font-medium uppercase tracking-wider", card.color)}>
              {card.label}
            </span>
          </div>
          <p className={cn("text-[28px] font-extrabold tracking-tight", card.color)}>
            {formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
