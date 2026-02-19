import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { formatUSD, getRepInitials, type EnrichedEntry } from "@/hooks/useCommissionEntries";

interface RepCardProps {
  repName: string;
  repColor: string;
  entries: EnrichedEntry[];
  totalPaidAllReps: number;
  onClick: () => void;
}

export function RepCard({ repName, repColor, entries, totalPaidAllReps, onClick }: RepCardProps) {
  const ytdPaid = entries.filter((e) => e.pay_type_name !== "Training Draw (NR)").reduce((s, e) => s + e.amount_paid, 0);
  const jobCount = entries.filter((e) => e.pay_type_name === "Commission").length;
  const commissionTotal = entries.filter((e) => e.pay_type_name === "Commission").reduce((s, e) => s + e.amount_paid, 0);
  const drawTotal = entries.filter((e) => e.pay_type_name !== "Commission" && e.pay_type_name !== "Training Draw (NR)").reduce((s, e) => s + e.amount_paid, 0);
  const pctOfTotal = totalPaidAllReps > 0 ? (ytdPaid / totalPaidAllReps) * 100 : 0;

  return (
    <Card
      className="cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150 border border-border/60"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback style={{ backgroundColor: repColor }} className="text-white text-sm font-bold">
              {getRepInitials(repName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">{repName}</div>
            <div className="text-xs text-muted-foreground">{jobCount} jobs · {entries.length} entries</div>
          </div>
        </div>
        <div className="text-2xl font-extrabold tracking-tight mb-2">{formatUSD(ytdPaid)}</div>
        <div className="flex gap-3 text-xs text-muted-foreground mb-3">
          <span className="text-green-600 font-medium">Comm: {formatUSD(commissionTotal)}</span>
          <span className="text-amber-600 font-medium">Draw: {formatUSD(drawTotal)}</span>
        </div>
        <Progress value={pctOfTotal} className="h-1.5" />
        <div className="text-[10px] text-muted-foreground mt-1 text-right">{pctOfTotal.toFixed(1)}% of total</div>
      </CardContent>
    </Card>
  );
}
