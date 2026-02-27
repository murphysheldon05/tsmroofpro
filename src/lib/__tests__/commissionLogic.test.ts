import { describe, it, expect } from "vitest";
import {
  calculateOpAmount,
  calculateContractTotalNet,
  calculateNetProfit,
  calculateRepCommission,
  calculateCompanyProfit,
  calculateAllFields,
  generateProfitSplitOptions,
  filterOpPercentOptions,
  formatCurrency,
  formatPercent,
  formatTierPercent,
  parseCurrencyInput,
  getProfitSplitFromLabel,
  validateCommissionDocument,
  PROFIT_SPLIT_OPTIONS,
  OP_PERCENT_OPTIONS,
  type CommissionDocumentData,
} from "../commissionDocumentCalculations";
import {
  calculateScheduledPayDate,
  getScheduledPayDateString,
} from "../commissionPayDateCalculations";

// ── Commission Document Calculations ────────────────────────────────────────

describe("Commission Document Calculations", () => {
  const sampleData: CommissionDocumentData = {
    gross_contract_total: 25000,
    op_percent: 0.15,
    material_cost: 5000,
    labor_cost: 4000,
    neg_exp_1: 500,
    neg_exp_2: 300,
    neg_exp_3: 0,
    neg_exp_4: 200,
    pos_exp_1: 100,
    pos_exp_2: 0,
    pos_exp_3: 0,
    pos_exp_4: 0,
    rep_profit_percent: 0.40,
    advance_total: 1000,
  };

  describe("calculateOpAmount", () => {
    it("computes O&P = gross × op_percent", () => {
      expect(calculateOpAmount(25000, 0.15)).toBe(3750);
    });
    it("handles 10% O&P", () => {
      expect(calculateOpAmount(25000, 0.10)).toBe(2500);
    });
    it("handles 12.5% O&P", () => {
      expect(calculateOpAmount(40000, 0.125)).toBe(5000);
    });
    it("returns 0 when gross is 0", () => {
      expect(calculateOpAmount(0, 0.15)).toBe(0);
    });
  });

  describe("calculateContractTotalNet", () => {
    it("computes net = gross - (gross × op_percent)", () => {
      expect(calculateContractTotalNet(25000, 0.15)).toBe(21250);
    });
    it("handles 10% O&P", () => {
      expect(calculateContractTotalNet(25000, 0.10)).toBe(22500);
    });
    it("handles 0 gross", () => {
      expect(calculateContractTotalNet(0, 0.15)).toBe(0);
    });
  });

  describe("calculateNetProfit", () => {
    it("computes net_profit = contract_net - material - labor - neg_exps + pos_exps", () => {
      // contract_net = 21250, material=5000, labor=4000, neg=(500+300+0+200)=1000, pos=(100+0+0+0)=100
      // 21250 - 5000 - 4000 - 1000 + 100 = 11350
      const result = calculateNetProfit(21250, 5000, 4000, 500, 300, 0, 200, 100, 0, 0, 0);
      expect(result).toBe(11350);
    });
    it("can produce a negative profit", () => {
      const result = calculateNetProfit(5000, 3000, 3000, 500, 0, 0, 0, 0, 0, 0, 0);
      expect(result).toBe(-1500);
    });
    it("zero costs = full contract net as profit", () => {
      expect(calculateNetProfit(20000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)).toBe(20000);
    });
  });

  describe("calculateRepCommission", () => {
    it("computes rep_commission = net_profit × rep_percent", () => {
      expect(calculateRepCommission(11350, 0.40)).toBeCloseTo(4540, 2);
    });
    it("50/50 split", () => {
      expect(calculateRepCommission(10000, 0.50)).toBe(5000);
    });
    it("negative net profit produces negative commission", () => {
      expect(calculateRepCommission(-1500, 0.40)).toBe(-600);
    });
  });

  describe("calculateCompanyProfit", () => {
    it("computes company_profit = op_amount + (net_profit - rep_commission)", () => {
      // op=3750, net=11350, rep_comm=4540 → 3750 + (11350-4540) = 3750 + 6810 = 10560
      expect(calculateCompanyProfit(3750, 11350, 4540)).toBe(10560);
    });
    it("company gets O&P + remaining share", () => {
      // op=2500, net=10000, rep=5000 → 2500 + 5000 = 7500
      expect(calculateCompanyProfit(2500, 10000, 5000)).toBe(7500);
    });
  });

  describe("calculateAllFields (integration)", () => {
    it("computes all fields consistently for a $25k job at 15/40/60", () => {
      const result = calculateAllFields(sampleData);

      expect(result.op_amount).toBe(3750); // 25000 × 0.15
      expect(result.contract_total_net).toBe(21250); // 25000 - 3750
      // net_profit: 21250 - 5000 - 4000 - 500 - 300 - 0 - 200 + 100 + 0 + 0 + 0 = 11350
      expect(result.net_profit).toBe(11350);
      expect(result.rep_commission).toBeCloseTo(4540, 2); // 11350 × 0.40
      // company: 3750 + (11350 - 4540) = 10560
      expect(result.company_profit).toBeCloseTo(10560, 2);
    });

    it("rep + company shares add up to op_amount + net_profit", () => {
      const result = calculateAllFields(sampleData);
      const totalRecovered = result.rep_commission + result.company_profit;
      expect(totalRecovered).toBeCloseTo(result.op_amount + result.net_profit, 2);
    });

    it("handles a zero-expense job", () => {
      const data: CommissionDocumentData = {
        gross_contract_total: 50000,
        op_percent: 0.10,
        material_cost: 0,
        labor_cost: 0,
        neg_exp_1: 0, neg_exp_2: 0, neg_exp_3: 0, neg_exp_4: 0,
        pos_exp_1: 0, pos_exp_2: 0, pos_exp_3: 0, pos_exp_4: 0,
        rep_profit_percent: 0.50,
        advance_total: 0,
      };
      const r = calculateAllFields(data);
      expect(r.op_amount).toBe(5000);
      expect(r.contract_total_net).toBe(45000);
      expect(r.net_profit).toBe(45000);
      expect(r.rep_commission).toBe(22500);
      expect(r.company_profit).toBe(27500); // 5000 + 22500
    });

    it("handles a negative-profit job correctly", () => {
      const data: CommissionDocumentData = {
        gross_contract_total: 10000,
        op_percent: 0.15,
        material_cost: 5000,
        labor_cost: 5000,
        neg_exp_1: 1000, neg_exp_2: 0, neg_exp_3: 0, neg_exp_4: 0,
        pos_exp_1: 0, pos_exp_2: 0, pos_exp_3: 0, pos_exp_4: 0,
        rep_profit_percent: 0.40,
        advance_total: 0,
      };
      const r = calculateAllFields(data);
      expect(r.op_amount).toBe(1500);
      expect(r.contract_total_net).toBe(8500);
      expect(r.net_profit).toBe(-2500); // 8500 - 5000 - 5000 - 1000
      expect(r.rep_commission).toBe(-1000); // -2500 × 0.40
      expect(r.company_profit).toBe(0); // 1500 + (-2500 - (-1000)) = 1500 - 1500 = 0
    });
  });
});

