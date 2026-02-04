/**
 * TSM Roofing LLC Official Commission Document - Shared Calculation Module
 * Used on both client and server to ensure consistency
 * 
 * FORMULAS (from official worksheet):
 * A) O&P $ Amount = gross_contract_total * op_percent
 * B) Contract Total (Net) = gross_contract_total - op_amount
 * C) Net Profit = contract_total_net - material - labor - neg_expenses + pos_expenses
 * D) Rep Commission = net_profit * rep_profit_percent
 * E) Company Profit = op_amount + (net_profit - rep_commission)
 */

export interface CommissionDocumentData {
  gross_contract_total: number;
  op_percent: number;
  material_cost: number;
  labor_cost: number;
  neg_exp_1: number;
  neg_exp_2: number;
  neg_exp_3: number;
  neg_exp_4: number; // Supplement fees
  pos_exp_1: number;
  pos_exp_2: number;
  pos_exp_3: number;
  pos_exp_4: number;
  rep_profit_percent: number; // From profit split (e.g., 0.40)
  advance_total: number;
}

export interface CalculatedFields {
  op_amount: number;
  contract_total_net: number;
  net_profit: number;
  rep_commission: number;
  company_profit: number;
}

// Profit Split options as defined in the worksheet (default fallback)
export const PROFIT_SPLIT_OPTIONS = [
  { label: "15/35/65", op: 0.15, rep: 0.35, company: 0.65 },
  { label: "15/40/60", op: 0.15, rep: 0.40, company: 0.60 },
  { label: "15/45/55", op: 0.15, rep: 0.45, company: 0.55 },
  { label: "15/50/50", op: 0.15, rep: 0.50, company: 0.50 },
  { label: "15/55/45", op: 0.15, rep: 0.55, company: 0.45 },
  { label: "15/60/40", op: 0.15, rep: 0.60, company: 0.40 },
  { label: "12.5/35/65", op: 0.125, rep: 0.35, company: 0.65 },
  { label: "12.5/40/60", op: 0.125, rep: 0.40, company: 0.60 },
  { label: "12.5/45/55", op: 0.125, rep: 0.45, company: 0.55 },
  { label: "12.5/50/50", op: 0.125, rep: 0.50, company: 0.50 },
  { label: "10/35/65", op: 0.10, rep: 0.35, company: 0.65 },
  { label: "10/40/60", op: 0.10, rep: 0.40, company: 0.60 },
  { label: "10/45/55", op: 0.10, rep: 0.45, company: 0.55 },
  { label: "10/50/50", op: 0.10, rep: 0.50, company: 0.50 },
  { label: "10/55/45", op: 0.10, rep: 0.55, company: 0.45 },
  { label: "10/60/40", op: 0.10, rep: 0.60, company: 0.40 },
] as const;

// O&P Percentage options (default fallback)
export const OP_PERCENT_OPTIONS = [
  { value: 0.10, label: "10.00%" },
  { value: 0.125, label: "12.50%" },
  { value: 0.15, label: "15.00%" },
] as const;

/**
 * Generate profit split options based on user's tier
 * @param allowedOpPercentages - array of allowed O&P percentages (e.g., [0.10, 0.15])
 * @param allowedProfitSplits - array of allowed rep profit splits (e.g., [0.35, 0.40])
 */
export function generateProfitSplitOptions(
  allowedOpPercentages: number[],
  allowedProfitSplits: number[]
): Array<{ label: string; op: number; rep: number; company: number }> {
  const options: Array<{ label: string; op: number; rep: number; company: number }> = [];
  
  for (const op of allowedOpPercentages) {
    for (const rep of allowedProfitSplits) {
      const company = 1 - rep;
      const opLabel = op === 0.125 ? "12.5" : (op * 100).toString();
      const repLabel = (rep * 100).toFixed(0);
      const companyLabel = (company * 100).toFixed(0);
      options.push({
        label: `${opLabel}/${repLabel}/${companyLabel}`,
        op,
        rep,
        company,
      });
    }
  }
  
  return options;
}

/**
 * Filter O&P options based on user's tier
 */
export function filterOpPercentOptions(allowedOpPercentages: number[]) {
  return OP_PERCENT_OPTIONS.filter(opt => allowedOpPercentages.includes(opt.value));
}

/**
 * Calculate O&P $ Amount
 * Formula: gross_contract_total * op_percent
 */
