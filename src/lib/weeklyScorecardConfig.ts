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

/** Local calendar `YYYY-MM-DD` (avoids UTC drift from `toISOString`). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * TSM pay-cycle week: Saturday through Friday.
 * Other weekly scorecard roles still use Monday-start via `getCurrentWeekStartDate`.
 */
export function getSalesRepPayCycleWeekStartDate(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diffToSaturday = day === 6 ? 0 : -(day + 1);
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + diffToSaturday);
  return toLocalDateString(saturday);
}

export function getSalesRepPayCycleWeekEndDate(weekStartDate: string): string {
  const [y, mo, d] = weekStartDate.split("-").map(Number);
  const start = new Date(y, mo - 1, d);
  start.setHours(0, 0, 0, 0);
  const friday = new Date(start);
  friday.setDate(start.getDate() + 6);
  return toLocalDateString(friday);
}

/** Normalized KPI fields stored on `kpi_scorecard_entries` for sales_rep rows. */
export interface SalesRepNormalizedKpis {
  doors_knocked: number;
  one_to_ones: boolean;
  lead_gen_1_2: boolean;
  chamber_activities: boolean;
  social_media_posts: number;
  crm_hygiene: boolean;
  sales_meeting_huddles: boolean;
}

export function defaultSalesRepNormalizedKpis(): SalesRepNormalizedKpis {
  return {
    doors_knocked: 0,
    one_to_ones: false,
    lead_gen_1_2: false,
    chamber_activities: false,
    social_media_posts: 0,
    crm_hygiene: false,
    sales_meeting_huddles: false,
  };
}

function coerceNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/** Hydrate from DB columns with legacy `scores` JSON fallback (pre-migration rows). */
export function hydrateSalesRepKpisFromEntry(
  row: Record<string, unknown> & { scores?: Record<string, unknown> | null },
): SalesRepNormalizedKpis {
  const s = (row.scores ?? {}) as Record<string, unknown>;

  return {
    doors_knocked: coerceNumber(
      row.doors_knocked ?? s.doors_knocked ?? s.salesrabbit,
      0,
    ),
    one_to_ones: coerceBoolean(
      row.one_to_ones ?? s.one_to_ones ?? s.one_to_one,
      false,
    ),
    lead_gen_1_2: coerceBoolean(row.lead_gen_1_2 ?? s.lead_gen_1_2, false),
    chamber_activities: coerceBoolean(
      row.chamber_activities ?? s.chamber_activities,
      false,
    ),
    social_media_posts: coerceNumber(row.social_media_posts ?? s.social_media_posts, 0),
    crm_hygiene: coerceBoolean(
      row.crm_hygiene ?? s.crm_hygiene ?? s.acculynx_quality,
      false,
    ),
    sales_meeting_huddles: coerceBoolean(
      row.sales_meeting_huddles ?? s.sales_meeting_huddles ?? s.sales_meetings,
      false,
    ),
  };
}

export function getSalesRepDoorsTierLabel(doorsKnocked: number): string {
  if (doorsKnocked >= 300) return "Tier 3 (300+)";
  if (doorsKnocked >= 150) return "Tier 2 (150+)";
  if (doorsKnocked >= 50) return "Tier 1 (50+)";
  return "Below Tier 1";
}

/** Drive `scores.compliance_*` for monthly rollups and dashboards. */
export function computeSalesRepComplianceTotals(
  kpis: SalesRepNormalizedKpis,
): { compliance_passed: number; compliance_total: number } {
  const checks = [
    kpis.doors_knocked >= 50,
    kpis.one_to_ones === true,
    kpis.lead_gen_1_2 === true,
    kpis.chamber_activities === true,
    kpis.social_media_posts >= 1,
    kpis.crm_hygiene === true,
    kpis.sales_meeting_huddles === true,
  ];
  const passed = checks.filter(Boolean).length;
  return { compliance_passed: passed, compliance_total: checks.length };
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
