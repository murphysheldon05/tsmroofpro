export type WeeklyScorecardRole =
  | "sales_rep"
  | "sales_manager"
  | "office_admin"
  | "operations"
  | "accounting"
  | "production"
  | "supplement";

export interface BonusTierDefinition {
  min: number;
  label: string;
  amount: number;
}

export interface WeeklyScorecardConfig {
  role: WeeklyScorecardRole;
  route: string;
  title: string;
  employeeName: string | null;
  reviewers: string[];
  summaryMode: "pass_fail" | "rating" | "sales_rep";
  bonusTiers: BonusTierDefinition[];
}

const EMPTY_BONUS_TIERS: BonusTierDefinition[] = [];

export const WEEKLY_SCORECARD_CONFIG: Record<
  WeeklyScorecardRole,
  WeeklyScorecardConfig
> = {
  sales_rep: {
    role: "sales_rep",
    route: "/kpi-scorecards/sales-rep",
    title: "Sales Rep",
    employeeName: null,
    reviewers: ["Conrad Demecs", "Jordan Pollei", "Manny Madrid", "Sheldon Murphy"],
    summaryMode: "sales_rep",
    bonusTiers: EMPTY_BONUS_TIERS,
  },
  sales_manager: {
    role: "sales_manager",
    route: "/kpi-scorecards/sales-manager",
    title: "Sales Manager",
    employeeName: null,
    reviewers: ["Manny Madrid", "Sheldon Murphy"],
    summaryMode: "pass_fail",
    bonusTiers: [
      { min: 92, label: "Tier 1", amount: 750 },
      { min: 85, label: "Tier 2", amount: 500 },
      { min: 80, label: "Tier 3", amount: 250 },
      { min: 0, label: "No Bonus", amount: 0 },
    ],
  },
  office_admin: {
    role: "office_admin",
    route: "/kpi-scorecards/office-admin",
    title: "Office Admin",
    employeeName: "Jayden Abramsen",
    reviewers: ["Manny Madrid", "Sheldon Murphy"],
    summaryMode: "pass_fail",
    bonusTiers: [
      { min: 92, label: "Tier 1", amount: 750 },
      { min: 85, label: "Tier 2", amount: 500 },
      { min: 80, label: "Tier 3", amount: 250 },
      { min: 0, label: "No Bonus", amount: 0 },
    ],
  },
  operations: {
    role: "operations",
    route: "/kpi-scorecards/operations",
    title: "Operations & Compliance",
    employeeName: "Manny Madrid",
    reviewers: ["Sheldon Murphy"],
    summaryMode: "rating",
    bonusTiers: EMPTY_BONUS_TIERS,
  },
  accounting: {
    role: "accounting",
    route: "/kpi-scorecards/accounting",
    title: "Accounting",
    employeeName: "Renice",
    reviewers: ["Courtney Murphy", "Sheldon Murphy"],
    summaryMode: "pass_fail",
    bonusTiers: [
      { min: 90, label: "Tier 1", amount: 500 },
      { min: 83, label: "Tier 2", amount: 300 },
      { min: 75, label: "Tier 3", amount: 150 },
      { min: 0, label: "No Bonus", amount: 0 },
    ],
  },
  production: {
    role: "production",
    route: "/kpi-scorecards/production",
    title: "Production",
    employeeName: "Tim Brown",
    reviewers: ["Manny Madrid", "Sheldon Murphy"],
    summaryMode: "pass_fail",
    bonusTiers: [
      { min: 90, label: "Tier 1", amount: 500 },
      { min: 83, label: "Tier 2", amount: 300 },
      { min: 75, label: "Tier 3", amount: 150 },
      { min: 0, label: "No Bonus", amount: 0 },
    ],
  },
  supplement: {
    role: "supplement",
    route: "/kpi-scorecards/supplement",
    title: "Supplement",
    employeeName: null,
    reviewers: ["Manny Madrid", "Sheldon Murphy"],
    summaryMode: "pass_fail",
    bonusTiers: [
      { min: 90, label: "Tier 1", amount: 500 },
      { min: 83, label: "Tier 2", amount: 300 },
      { min: 75, label: "Tier 3", amount: 150 },
      { min: 0, label: "No Bonus", amount: 0 },
    ],
  },
};

export function getCurrentWeekStartDate() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

export function getCurrentWeekEndDate(weekStartDate: string) {
  const monday = new Date(`${weekStartDate}T00:00:00`);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday.toISOString().split("T")[0];
}

export function getCompliancePercent(scores: Record<string, unknown>) {
  const storedPct = Number(scores.compliance_pct ?? 0);
  if (!Number.isNaN(storedPct) && storedPct > 0) {
    return storedPct;
  }

  const passed = Number(scores.compliance_passed ?? 0);
  const total = Number(scores.compliance_total ?? 0);
  if (!total) {
    return 0;
  }

  return Math.round((passed / total) * 100);
}

export function getMonthlyBonusTier(
  role: WeeklyScorecardRole,
  compliancePct: number,
) {
  const config = WEEKLY_SCORECARD_CONFIG[role];
  return config.bonusTiers.find((tier) => compliancePct >= tier.min) ?? null;
}

export function getOperationsRatingLabel(avgRating: number | null) {
  if (avgRating == null) {
    return null;
  }
  if (avgRating >= 3.5) return "Exceptional";
  if (avgRating >= 2.5) return "Meeting Standard";
  if (avgRating >= 1.5) return "Below Expectations";
  return "Needs Immediate Attention";
}
