import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommissionDocumentFormRow as FormRow } from "../CommissionDocumentFormRow";
import { FormSection } from "./FormSection";
import { CalculatedField } from "./CalculatedField";
import { formatTierPercent } from "@/lib/commissionDocumentCalculations";

const inputClasses = "transition-all duration-200 ease-out hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md text-base";

interface ProfitSplitSectionProps {
  profitSplitLabel: string;
  repProfitPercent: number;
  canEdit: boolean;
  tierLoading: boolean;
  tierName?: string;
  availableProfitSplitOptions: Array<{ label: string; op: number; rep: number; company: number }>;
  onProfitSplitChange: (label: string) => void;
}

export function ProfitSplitSection({
  profitSplitLabel,
  repProfitPercent,
  canEdit,
  tierLoading,
  tierName,
  availableProfitSplitOptions,
  onProfitSplitChange,
}: ProfitSplitSectionProps) {
  return (
    <FormSection title="Profit Split">
      <FormRow label="Profit Split" hint={`Available splits based on your ${tierName || 'tier'}`}>
        <Select
          value={profitSplitLabel}
          onValueChange={onProfitSplitChange}
          disabled={!canEdit || tierLoading}
        >
          <SelectTrigger className={`${inputClasses} font-mono`}>
            <SelectValue placeholder="Select profit split" />
          </SelectTrigger>
          <SelectContent>
            {availableProfitSplitOptions.map((opt) => (
              <SelectItem key={opt.label} value={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <CalculatedField 
        label="Rep Profit %" 
        value={formatTierPercent(repProfitPercent)}
      />
    </FormSection>
  );
}
