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

  const normalizeStage = (stage: string | null | undefined) => {
    // Legacy values (older DB constraint) -> current app values
    if (stage === "manager_approved") return "pending_accounting";
    if (stage === "accounting_approved" || stage === "approved") return "completed";
    if (stage === "pending") return "pending_manager";
    return stage ?? null;
  };

  const { data, isLoading } = useQuery({
    queryKey: ["cc-commission-summary", user?.id, role],
    queryFn: async () => {
      // Exclude draws from commission totals — draws tracked separately in draw_requests
      const commissionBase = supabase
        .from("commission_submissions")
        .select("net_commission_owed, status, approval_stage, paid_at")
        .or("is_draw.is.null,is_draw.eq.false");

      let allQuery = commissionBase;
      if (isScopedUser) {
        allQuery = allQuery.eq("submitted_by", user!.id);
      }

      const { data: allRows } = await allQuery;

      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const sum = (arr: any[] | null, field: string) =>
        (arr || []).reduce((s, r) => s + (Number(r?.[field] ?? 0) || 0), 0);

      // Pending Review = $ submitted awaiting compliance (pending_manager, pending_admin)
      const pendingReview = (allRows || []).filter(
        (r) => {
          const stage = normalizeStage(r.approval_stage);
          return (
            r.status === "pending_review" &&
            (stage === "pending_manager" || stage === "pending_admin" || stage == null)
          );
        }
      );

      // Ready for Payment = $ compliance approved, awaiting accounting (pending_accounting) + $ accounting approved (status=approved)
      const readyForPayment = (allRows || []).filter(
        (r) => {
          const stage = normalizeStage(r.approval_stage);
          return (
            (r.status === "pending_review" && stage === "pending_accounting") ||
            r.status === "approved"
          );
        }
      );

      // Paid This Month = $ marked paid this month
      const paidThisMonth = (allRows || []).filter(
        (r) => r.status === "paid" && r.paid_at && r.paid_at >= monthStart
      );

      // Draw balance from draw_requests table
      let drawQuery = supabase
        .from("draw_requests" as any)
        .select("remaining_balance")
        .in("status", ["approved", "paid"]);
      if (isScopedUser) {
        drawQuery = drawQuery.eq("user_id", user!.id);
      }
      const { data: drawData } = await drawQuery;

      return {
        pending: sum(pendingReview, "net_commission_owed"),
        approved: sum(readyForPayment, "net_commission_owed"),
        paid: sum(paidThisMonth, "net_commission_owed"),
        draw: sum(drawData, "remaining_balance"),
      };
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const cards = [
    {
      label: "Pending Review",
      value: data?.pending || 0,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      border: "border-t-[4px] border-t-amber-500",
    },
    {
      label: "Ready for Payment",
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