// ── Commission Submission Calculations (Worksheet Model) ────────────────────

describe("Commission Submission Calculations (Worksheet Model)", () => {
  function calcSubmission(params: {
    contractAmount: number;
    supplementsApproved: number;
    commissionPercentage: number;
    advancesPaid: number;
    isFlatFee?: boolean;
    flatFeeAmount?: number;
  }) {
    const totalJobRevenue = params.contractAmount + params.supplementsApproved;
    const grossCommission = params.isFlatFee
      ? (params.flatFeeAmount || 0)
      : totalJobRevenue * (params.commissionPercentage / 100);
    const netCommissionOwed = grossCommission - params.advancesPaid;
    return { totalJobRevenue, grossCommission, netCommissionOwed };
  }

  it("standard commission: $18k contract, $2k supplements, 15%", () => {
    const r = calcSubmission({
      contractAmount: 18000,
      supplementsApproved: 2000,
      commissionPercentage: 15,
      advancesPaid: 0,
    });
    expect(r.totalJobRevenue).toBe(20000);
    expect(r.grossCommission).toBe(3000);
    expect(r.netCommissionOwed).toBe(3000);
  });

  it("with draws deducted", () => {
    const r = calcSubmission({
      contractAmount: 30000,
      supplementsApproved: 5000,
      commissionPercentage: 10,
      advancesPaid: 1500,
    });
    expect(r.totalJobRevenue).toBe(35000);
    expect(r.grossCommission).toBe(3500);
    expect(r.netCommissionOwed).toBe(2000);
  });

  it("draws exceed commission → negative net", () => {
    const r = calcSubmission({
      contractAmount: 10000,
      supplementsApproved: 0,
      commissionPercentage: 5,
      advancesPaid: 1000,
    });
    expect(r.totalJobRevenue).toBe(10000);
    expect(r.grossCommission).toBe(500);
    expect(r.netCommissionOwed).toBe(-500);
  });

  it("flat fee subcontractor: fixed amount ignores percentage", () => {
    const r = calcSubmission({
      contractAmount: 25000,
      supplementsApproved: 0,
      commissionPercentage: 15,
      advancesPaid: 500,
      isFlatFee: true,
      flatFeeAmount: 3000,
    });
    expect(r.totalJobRevenue).toBe(25000);
    expect(r.grossCommission).toBe(3000); // flat fee, not % based
    expect(r.netCommissionOwed).toBe(2500);
  });

  it("zero contract amount", () => {
    const r = calcSubmission({
      contractAmount: 0,
      supplementsApproved: 0,
      commissionPercentage: 15,
      advancesPaid: 0,
    });
    expect(r.totalJobRevenue).toBe(0);
    expect(r.grossCommission).toBe(0);
    expect(r.netCommissionOwed).toBe(0);
  });
});

