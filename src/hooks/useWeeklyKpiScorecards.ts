import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  computeSalesRepComplianceTotals,
  defaultSalesRepNormalizedKpis,
  getCurrentWeekStartDate,
  getSalesRepPayCycleWeekEndDate,
  hydrateSalesRepKpisFromEntry,
  type SalesRepNormalizedKpis,
  type WeeklyScorecardRole,
} from "@/lib/weeklyScorecardConfig";

const fromAny = (table: string) => (supabase.from as any)(table);

const SUPPLEMENTAL_SALES_REP_SCORE_KEYS = [
  "revenue_ytd",
  "drug_test",
  "mvd_submitted",
] as const;

function extractSupplementalSalesRepScores(
  scores: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SUPPLEMENTAL_SALES_REP_SCORE_KEYS) {
    if (
      Object.prototype.hasOwnProperty.call(scores, k) &&
      scores[k] !== undefined
    ) {
      out[k] = scores[k];
    }
  }
  return out;
}

export interface WeeklyScorecardEntry {
  id: string;
  scorecard_role: WeeklyScorecardRole;
  employee_name: string;
  reviewer_name: string;
  week_start_date: string;
  assigned_user_id: string | null;
  submitted_by_user_id: string;
  scores: Record<string, unknown>;
  notes: string | null;
  submitted_at: string;
  updated_at?: string | null;
  last_updated_by_user_id?: string | null;
  override_count?: number | null;
  /** Normalized sales_rep columns (optional until migration applied). */
  rep_id?: string | null;
  week_end_date?: string | null;
  doors_knocked?: number | null;
  one_to_ones?: boolean | null;
  lead_gen_1_2?: boolean | null;
  chamber_activities?: boolean | null;
  social_media_posts?: number | null;
  crm_hygiene?: boolean | null;
  sales_meeting_huddles?: boolean | null;
  logged_by?: string | null;
}

export interface MonthlyRollupRow {
  id: string;
  employee_name: string;
  employee_user_id: string | null;
  scorecard_role: WeeklyScorecardRole;
  month_year: string;
  weeks_submitted: number;
  monthly_avg_pct: number | null;
  monthly_avg_rating: number | null;
  monthly_rating_label: string | null;
  bonus_amount: number;
  bonus_tier_label: string | null;
  bonus_status: string;
  paid_by: string | null;
  paid_date: string | null;
  payment_method: string | null;
  weekly_breakdown: unknown[] | null;
  created_at: string;
}

