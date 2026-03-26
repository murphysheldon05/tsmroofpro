import type { Database } from "@/integrations/supabase/types";

export type ScorecardTemplate =
  Database["public"]["Tables"]["scorecard_templates"]["Row"];
export type ScorecardTemplateInsert =
  Database["public"]["Tables"]["scorecard_templates"]["Insert"];
export type ScorecardTemplateUpdate =
  Database["public"]["Tables"]["scorecard_templates"]["Update"];

export type ScorecardKpi =
  Database["public"]["Tables"]["scorecard_kpis"]["Row"];
export type ScorecardKpiInsert =
  Database["public"]["Tables"]["scorecard_kpis"]["Insert"];

export type ScorecardAssignment =
  Database["public"]["Tables"]["scorecard_assignments"]["Row"];
export type ScorecardAssignmentInsert =
  Database["public"]["Tables"]["scorecard_assignments"]["Insert"];

export type ScorecardSubmission =
  Database["public"]["Tables"]["scorecard_submissions"]["Row"];
export type ScorecardSubmissionInsert =
  Database["public"]["Tables"]["scorecard_submissions"]["Insert"];

export interface BonusTier {
  label: string;
  min_avg: number;
  amount: number;
  color?: string;
}

export interface ScoringGuideLevel {
  score: number;
  label: string;
  description: string;
}

export interface KpiFormValues {
  id?: string;
  name: string;
  full_name: string;
  description: string;
  scoring_guide: ScoringGuideLevel[];
  sort_order: number;
}

export interface TemplateFormValues {
  name: string;
  description: string;
  review_frequency: "weekly" | "biweekly" | "monthly";
  status: "active" | "inactive";
  has_bonus: boolean;
  bonus_period: "weekly" | "monthly" | "quarterly";
  bonus_tiers: BonusTier[];
  kpis: KpiFormValues[];
}

export const SCORE_COLORS: Record<number, string> = {
  1: "#FF4444",
  2: "#FF8C00",
  3: "#FFB020",
  4: "#7BC67E",
  5: "#00D26A",
};

export const BONUS_TIER_PRESETS: Record<string, string> = {
  Gold: "#FFD700",
  Silver: "#C0C0C0",
  Bronze: "#CD7F32",
};

export function getScoreColor(score: number): string {
  if (score >= 4.5) return SCORE_COLORS[5];
  if (score >= 3.5) return SCORE_COLORS[4];
  if (score >= 2.5) return SCORE_COLORS[3];
  if (score >= 1.5) return SCORE_COLORS[2];
  return SCORE_COLORS[1];
}

export function getScoreColorClass(score: number): string {
  if (score >= 4) return "text-green-500";
  if (score >= 3) return "text-yellow-500";
  return "text-red-500";
}

export function getScoreBgClass(score: number): string {
  if (score >= 4) return "bg-green-500/10 text-green-600";
  if (score >= 3) return "bg-yellow-500/10 text-yellow-600";
  return "bg-red-500/10 text-red-600";
}

export function matchBonusTier(
  average: number,
  tiers: BonusTier[] | null | undefined
): BonusTier | null {
  if (!tiers || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => b.min_avg - a.min_avg);
  return sorted.find((t) => average >= t.min_avg) ?? null;
}

export function getCurrentPeriod(frequency: string): { start: Date; end: Date } {
  const now = new Date();
  if (frequency === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }
  if (frequency === "biweekly") {
    const dayOfMonth = now.getDate();
    const isFirstHalf = dayOfMonth <= 15;
    const start = isFirstHalf
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), 16);
    const end = isFirstHalf
      ? new Date(now.getFullYear(), now.getMonth(), 15)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }
  // weekly (Mon-Sun)
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

export function formatPeriodLabel(
  start: string | Date,
  end: string | Date,
  frequency: string
): string {
  const s = typeof start === "string" ? new Date(start + "T00:00:00") : start;
  const e = typeof end === "string" ? new Date(end + "T00:00:00") : end;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (frequency === "monthly") {
    return s.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return `${fmt(s)} – ${fmt(e)}`;
}

export function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}
