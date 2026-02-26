import { useMemo } from "react";
import { DollarSign, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCommissionSubmissions } from "@/hooks/useCommissions";
import { formatCurrency } from "@/lib/utils";

/** Admin/Accounting view: 3 boxes — Total Submitted (awaiting compliance), Compliance Approved (awaiting accounting), Accounting Approved (ready for payment). */
export function AccountingSummaryCards() {
  const { data: submissions } = useCommissionSubmissions();

  const stats = useMemo(() => {
    const list = submissions || [];
    const totalSubmitted = list.filter(
      (s) => s.status === "pending_review" && s.approval_stage === "pending_manager"
    );
    const complianceApproved = list.filter(
      (s) => s.status === "pending_review" && s.approval_stage === "pending_accounting"
    );
    const accountingApproved = list.filter((s) => s.status === "approved");

    return {
      totalSubmittedCount: totalSubmitted.length,
      totalSubmittedAmount: totalSubmitted.reduce((sum, s) => sum + (s.net_commission_owed || 0), 0),
      complianceApprovedCount: complianceApproved.length,
      complianceApprovedAmount: complianceApproved.reduce((sum, s) => sum + (s.net_commission_owed || 0), 0),
      accountingApprovedCount: accountingApproved.length,
      accountingApprovedAmount: accountingApproved.reduce(
        (sum, s) => sum + (s.commission_approved ?? s.net_commission_owed ?? 0),
        0
      ),
    };
  }, [submissions]);

  const cards = [
    {
      label: "Total Submitted",
      sublabel: "Awaiting compliance review",
      value: `${stats.totalSubmittedCount} · ${formatCurrency(stats.totalSubmittedAmount)}`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      border: "border-t-amber-500",
    },
    {
      label: "Compliance Approved",
      sublabel: "Awaiting accounting",
      value: `${stats.complianceApprovedCount} · ${formatCurrency(stats.complianceApprovedAmount)}`,
      icon: CheckCircle,
      color: "text-blue-600 dark:text-blue-400",
      border: "border-t-blue-500",
    },
    {
      label: "Accounting Approved",
      sublabel: "Ready for payment",
      value: `${stats.accountingApprovedCount} · ${formatCurrency(stats.accountingApprovedAmount)}`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      border: "border-t-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className={`border-t-4 ${card.border} bg-card/60`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            </div>
            {card.sublabel && (
              <p className="text-xs text-muted-foreground mb-1">{card.sublabel}</p>
            )}
            <p className="text-2xl font-extrabold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