export function useWeeklyScorecardEntry(params: {
  scorecardRole: WeeklyScorecardRole;
  weekStartDate?: string;
  assignedUserId?: string | null;
  employeeName?: string | null;
}) {
  const weekStartDate = params.weekStartDate ?? getCurrentWeekStartDate();

  return useQuery({
    queryKey: [
      "weekly-scorecard-entry",
      params.scorecardRole,
      weekStartDate,
      params.assignedUserId ?? "none",
      params.employeeName ?? "none",
    ],
    queryFn: async () => {
      let query = fromAny("kpi_scorecard_entries")
        .select("*")
        .eq("scorecard_role", params.scorecardRole)
        .eq("week_start_date", weekStartDate)
        .order("submitted_at", { ascending: false })
        .limit(1);

      if (params.assignedUserId) {
        query = query.eq("assigned_user_id", params.assignedUserId);
      } else if (params.employeeName) {
        query = query.eq("employee_name", params.employeeName);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return (data as WeeklyScorecardEntry | null) ?? null;
    },
  });
}

export function useWeeklyScorecardHistory(params: {
  scorecardRole: WeeklyScorecardRole;
  assignedUserId?: string | null;
  employeeName?: string | null;
}) {
  return useQuery({
    queryKey: [
      "weekly-scorecard-history",
      params.scorecardRole,
      params.assignedUserId ?? "none",
      params.employeeName ?? "none",
    ],
    queryFn: async () => {
      let query = fromAny("kpi_scorecard_entries")
        .select("*")
        .eq("scorecard_role", params.scorecardRole)
        .order("week_start_date", { ascending: false });

      if (params.assignedUserId) {
        query = query.eq("assigned_user_id", params.assignedUserId);
      } else if (params.employeeName) {
        query = query.eq("employee_name", params.employeeName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as WeeklyScorecardEntry[];
    },
  });
}

export function useWeeklyScorecardForm(params: {
  scorecardRole: WeeklyScorecardRole;
  employeeName: string;
  assignedUserId?: string | null;
  weekStartDate: string;
  reviewerOptions: string[];
}) {
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const isManagerLike =
    role === "admin" || role === "manager" || role === "sales_manager";
  const isEmployeeSubject =
    !!params.assignedUserId && user?.id === params.assignedUserId && !isManagerLike;

  const [scores, setScores] = useState<Record<string, unknown>>({});
  const [salesRepKpis, setSalesRepKpis] = useState<SalesRepNormalizedKpis>(() =>
    defaultSalesRepNormalizedKpis(),
  );
  const [notes, setNotes] = useState("");
  const [reviewerName, setReviewerName] = useState(
    params.reviewerOptions.length === 1 ? params.reviewerOptions[0] : "",
  );
  const [adminOverrideUnlocked, setAdminOverrideUnlocked] = useState(false);
  const isSalesRepRole = params.scorecardRole === "sales_rep";

  const entryQuery = useWeeklyScorecardEntry({
    scorecardRole: params.scorecardRole,
    weekStartDate: params.weekStartDate,
    assignedUserId: params.assignedUserId,
    employeeName: params.employeeName,
  });

  const historyQuery = useWeeklyScorecardHistory({
    scorecardRole: params.scorecardRole,
    assignedUserId: params.assignedUserId,
    employeeName: params.employeeName,
  });

  useEffect(() => {
    const entry = entryQuery.data;
    if (entry) {
      if (isSalesRepRole) {
        setSalesRepKpis(
          hydrateSalesRepKpisFromEntry(entry as unknown as Record<string, unknown>),
        );
        setScores(
          extractSupplementalSalesRepScores(
            (entry.scores as Record<string, unknown>) ?? {},
          ),
        );
      } else {
        setScores((entry.scores as Record<string, unknown>) ?? {});
      }
      setNotes(entry.notes ?? "");
      setReviewerName(entry.reviewer_name ?? "");
      setAdminOverrideUnlocked(false);
      return;
    }

    setScores({});
    if (isSalesRepRole) {
      setSalesRepKpis(defaultSalesRepNormalizedKpis());
    }
    setNotes("");
    setReviewerName(params.reviewerOptions.length === 1 ? params.reviewerOptions[0] : "");
    setAdminOverrideUnlocked(false);
  }, [entryQuery.data, params.reviewerOptions, isSalesRepRole]);

  const saveEntry = useMutation({
    mutationFn: async (payload: {
      scores?: Record<string, unknown>;
      notes: string;
      reviewerName: string;
    }) => {
      if (!user?.id) {
        throw new Error("You must be signed in to submit a scorecard.");
      }

      if (!isManagerLike) {
        throw new Error("Only admins and managers can submit KPI scorecards.");
      }

      if (!payload.reviewerName) {
        throw new Error("Please select a reviewer before submitting.");
      }

      const existingEntry = entryQuery.data;

      const scoresForRow = isSalesRepRole
        ? {
            ...extractSupplementalSalesRepScores(scores),
            ...computeSalesRepComplianceTotals(salesRepKpis),
          }
        : (payload.scores ?? {});

      const normalizedSalesRepRow = isSalesRepRole
        ? {
            rep_id: params.assignedUserId ?? null,
            week_end_date: getSalesRepPayCycleWeekEndDate(params.weekStartDate),
            logged_by: user.id,
            doors_knocked: salesRepKpis.doors_knocked,
            one_to_ones: salesRepKpis.one_to_ones,
            lead_gen_1_2: salesRepKpis.lead_gen_1_2,
            chamber_activities: salesRepKpis.chamber_activities,
            social_media_posts: salesRepKpis.social_media_posts,
            crm_hygiene: salesRepKpis.crm_hygiene,
            sales_meeting_huddles: salesRepKpis.sales_meeting_huddles,
          }
        : {};

      const baseRow = {
        scorecard_role: params.scorecardRole,
        employee_name: params.employeeName,
        reviewer_name: payload.reviewerName,
        week_start_date: params.weekStartDate,
        assigned_user_id: params.assignedUserId ?? null,
        submitted_by_user_id: existingEntry?.submitted_by_user_id ?? user.id,
        last_updated_by_user_id: user.id,
        scores: scoresForRow,
        notes: payload.notes.trim() ? payload.notes.trim() : null,
        ...normalizedSalesRepRow,
      };

      if (existingEntry?.id) {
        const { data, error } = await fromAny("kpi_scorecard_entries")
          .update({
            ...baseRow,
            override_count: Number(existingEntry.override_count ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingEntry.id)
          .select("*")
          .single();

        if (error) throw error;
        return {
          entry: data as WeeklyScorecardEntry,
          eventType: "scorecard_edited",
        };
      }

      const { data, error } = await fromAny("kpi_scorecard_entries")
        .insert(baseRow)
        .select("*")
        .single();

      if (error) throw error;
      return {
        entry: data as WeeklyScorecardEntry,
        eventType: "scorecard_submitted",
      };
    },
    onSuccess: async ({ entry, eventType }) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["weekly-scorecard-entry"] }),
        qc.invalidateQueries({ queryKey: ["weekly-scorecard-history"] }),
        qc.invalidateQueries({ queryKey: ["monthly-rollups"] }),
      ]);

      const functionPayload = {
        eventType,
        entryId: entry.id,
        scorecardRole: entry.scorecard_role,
        employeeName: entry.employee_name,
        reviewerName: entry.reviewer_name,
        weekStartDate: entry.week_start_date,
        weekEndDate: (entry as WeeklyScorecardEntry).week_end_date ?? null,
        assignedUserId: entry.assigned_user_id,
        submittedByUserId: user?.id,
        scores: entry.scores,
        notes: entry.notes,
      };

      supabase.functions
        .invoke("send-scorecard-notification", {
          body: functionPayload,
        })
        .catch((error) => {
          console.error("Failed to invoke send-scorecard-notification", error);
        });

      toast.success(
        eventType === "scorecard_edited"
          ? "Scorecard updated."
          : "Scorecard submitted.",
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const existingEntry = entryQuery.data ?? null;
  const hasHistory = (historyQuery.data?.length ?? 0) > 0;
  const isSubmitted = !!existingEntry;
  const isLocked = isSubmitted && (!isAdmin || !adminOverrideUnlocked);
  const isReadOnly = isEmployeeSubject || isLocked;
  const employeeStatusLabel = existingEntry
    ? "Scored"
    : hasHistory
      ? "Pending"
      : "Not Yet Scored";

  const bannerText = existingEntry
    ? "Submitted ✓"
    : isEmployeeSubject
      ? "Your scorecard for this week. Only your manager can score and submit this."
      : null;

  return {
    entryQuery,
    historyQuery,
    saveEntry,
    scores,
    setScores,
    salesRepKpis,
    setSalesRepKpis,
    notes,
    setNotes,
    reviewerName,
    setReviewerName,
    existingEntry,
    isEmployeeSubject,
    isManagerLike,
    isAdmin,
    isSubmitted,
    isLocked,
    isReadOnly,
    employeeStatusLabel,
    bannerText,
    adminOverrideUnlocked,
    setAdminOverrideUnlocked,
  };
}

export function useMonthlyRollups(monthYear?: string) {
  return useQuery({
    queryKey: ["monthly-rollups", monthYear ?? "all"],
    queryFn: async () => {
      let query = fromAny("kpi_monthly_rollups")
        .select("*")
        .order("month_year", { ascending: false })
        .order("employee_name", { ascending: true });

      if (monthYear) {
        query = query.eq("month_year", monthYear);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as MonthlyRollupRow[];
    },
  });
}

export function useRunMonthlyRollup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (monthYear?: string) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-monthly-rollup",
        {
          body: monthYear ? { monthYear } : {},
        },
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly-rollups"] });
      toast.success("Monthly rollups generated.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useMarkRollupPaid() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      rollupId: string;
      paymentMethod: string;
    }) => {
      const { error } = await fromAny("kpi_monthly_rollups")
        .update({
          bonus_status: "paid",
          paid_by: user?.id ?? null,
          paid_date: new Date().toISOString().slice(0, 10),
          payment_method: params.paymentMethod,
        })
        .eq("id", params.rollupId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly-rollups"] });
      toast.success("Bonus marked as paid.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
