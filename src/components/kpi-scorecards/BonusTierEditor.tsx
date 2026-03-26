import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { BONUS_TIER_PRESETS, type BonusTier } from "@/lib/kpiTypes";

interface BonusTierEditorProps {
  value: BonusTier[];
  onChange: (value: BonusTier[]) => void;
}

export function BonusTierEditor({ value, onChange }: BonusTierEditorProps) {
  const addTier = () => {
    onChange([
      ...value,
      { label: "", min_avg: 3.0, amount: 0, color: "#FFD700" },
    ]);
  };

  const removeTier = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateTier = (idx: number, partial: Partial<BonusTier>) => {
    const next = value.map((t, i) => (i === idx ? { ...t, ...partial } : t));
    next.sort((a, b) => b.min_avg - a.min_avg);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.map((tier, idx) => (
        <div
          key={idx}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3"
        >
          <div className="space-y-1 flex-1 min-w-[120px]">
            <Label className="text-xs">Tier Label</Label>
            <Input
              value={tier.label}
              onChange={(e) => updateTier(idx, { label: e.target.value })}
              placeholder="e.g. Gold"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1 w-[100px]">
            <Label className="text-xs">Min Avg</Label>
            <Input
              type="number"
              min={1}
              max={5}
              step={0.1}
              value={tier.min_avg}
              onChange={(e) =>
                updateTier(idx, { min_avg: parseFloat(e.target.value) || 0 })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1 w-[100px]">
            <Label className="text-xs">Amount ($)</Label>
            <Input
              type="number"
              min={0}
              step={25}
              value={tier.amount}
              onChange={(e) =>
                updateTier(idx, { amount: parseInt(e.target.value) || 0 })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={tier.color || "#FFD700"}
                onChange={(e) => updateTier(idx, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-border"
              />
              <div className="flex gap-0.5">
                {Object.entries(BONUS_TIER_PRESETS).map(([name, color]) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    className="w-5 h-5 rounded-sm border border-border/50 hover:ring-2 ring-primary/30"
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      updateTier(idx, { color, label: tier.label || name })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
            onClick={() => removeTier(idx)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addTier}>
        <Plus className="w-4 h-4 mr-1.5" />
        Add Tier
      </Button>
    </div>
  );
}
