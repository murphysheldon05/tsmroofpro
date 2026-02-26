import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommissionDocumentFormRow as FormRow } from "../CommissionDocumentFormRow";
import { FormSection } from "./FormSection";
import { CurrencyInput } from "./CurrencyInput";
import { CalculatedField } from "./CalculatedField";
import { formatCurrency } from "@/lib/utils";

const inputClasses = "transition-all duration-200 ease-out hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md text-base";

interface ContractSectionProps {
  grossContractTotal: number;
  opPercent: number;
  opAmount: number;
  contractTotalNet: number;
  materialCost: number;
  laborCost: number;
  canEdit: boolean;
  tierLoading: boolean;
  tierName?: string;
  availableOpOptions: Array<{ value: number; label: string }>;
  getDisplayValue: (field: string, value: number) => string;
  onMoneyFocus: (field: string, value: number) => void;
  onMoneyChange: (value: string) => void;
  onMoneyCommit: (field: string) => void;
  onOpPercentChange: (value: string) => void;
}

export function ContractSection({
  grossContractTotal,
  opPercent,
  opAmount,
  contractTotalNet,
  materialCost,
  laborCost,
  canEdit,
  tierLoading,
  tierName,
  availableOpOptions,
  getDisplayValue,
  onMoneyFocus,
  onMoneyChange,
  onMoneyCommit,
  onOpPercentChange,
}: ContractSectionProps) {
  return (
    <FormSection title="Contract & Expense Inputs">
      <FormRow label="Contract Total (Gross)">
        <CurrencyInput
          value={getDisplayValue("gross_contract_total", grossContractTotal)}
          onChange={onMoneyChange}
          onFocus={() => onMoneyFocus("gross_contract_total", grossContractTotal)}
          onBlur={() => onMoneyCommit("gross_contract_total")}
          disabled={!canEdit}
          required
        />
      </FormRow>

      <FormRow label="O&P %" hint={`Based on your tier: ${tierName || 'Loading...'}`}>
        <Select
          value={opPercent.toString()}
          onValueChange={onOpPercentChange}
          disabled={!canEdit || tierLoading}
        >
          <SelectTrigger className={`${inputClasses} font-mono`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableOpOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      <CalculatedField label="O&P $ Amount" value={formatCurrency(opAmount)} />
      
      <CalculatedField 
        label="Contract Total (Net)" 
        value={formatCurrency(contractTotalNet)}
        hint="Commissions and expenses calculated off of Net contract total."
      />

      <FormRow label="Material" hint="Initial Material order">
        <CurrencyInput
          value={getDisplayValue("material_cost", materialCost)}
          onChange={onMoneyChange}
          onFocus={() => onMoneyFocus("material_cost", materialCost)}
          onBlur={() => onMoneyCommit("material_cost")}
          disabled={!canEdit}
          required
        />
      </FormRow>

      <FormRow label="Labor" hint="Initial Labor Order">
        <CurrencyInput
          value={getDisplayValue("labor_cost", laborCost)}
          onChange={onMoneyChange}
          onFocus={() => onMoneyFocus("labor_cost", laborCost)}
          onBlur={() => onMoneyCommit("labor_cost")}
          disabled={!canEdit}
          required
        />
      </FormRow>
    </FormSection>
  );
}
