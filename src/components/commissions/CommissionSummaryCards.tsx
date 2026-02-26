import { DollarSign, Clock, CheckCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommissionSummaryCardsProps {
  total?: number;
  pending?: number;
  approved?: number;
  paid?: number;
  totalSubmittedAmount: number;
  complianceApprovedAmount: number;
  accountingApprovedAmount: number;
  paidAmount: number;
}

const formatFullCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export function CommissionSummaryCards({
  totalSubmittedAmount,
  complianceApprovedAmount,
  accountingApprovedAmount,
  paidAmount,
}: CommissionSummaryCardsProps) {
  const cards = [
    {
      label: "Total Submitted",
      value: formatFullCurrency(totalSubmittedAmount),
      icon: <Wallet className="h-5 w-5" />,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
      borderClass: "border-primary/20",
    },
    {
      label: "Compliance Approved",
      value: formatFullCurrency(complianceApprovedAmount),
      icon: <Clock className="h-5 w-5" />,
      colorClass: "text-amber-400",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/20",
    },
    {
      label: "Accounting Approved",
      value: formatFullCurrency(accountingApprovedAmount),
      icon: <CheckCircle className="h-5 w-5" />,
      colorClass: "text-emerald-400",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/20",
    },
    {
      label: "Paid",
      value: formatFullCurrency(paidAmount),
      icon: <DollarSign className="h-5 w-5" />,
      colorClass: "text-sky-400",
      bgClass: "bg-sky-500/10",
      borderClass: "border-sky-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "rounded-2xl border p-4 backdrop-blur-sm transition-all duration-200",
            card.bgClass, card.borderClass
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={card.colorClass}>{card.icon}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {card.label}
            </span>
          </div>
          <p className={cn("text-2xl md:text-3xl font-bold tracking-tight", card.colorClass)}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
