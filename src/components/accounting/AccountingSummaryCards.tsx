import { useMemo } from "react";
import { DollarSign, CheckCircle, Clock, Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAccountingCommissions } from "@/hooks/useAccountingCommissions";

function formatCurrency(val: number) {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

export function AccountingSummaryCards() {
  const { data: commissions } = useAccountingCommissions();

  const stats = useMemo(() => {
    if (!commissions) return { paidThisRun: 0, owedNextRun: 0, totalPending: 0, taxEstimate: 0 };

    const now = new Date();
    const mstOffset = -7 * 60;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mstTime = new Date(utcTime + (mstOffset * 60000));
    const dayOfWeek = mstTime.getDay();
    const hour = mstTime.getHours();
    const isBeforeDeadline = dayOfWeek < 2 || (dayOfWeek === 2 && hour < 15);

    // Get current week boundaries (Sunday to Saturday)
    const weekStart = new Date(mstTime);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const paid = commissions.filter(c => c.status === 'paid');
    const approved = commissions.filter(c => c.status === 'approved');

    // Paid this week/run
    const paidThisRun = paid
      .filter(c => c.paid_at && new Date(c.paid_at) >= weekStart)
      .reduce((sum, c) => sum + (c.rep_commission || 0), 0);

    // Owed next run = all approved not yet paid
    const owedNextRun = approved.reduce((sum, c) => sum + (c.rep_commission || 0), 0);

    // Total pending (approved waiting to be marked paid)
    const totalPending = approved.length;

    // Rough payroll tax estimate (~15.3% FICA for employers)
    const taxEstimate = owedNextRun * 0.153;

    return { paidThisRun, owedNextRun, totalPending, taxEstimate };
  }, [commissions]);

  const cards = [
    {
      label: "Paid This Run",
      value: formatCurrency(stats.paidThisRun),
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      border: "border-t-emerald-500",
    },
    {
      label: "Owed Next Run",
      value: formatCurrency(stats.owedNextRun),
      icon: DollarSign,
      color: "text-blue-600 dark:text-blue-400",
      border: "border-t-blue-500",
    },
    {
      label: "Pending Payouts",
      value: String(stats.totalPending),
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      border: "border-t-amber-500",
    },
    {
      label: "Est. Payroll Taxes",
      value: formatCurrency(stats.taxEstimate),
      icon: Calculator,
      color: "text-purple-600 dark:text-purple-400",
      border: "border-t-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className={`border-t-4 ${card.border} bg-card/60`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-extrabold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