export function calculateOpAmount(grossContractTotal: number, opPercent: number): number {
  return grossContractTotal * opPercent;
}

/**
 * Calculate Contract Total (Net)
 * Formula: gross_contract_total - (gross_contract_total * op_percent)
 */
export function calculateContractTotalNet(grossContractTotal: number, opPercent: number): number {
  return grossContractTotal - (grossContractTotal * opPercent);
}

/**
 * Calculate Net Profit (Commissionable)
 * Formula: contract_total_net - material - labor - neg_expenses + pos_expenses
 */
export function calculateNetProfit(
  contractTotalNet: number,
  materialCost: number,
  laborCost: number,
  negExp1: number,
  negExp2: number,
  negExp3: number,
  negExp4: number,
  posExp1: number,
  posExp2: number,
  posExp3: number,
  posExp4: number
): number {
  return (
    contractTotalNet -
    materialCost -
    laborCost -
    negExp1 -
    negExp2 -
    negExp3 -
    negExp4 +
    posExp1 +
    posExp2 +
    posExp3 +
    posExp4
  );
}

/**
 * Calculate Rep Commission
 * Formula: net_profit * rep_profit_percent
 */
export function calculateRepCommission(netProfit: number, repProfitPercent: number): number {
  return netProfit * repProfitPercent;
}

/**
 * Calculate Company Profit
 * Formula: op_amount + (net_profit - rep_commission)
 * Includes BOTH the O&P amount AND the company's share of net profit
 */
export function calculateCompanyProfit(opAmount: number, netProfit: number, repCommission: number): number {
  return opAmount + (netProfit - repCommission);
}

/**
 * Calculate all computed fields from input data
 */
export function calculateAllFields(data: CommissionDocumentData): CalculatedFields {
  // O&P $ Amount
  const op_amount = calculateOpAmount(data.gross_contract_total, data.op_percent);
  
  // Contract Total (Net)
  const contract_total_net = calculateContractTotalNet(data.gross_contract_total, data.op_percent);

  // Net Profit
  const net_profit = calculateNetProfit(
    contract_total_net,
    data.material_cost,
    data.labor_cost,
    data.neg_exp_1,
    data.neg_exp_2,
    data.neg_exp_3,
    data.neg_exp_4,
    data.pos_exp_1,
    data.pos_exp_2,
    data.pos_exp_3,
    data.pos_exp_4
  );

  // Rep Commission
  const rep_commission = calculateRepCommission(net_profit, data.rep_profit_percent);

  // Company Profit
  const company_profit = calculateCompanyProfit(op_amount, net_profit, rep_commission);

  return {
    op_amount,
    contract_total_net,
    net_profit,
    rep_commission,
    company_profit,
  };
}

/**
 * Format currency for display - clean format
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);
  
  if (value < 0) {
    return `−$${formatted}`;
  }
  return `$${formatted}`;
}

/**
 * Format percent for display
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Parse currency input string to number
 */
export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Get profit split from label
 */
export function getProfitSplitFromLabel(label: string): { op: number; rep: number; company: number } | null {
  const split = PROFIT_SPLIT_OPTIONS.find(s => s.label === label);
  return split ? { op: split.op, rep: split.rep, company: split.company } : null;
}

/**
 * Validate required fields
 */
export function validateCommissionDocument(data: Partial<CommissionDocumentData> & { 
  job_name_id?: string; 
  job_date?: string; 
  sales_rep?: string;
  profit_split_label?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.job_name_id?.trim()) errors.push('Job Name & ID is required');
  if (!data.job_date) errors.push('Job Date is required');
  if (!data.sales_rep?.trim()) errors.push('Sales Rep is required');
  if (data.gross_contract_total === undefined || data.gross_contract_total < 0) errors.push('Contract Total (Gross) must be >= 0');
  if (data.op_percent === undefined || data.op_percent < 0 || data.op_percent > 1) errors.push('O&P % must be between 0 and 100%');
  if (data.material_cost === undefined || data.material_cost < 0) errors.push('Material cost must be >= 0');
  if (data.labor_cost === undefined || data.labor_cost < 0) errors.push('Labor cost must be >= 0');
  if (!data.profit_split_label) errors.push('Profit Split is required');
  if (data.rep_profit_percent === undefined || data.rep_profit_percent < 0 || data.rep_profit_percent > 1) {
    errors.push('Rep Profit % must be between 0 and 100%');
  }

  return { valid: errors.length === 0, errors };
}