// ── Override Calculations ───────────────────────────────────────────────────

describe("Override Calculations (10% for first 10 commissions)", () => {
  function calcOverride(netCommissionOwed: number, approvedCount: number, phaseComplete: boolean) {
    if (phaseComplete || approvedCount >= 10) return { overrideAmount: 0, newCount: approvedCount };
    const newCount = approvedCount + 1;
    const overrideAmt = netCommissionOwed * 0.10;
    return { overrideAmount: overrideAmt, newCount, isPhaseComplete: newCount >= 10 };
  }

  it("1st commission: 10% override", () => {
    const r = calcOverride(3000, 0, false);
    expect(r.overrideAmount).toBe(300);
    expect(r.newCount).toBe(1);
  });

  it("10th commission completes the phase", () => {
    const r = calcOverride(2000, 9, false);
    expect(r.overrideAmount).toBe(200);
    expect(r.newCount).toBe(10);
    expect(r.isPhaseComplete).toBe(true);
  });

  it("11th commission: no override (phase complete)", () => {
    const r = calcOverride(5000, 10, true);
    expect(r.overrideAmount).toBe(0);
  });

  it("override with large commission", () => {
    const r = calcOverride(15000, 4, false);
    expect(r.overrideAmount).toBe(1500);
    expect(r.newCount).toBe(5);
  });
});

// ── Draw Close-Out Calculations ─────────────────────────────────────────────

describe("Draw Close-Out Calculations", () => {
  function calcCloseOut(params: {
    contractAmount: number;
    supplementsApproved: number;
    commissionPercentage: number;
    advancesPaid: number;
    drawAmountPaid: number;
  }) {
    const totalJobRevenue = params.contractAmount + params.supplementsApproved;
    const grossCommission = totalJobRevenue * (params.commissionPercentage / 100);
    const netCommissionOwed = grossCommission - params.advancesPaid;
    return { totalJobRevenue, grossCommission, netCommissionOwed, drawAmountPaid: params.drawAmountPaid };
  }

  it("final commission after draw: net owed is remaining after advances", () => {
    const r = calcCloseOut({
      contractAmount: 30000,
      supplementsApproved: 5000,
      commissionPercentage: 12,
      advancesPaid: 2000,
      drawAmountPaid: 2000,
    });
    expect(r.totalJobRevenue).toBe(35000);
    expect(r.grossCommission).toBe(4200);
    expect(r.netCommissionOwed).toBe(2200);
    expect(r.drawAmountPaid).toBe(2000);
  });
});

// ── Pay Date Calculations ───────────────────────────────────────────────────

