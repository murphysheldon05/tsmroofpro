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
  const { user, role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["cc-commission-summary", user?.id, role],
    queryFn: async () => {
      // Build base query - RLS handles per-user filtering for non-admin
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

      let drawQuery = supabase
        .from("commission_submissions")
        .select("advances_paid")
        .not("status", "in", '("paid","denied")');

      const [pendingRes, approvedRes, paidRes, drawRes] = await Promise.all([
        pendingQuery, approvedQuery, paidQuery, drawQuery,
      ]);

      const sum = (arr: any[] | null, field: string) =>
        (arr || []).reduce((s, r) => s + (r[field] || 0), 0);

      return {
        pending: sum(pendingRes.data, "net_commission_owed"),
        approved: sum(approvedRes.data, "net_commission_owed"),
        paid: sum(paidRes.data, "net_commission_owed"),
        draw: sum(drawRes.data, "advances_paid"),
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
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "Approved",
      value: data?.approved || 0,
      icon: CheckCircle,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Paid This Month",
      value: data?.paid || 0,
      icon: DollarSign,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      label: "Draw Balance",
      value: data?.draw || 0,
      icon: AlertTriangle,
      color: (data?.draw || 0) > 0 ? "text-red-500" : "text-muted-foreground",
      bg: (data?.draw || 0) > 0 ? "bg-red-500/10" : "bg-muted/50",
      border: (data?.draw || 0) > 0 ? "border-red-500/20" : "border-border/50",
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
            "rounded-2xl border p-4 transition-all duration-200 hover-lift",
            card.bg, card.border
          )}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <card.icon className={cn("w-4 h-4", card.color)} />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {card.label}
            </span>
          </div>
          <p className={cn("text-2xl font-bold tracking-tight", card.color)}>
            {formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
