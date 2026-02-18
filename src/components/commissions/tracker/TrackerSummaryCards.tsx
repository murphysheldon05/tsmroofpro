import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Briefcase, TrendingDown, BarChart3 } from "lucide-react";
import { formatUSD, type EnrichedEntry } from "@/hooks/useCommissionEntries";

interface TrackerSummaryCardsProps {
  entries: EnrichedEntry[];
  repCount: number;
}

export function TrackerSummaryCards({ entries, repCount }: TrackerSummaryCardsProps) {
  const totalPaid = entries.reduce((s, e) => s + e.amount_paid, 0);
  const jobCommissions = entries.filter((e) => e.pay_type_name === "Commission").reduce((s, e) => s + e.amount_paid, 0);
  const drawsAdvances = entries.filter((e) => e.pay_type_name !== "Commission").reduce((s, e) => s + e.amount_paid, 0);
  const totalJobValue = entries.filter((e) => e.job_value != null).reduce((s, e) => s + (e.job_value || 0), 0);
  const jobCount = entries.filter((e) => e.job_value != null && (e.job_value || 0) > 0).length;

  const cards = [
    { label: "Total Paid Out", value: formatUSD(totalPaid), icon: DollarSign, color: "text-emerald-600", border: "border-t-emerald-500" },
    { label: "Job Commissions", value: formatUSD(jobCommissions), icon: Briefcase, color: "text-blue-600", border: "border-t-blue-500" },
    { label: "Draws & Advances", value: formatUSD(drawsAdvances), icon: TrendingDown, color: "text-amber-600", border: "border-t-amber-500" },
    { label: "Total Job Value", value: formatUSD(totalJobValue), sub: `${jobCount} jobs · ${repCount} reps`, icon: BarChart3, color: "text-purple-600", border: "border-t-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className={`border-t-4 ${c.border}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
            </div>
            <div className="text-xl md:text-2xl font-extrabold tracking-tight">{c.value}</div>
            {c.sub && <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
