/**
 * Shared calculation module for TSM Commission Documents
 * Used on both client and server to ensure consistency
 */

export interface CommissionDocumentData {
  gross_contract_total: number;
  op_percent: number;
  material_cost: number;
  labor_cost: number;
  neg_exp_1: number;
  neg_exp_2: number;
  neg_exp_3: number;
  supplement_fees_expense: number;
  pos_exp_1: number;
  pos_exp_2: number;
  pos_exp_3: number;
  pos_exp_4: number;
  commission_rate: number;
  advance_total: number;
}

export interface CalculatedFields {
  contract_total_net: number;
  net_profit: number;
  rep_commission: number;
  company_profit: number;
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
  supplementFeesExpense: number,
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
    supplementFeesExpense +
    posExp1 +
    posExp2 +
    posExp3 +
    posExp4
  );
}

/**
 * Calculate Rep Commission
 * Formula: net_profit * commission_rate
 */
export function calculateRepCommission(netProfit: number, commissionRate: number): number {
  return netProfit * commissionRate;
}

/**
 * Calculate Company Profit
 * Formula: net_profit - rep_commission + (gross_contract_total * op_percent)
 */
export function calculateCompanyProfit(netProfit: number, repCommission: number, grossContractTotal: number, opPercent: number): number {
  return netProfit - repCommission + (grossContractTotal * opPercent);
}

/**
 * Calculate all computed fields from input data
 */
export function calculateAllFields(data: CommissionDocumentData): CalculatedFields {
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
    data.supplement_fees_expense,
    data.pos_exp_1,
    data.pos_exp_2,
    data.pos_exp_3,
    data.pos_exp_4
  );

  // Rep Commission
  const rep_commission = calculateRepCommission(net_profit, data.commission_rate);

  // Company Profit
  const company_profit = calculateCompanyProfit(net_profit, rep_commission, data.gross_contract_total, data.op_percent);

  return {
    contract_total_net,
    net_profit,
    rep_commission,
    company_profit,
  };
}

/**
 * Format currency for display (2 decimal places)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
 * Validate required fields
 */
export function validateCommissionDocument(data: Partial<CommissionDocumentData> & { job_name_id?: string; job_date?: string; sales_rep?: string }): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.job_name_id?.trim()) errors.push('Job Name & ID is required');
  if (!data.job_date) errors.push('Job Date is required');
  if (!data.sales_rep?.trim()) errors.push('Sales Rep is required');
  if (data.gross_contract_total === undefined || data.gross_contract_total < 0) errors.push('Gross Contract Total must be >= 0');
  if (data.op_percent === undefined || data.op_percent < 0 || data.op_percent > 1) errors.push('O&P must be between 0 and 1');
  if (data.material_cost === undefined || data.material_cost < 0) errors.push('Material cost must be >= 0');
  if (data.labor_cost === undefined || data.labor_cost < 0) errors.push('Labor cost must be >= 0');
  if (data.commission_rate === undefined || data.commission_rate < 0 || data.commission_rate > 1) errors.push('Commission Rate must be between 0 and 1');

  return { valid: errors.length === 0, errors };
}
