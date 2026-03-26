import type { BonusTier } from "@/lib/kpiTypes";

interface BonusTierPreviewProps {
  tiers: BonusTier[];
}

export function BonusTierPreview({ tiers }: BonusTierPreviewProps) {
  if (tiers.length === 0) return null;

  const sorted = [...tiers].sort((a, b) => b.min_avg - a.min_avg);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {sorted.map((tier, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: tier.color || "#FFD700" }}
          />
          <span className="font-medium">{tier.min_avg}+</span>
          <span>=</span>
          <span style={{ color: tier.color || "#FFD700" }} className="font-semibold">
            {tier.label}
          </span>
          <span className="text-muted-foreground">(${tier.amount})</span>
          {i < sorted.length - 1 && (
            <span className="text-muted-foreground mx-1">|</span>
          )}
        </span>
      ))}
      <span className="text-muted-foreground">
        | Below {sorted[sorted.length - 1]?.min_avg} = No Bonus
      </span>
    </div>
  );
}
