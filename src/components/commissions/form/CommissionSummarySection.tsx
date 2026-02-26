import { CommissionDocumentFormRow as FormRow } from "../CommissionDocumentFormRow";
import { FormSection } from "./FormSection";
import { CurrencyInput } from "./CurrencyInput";
import { CalculatedField } from "./CalculatedField";
import { formatCurrency } from "@/lib/utils";

interface CommissionSummarySectionProps {
  netProfit: number;
  repCommission: number;
  advanceTotal: number;
  companyProfit: number;
  canEdit: boolean;
  isPrivileged: boolean;
  getDisplayValue: (field: string, value: number) => string;
  onMoneyFocus: (field: string, value: number) => void;
  onMoneyChange: (value: string) => void;
  onMoneyCommit: (field: string) => void;
}

export function CommissionSummarySection({
  netProfit,
  repCommission,
  advanceTotal,
  companyProfit,
  canEdit,
  isPrivileged,
  getDisplayValue,
  onMoneyFocus,
  onMoneyChange,
  onMoneyCommit,
}: CommissionSummarySectionProps) {
  return (
    <FormSection title="Commission Summary" variant="primary">
      <CalculatedField 
        label="Net Profit" 
        value={formatCurrency(netProfit)}
        hint="This is the Commissionable profit on the job, calculated off the net contract after O&P is removed."
      />

      <CalculatedField 
        label="Rep Commission" 
        value={formatCurrency(repCommission)}
        highlight
        hint="This is the total dollars paid to rep"
      />

      <FormRow label="Advance Total">
        <CurrencyInput
          value={getDisplayValue("advance_total", advanceTotal)}
          onChange={onMoneyChange}
          onFocus={() => onMoneyFocus("advance_total", advanceTotal)}
          onBlur={() => onMoneyCommit("advance_total")}
          disabled={!canEdit}
        />
      </FormRow>

      {isPrivileged && (
        <CalculatedField 
          label="Company Profit" 
          value={formatCurrency(companyProfit)}
          hint="Total Company profit, not rep facing"
        />
      )}
    </FormSection>
  );
}
