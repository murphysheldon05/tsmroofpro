import { CommissionDocumentFormRow as FormRow } from "../CommissionDocumentFormRow";
import { FormSection } from "./FormSection";
import { CurrencyInput } from "./CurrencyInput";
import type { CommissionFormRowVariant } from "../CommissionDocumentFormRow";

interface ExpenseField {
  key: string;
  label: string;
  hint?: string;
}

interface ExpensesSectionProps {
  title: string;
  variant: "negative" | "positive";
  expenses: ExpenseField[];
  values: Record<string, number>;
  canEdit: boolean;
  getDisplayValue: (field: string, value: number) => string;
  onMoneyFocus: (field: string, value: number) => void;
  onMoneyChange: (value: string) => void;
  onMoneyCommit: (field: string) => void;
}

export function ExpensesSection({
  title,
  variant,
  expenses,
  values,
  canEdit,
  getDisplayValue,
  onMoneyFocus,
  onMoneyChange,
  onMoneyCommit,
}: ExpensesSectionProps) {
  const formRowVariant: CommissionFormRowVariant = variant;
  
  return (
    <FormSection title={title} variant={variant}>
      {expenses.map((expense) => (
        <FormRow 
          key={expense.key} 
          label={expense.label} 
          variant={formRowVariant}
          hint={expense.hint}
        >
          <CurrencyInput
            value={getDisplayValue(expense.key, values[expense.key] || 0)}
            onChange={onMoneyChange}
            onFocus={() => onMoneyFocus(expense.key, values[expense.key] || 0)}
            onBlur={() => onMoneyCommit(expense.key)}
            disabled={!canEdit}
          />
        </FormRow>
      ))}
    </FormSection>
  );
}

// Define expense field configurations
export const NEGATIVE_EXPENSES: ExpenseField[] = [
  { key: "neg_exp_1", label: "Additional expenses (-) #1", hint: "Will calls, lumber, Home Depot, Misc. expenses" },
  { key: "neg_exp_2", label: "Additional expenses (-) #2", hint: "Will calls, lumber, Home Depot, Misc. expenses" },
  { key: "neg_exp_3", label: "Additional expenses (-) #3", hint: "Will calls, lumber, Home Depot, Misc. expenses" },
  { key: "neg_exp_4", label: "Additional expenses (-) #4", hint: "Supplement fees" },
];

export const POSITIVE_EXPENSES: ExpenseField[] = [
  { key: "pos_exp_1", label: "Additional expenses (+) #1", hint: "Returns added back if rep returns materials" },
  { key: "pos_exp_2", label: "Additional expenses (+) #2" },
  { key: "pos_exp_3", label: "Additional expenses (+) #3" },
  { key: "pos_exp_4", label: "Additional expenses (+) #4" },
];