describe("Pay Date Calculations (Tuesday 3 PM MST cutoff)", () => {
  function createMSTDate(year: number, month: number, day: number, hour: number): Date {
    // MST = UTC-7
    const utcHour = hour + 7;
    return new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0));
  }

  it("Monday submission → this Friday", () => {
    // Monday Feb 23, 2026 at 10:00 AM MST
    const submitted = createMSTDate(2026, 2, 23, 10);
    const payDate = calculateScheduledPayDate(submitted);
    expect(payDate.getDay()).toBe(5); // Friday
  });

  it("Tuesday before 3 PM MST → this Friday", () => {
    // Tuesday Feb 24, 2026 at 2:00 PM MST
    const submitted = createMSTDate(2026, 2, 24, 14);
    const payDate = calculateScheduledPayDate(submitted);
    expect(payDate.getDay()).toBe(5);
  });

  it("Tuesday at 3 PM MST → next Friday (after deadline)", () => {
    // Tuesday Feb 24, 2026 at 3:00 PM MST
    const submitted = createMSTDate(2026, 2, 24, 15);
    const payDate = calculateScheduledPayDate(submitted);
    expect(payDate.getDay()).toBe(5);
    // Should be next Friday (7 days later than this Friday)
    const thisFriday = new Date(Date.UTC(2026, 1, 27)); // Feb 27 is a Friday
    const nextFriday = new Date(Date.UTC(2026, 2, 6)); // Mar 6 is next Friday
    const payDateNorm = new Date(payDate.getFullYear(), payDate.getMonth(), payDate.getDate());
    expect(payDateNorm.getDate()).toBe(nextFriday.getUTCDate());
  });

  it("Wednesday → next Friday", () => {
    // Wednesday Feb 25, 2026 at 9:00 AM MST
    const submitted = createMSTDate(2026, 2, 25, 9);
    const payDate = calculateScheduledPayDate(submitted);
    expect(payDate.getDay()).toBe(5);
  });

  it("Friday submission → next Friday (not same day)", () => {
    // Friday Feb 27, 2026 at 10:00 AM MST
    const submitted = createMSTDate(2026, 2, 27, 10);
    const payDate = calculateScheduledPayDate(submitted);
    expect(payDate.getDay()).toBe(5);
    // Should be next Friday, not same-day
    const payDateNorm = new Date(payDate.getFullYear(), payDate.getMonth(), payDate.getDate());
    const submittedNorm = new Date(2026, 1, 27);
    expect(payDateNorm.getTime()).toBeGreaterThan(submittedNorm.getTime());
  });

  it("Sunday submission → this Friday", () => {
    // Sunday Feb 22, 2026 at 10:00 AM MST
    const submitted = createMSTDate(2026, 2, 22, 10);
    const payDate = calculateScheduledPayDate(submitted);
    expect(payDate.getDay()).toBe(5);
  });

  it("pay date is always a Friday", () => {
    for (let day = 1; day <= 28; day++) {
      const submitted = createMSTDate(2026, 2, day, 12);
      const payDate = calculateScheduledPayDate(submitted);
      expect(payDate.getDay()).toBe(5);
    }
  });

  it("getScheduledPayDateString returns YYYY-MM-DD format", () => {
    const submitted = createMSTDate(2026, 2, 23, 10);
    const dateStr = getScheduledPayDateString(submitted);
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── Profit Split & Tier Utilities ───────────────────────────────────────────

describe("Profit Split & Tier Utilities", () => {
  it("PROFIT_SPLIT_OPTIONS has valid entries", () => {
    for (const opt of PROFIT_SPLIT_OPTIONS) {
      expect(opt.rep + opt.company).toBeCloseTo(1.0, 10);
      expect(opt.op).toBeGreaterThan(0);
      expect(opt.rep).toBeGreaterThan(0);
    }
  });

  it("generateProfitSplitOptions creates correct combos", () => {
    const opts = generateProfitSplitOptions([0.15], [0.35, 0.40, 0.50]);
    expect(opts).toHaveLength(3);
    expect(opts[0].label).toBe("15/35/65");
    expect(opts[1].label).toBe("15/40/60");
    expect(opts[2].label).toBe("15/50/50");
    // Verify rep + company = 1
    opts.forEach(o => expect(o.rep + o.company).toBeCloseTo(1.0));
  });

  it("generateProfitSplitOptions handles 12.5% O&P label", () => {
    const opts = generateProfitSplitOptions([0.125], [0.40]);
    expect(opts[0].label).toBe("12.5/40/60");
  });

  it("filterOpPercentOptions filters correctly", () => {
    const filtered = filterOpPercentOptions([0.10, 0.15]);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(f => f.value)).toEqual([0.10, 0.15]);
  });

  it("getProfitSplitFromLabel returns correct split", () => {
    const split = getProfitSplitFromLabel("15/40/60");
    expect(split).not.toBeNull();
    expect(split!.op).toBe(0.15);
    expect(split!.rep).toBe(0.40);
    expect(split!.company).toBe(0.60);
  });

  it("getProfitSplitFromLabel returns null for invalid label", () => {
    expect(getProfitSplitFromLabel("invalid")).toBeNull();
  });
});

// ── Formatting Utilities ────────────────────────────────────────────────────

describe("Formatting Utilities", () => {
  it("formatCurrency handles positive values", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });
  it("formatCurrency handles negative values with minus sign", () => {
    expect(formatCurrency(-500)).toBe("−$500.00");
  });
  it("formatCurrency handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
  it("formatPercent formats correctly", () => {
    expect(formatPercent(0.15)).toBe("15.00%");
    expect(formatPercent(0.125)).toBe("12.50%");
  });
  it("formatTierPercent rounds to whole number", () => {
    expect(formatTierPercent(0.50)).toBe("50%");
    expect(formatTierPercent(0.4000000001)).toBe("40%");
  });
  it("parseCurrencyInput strips non-numeric chars", () => {
    expect(parseCurrencyInput("$1,234.56")).toBe(1234.56);
    expect(parseCurrencyInput("abc")).toBe(0);
    expect(parseCurrencyInput("-100")).toBe(0); // max(0, -100) = 0
  });
});

// ── Validation ──────────────────────────────────────────────────────────────

describe("Commission Document Validation", () => {
  it("valid data passes validation", () => {
    const result = validateCommissionDocument({
      job_name_id: "Smith Residence #1234",
      job_date: "2026-02-01",
      sales_rep: "John Doe",
      gross_contract_total: 25000,
      op_percent: 0.15,
      material_cost: 5000,
      labor_cost: 4000,
      rep_profit_percent: 0.40,
      profit_split_label: "15/40/60",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("missing required fields fails validation", () => {
    const result = validateCommissionDocument({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("invalid op_percent fails", () => {
    const result = validateCommissionDocument({
      job_name_id: "Test",
      job_date: "2026-01-01",
      sales_rep: "Rep",
      gross_contract_total: 10000,
      op_percent: 1.5, // > 1 = invalid
      material_cost: 0,
      labor_cost: 0,
      rep_profit_percent: 0.40,
      profit_split_label: "15/40/60",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("O&P"))).toBe(true);
  });
});

// ── Real-World Scenario Tests ───────────────────────────────────────────────

describe("Real-World Scenarios", () => {
  it("Scenario 1: $35k insurance job, 15/40/60, moderate expenses", () => {
    const data: CommissionDocumentData = {
      gross_contract_total: 35000,
      op_percent: 0.15,
      material_cost: 8000,
      labor_cost: 6000,
      neg_exp_1: 500, neg_exp_2: 200, neg_exp_3: 0, neg_exp_4: 300,
      pos_exp_1: 150, pos_exp_2: 0, pos_exp_3: 0, pos_exp_4: 0,
      rep_profit_percent: 0.40,
      advance_total: 2000,
    };
    const r = calculateAllFields(data);
    expect(r.op_amount).toBe(5250);
    expect(r.contract_total_net).toBe(29750);
    // net: 29750 - 8000 - 6000 - 1000 + 150 = 14900
    expect(r.net_profit).toBe(14900);
    expect(r.rep_commission).toBeCloseTo(5960, 2);
    expect(r.company_profit).toBeCloseTo(14190, 2); // 5250 + (14900 - 5960)
    // Verify total = gross_contract_total
    expect(r.op_amount + r.net_profit + 8000 + 6000 + 1000 - 150).toBe(35000);
  });

  it("Scenario 2: $12k retail job, 10/50/50, no expenses", () => {
    const data: CommissionDocumentData = {
      gross_contract_total: 12000,
      op_percent: 0.10,
      material_cost: 3500,
      labor_cost: 2500,
      neg_exp_1: 0, neg_exp_2: 0, neg_exp_3: 0, neg_exp_4: 0,
      pos_exp_1: 0, pos_exp_2: 0, pos_exp_3: 0, pos_exp_4: 0,
      rep_profit_percent: 0.50,
      advance_total: 0,
    };
    const r = calculateAllFields(data);
    expect(r.op_amount).toBe(1200);
    expect(r.contract_total_net).toBe(10800);
    expect(r.net_profit).toBe(4800); // 10800 - 3500 - 2500
    expect(r.rep_commission).toBe(2400);
    expect(r.company_profit).toBe(3600); // 1200 + 2400
  });

  it("Scenario 3: supplement fees (neg_exp_4) reduce profit", () => {
    const data: CommissionDocumentData = {
      gross_contract_total: 20000,
      op_percent: 0.15,
      material_cost: 4000,
      labor_cost: 3000,
      neg_exp_1: 0, neg_exp_2: 0, neg_exp_3: 0, neg_exp_4: 1500,
      pos_exp_1: 0, pos_exp_2: 0, pos_exp_3: 0, pos_exp_4: 0,
      rep_profit_percent: 0.45,
      advance_total: 0,
    };
    const r = calculateAllFields(data);
    expect(r.contract_total_net).toBe(17000);
    expect(r.net_profit).toBe(8500); // 17000 - 4000 - 3000 - 1500
    expect(r.rep_commission).toBeCloseTo(3825, 2); // 8500 × 0.45
  });
});
